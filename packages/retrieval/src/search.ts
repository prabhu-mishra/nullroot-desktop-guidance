/**
 * Search engine for knowledge retrieval
 */

import Database from 'better-sqlite3';
import { connectFTS5Index } from './fts5.js';
import { computeBM25, tokenize, splitCamelCase, DEFAULT_BM25_CONFIG } from './bm25.js';
import type { SearchOptions, SearchResult, Ecosystem, Category, VerificationStatus, CompatibilityNote } from '@nullroot/core';
import type { Result } from '@nullroot/shared';
import { createCompatibilityDatabase } from '@nullroot/compatibility';
import { createCompatibilityChecker } from '@nullroot/compatibility';
import type { CompatibilityResult } from '@nullroot/core';

export interface SearchEngineConfig {
  dbPath: string;
  defaultLimit?: number;
  maxLimit?: number;
  bm25Config?: typeof DEFAULT_BM25_CONFIG;
  compatDbPath?: string; // Optional path to compatibility database for version-aware enrichment
}

interface GuideMetadata {
  id: string;
  title: string;
  ecosystem: string;
  category: string;
  versions: string;
  status: string;
  last_verified: string;
  tags: string;
  checksum: string | null;
  mtime: number | null;
  compatibility_notes: string | null;
}

interface SearchRow {
  id: string;
  rank: number;
  title: string;
  explanation: string;
  patterns: string;
  examples: string;
  mistakes: string;
  compatibility: string;
  performance: string;
  debugging: string;
  tags: string;
  ecosystem: string;
  category: string;
}

/**
 * Version-aware guide result with compatibility warnings
 */
export interface VersionAwareGuide extends SearchResult {
  metadata: SearchResult['metadata'] & {
    versionWarnings?: Array<{
      api: string;
      status: 'deprecated' | 'removed' | 'introduced';
      message: string;
      replacement?: string;
    }>;
    targetVersion?: string;
  };
}

export class SearchEngine {
  private db: Database.Database;
  private ftsIndex: ReturnType<typeof connectFTS5Index>;
  private compatChecker: ReturnType<typeof createCompatibilityChecker> | null = null;
  private initialized = false;

  constructor(private config: SearchEngineConfig) {
    this.db = new Database(config.dbPath, { readonly: true });
    this.ftsIndex = connectFTS5Index(this.db, 'guides');

    // Initialize compatibility checker if compatDbPath provided
    if (config.compatDbPath) {
      const compatDb = createCompatibilityDatabase(config.compatDbPath);
      this.compatChecker = createCompatibilityChecker(compatDb);
    }

    this.initialized = true;
  }

  private getMetadata(rowId: string): GuideMetadata | null {
    const row = this.db.prepare('SELECT * FROM guide_metadata WHERE id = ?').get(rowId) as GuideMetadata | undefined;
    return row ?? null;
  }

  private buildSnippet(guide: SearchRow, _queryTerms: string[]): string {
    // Build a snippet from the explanation and other content
    const contentParts = [
      guide.explanation,
      guide.patterns,
      guide.examples,
      guide.mistakes,
      guide.compatibility,
      guide.performance,
      guide.debugging,
    ].filter(Boolean);

    const fullText = contentParts.join(' ').substring(0, 500);

    // Highlight query terms (simple approach - just return first 200 chars)
    const snippet = fullText.length > 200 ? fullText.substring(0, 200) + '...' : fullText;
    return snippet;
  }

  private computeScore(row: SearchRow, queryTerms: string[]): number {
    // Combine FTS5 rank with BM25 for better ranking
    // FTS5 rank is lower (more negative) = better, BM25 is higher = better
    // We'll use a hybrid approach

    // Use BM25 on the combined text
    const combinedText = [
      row.title,
      row.explanation,
      row.patterns,
      row.examples,
      row.mistakes,
      row.compatibility,
      row.performance,
      row.debugging,
      row.tags,
    ].join(' ');

    const docLength = combinedText.length;
    const avgDocLength = 1000; // Estimated average
    const docCount = 1000; // Estimated total docs

    let totalScore = 0;
    for (const term of queryTerms) {
      const termFreq = (combinedText.toLowerCase().match(new RegExp(term, 'g')) || []).length;
      if (termFreq > 0) {
        // Estimate docFreq as 10% of docs
        const docFreq = Math.max(1, docCount * 0.1);
        totalScore += computeBM25(termFreq, docLength, avgDocLength, docCount, docFreq, this.config.bm25Config);
      }
    }

    // Also factor in FTS5 rank (lower/more negative is better, so invert using absolute value)
    // FTS5 rank can be negative (more negative = better match), so we use Math.abs to normalize
    // 1 / (1 + |rank|) gives a score in (0, 1] where 1 is the best match (rank = 0)
    const ftsScore = 1 / (1 + Math.abs(row.rank));

    // Ensure final score is non-negative
    const finalScore = totalScore * 0.7 + ftsScore * 0.3;
    return Math.max(0, finalScore);
  }

  async search(options: SearchOptions): Promise<Result<SearchResult[], Error>> {
    if (!this.initialized) {
      return { ok: false, error: new Error('Search engine not initialized') };
    }

    try {
      const limit = Math.min(
        options.limit ?? this.config.defaultLimit ?? 10,
        this.config.maxLimit ?? 100
      );
      const offset = options.offset ?? 0;

      // Build the FTS5 query
      const query = options.query.trim();
      if (!query) {
        return { ok: true, value: [] };
      }

      // Apply camelCase splitting to query for FTS5 matching (since we pre-split during indexing)
      // This ensures "workspaceIndicator" matches content indexed as "workspace indicator"
      const ftsQuery = splitCamelCase(query);

      // Tokenize query for BM25
      const queryTerms = tokenize(query);

      // Build WHERE clause for filtering
      const whereConditions: string[] = [];
      const filterParams: unknown[] = [];

      if (options.ecosystems && options.ecosystems.length > 0) {
        const placeholders = options.ecosystems.map(() => '?').join(',');
        whereConditions.push(`ecosystem IN (${placeholders})`);
        filterParams.push(...options.ecosystems);
      }

      if (options.categories && options.categories.length > 0) {
        const placeholders = options.categories.map(() => '?').join(',');
        whereConditions.push(`category IN (${placeholders})`);
        filterParams.push(...options.categories);
      }

      if (options.status && options.status.length > 0) {
        // Join with metadata to filter by status
        // We'll do a post-filter for status since it's in metadata table
      }

      const whereClause = whereConditions.length > 0
        ? ` AND ${whereConditions.join(' AND ')}`
        : '';

      // Execute FTS5 search
      // Parameters order: MATCH query, filter params, LIMIT, OFFSET
      // Use ftsQuery which has camelCase split for better matching
      const params: unknown[] = [ftsQuery, ...filterParams, limit, offset];

      const searchSql = `
        SELECT id, rank, title, explanation, patterns, examples, mistakes,
               compatibility, performance, debugging, tags, ecosystem, category
        FROM guides
        WHERE guides MATCH ? ${whereClause}
        ORDER BY rank
        LIMIT ? OFFSET ?
      `;

      const rows = this.db.prepare(searchSql).all(...params) as SearchRow[];

      // Get metadata for each result and build SearchResult objects
      const results: SearchResult[] = [];

      for (const row of rows) {
        const metadata = this.getMetadata(row.id);
        if (!metadata) continue;

        // Apply status filter if specified
        if (options.status && options.status.length > 0) {
          if (!options.status.includes(metadata.status as VerificationStatus)) {
            continue;
          }
        }

        // Apply versions filter if specified
        if (options.versions && options.versions.length > 0) {
          const guideVersions = JSON.parse(metadata.versions);
          const hasMatchingVersion = options.versions.some(v => guideVersions.includes(v));
          if (!hasMatchingVersion) {
            continue;
          }
        }

        const score = this.computeScore(row, queryTerms);
        const snippet = this.buildSnippet(row, queryTerms);

        results.push({
          id: row.id,
          title: row.title,
          ecosystem: row.ecosystem as Ecosystem,
          category: row.category as Category,
          snippet,
          score,
          metadata: {
            versions: JSON.parse(metadata.versions),
            status: metadata.status as VerificationStatus,
            lastVerified: metadata.last_verified,
            tags: JSON.parse(metadata.tags),
          },
        });
      }

      // Sort by score (highest first)
      results.sort((a, b) => b.score - a.score);

      // Apply limit after sorting
      const limitedResults = results.slice(0, limit);

      return { ok: true, value: limitedResults };
    } catch (error) {
      return { ok: false, error: error instanceof Error ? error : new Error(String(error)) };
    }
  }

  async searchByEcosystem(
    query: string,
    ecosystem: Ecosystem,
    limit: number
  ): Promise<Result<SearchResult[], Error>> {
    return this.search({ query, ecosystems: [ecosystem], limit });
  }

  async getSuggestions(prefix: string, limit = 5): Promise<Result<string[], Error>> {
    if (!this.initialized) {
      return { ok: false, error: new Error('Search engine not initialized') };
    }

    try {
      // Simple prefix search on titles
      const rows = this.db.prepare(`
        SELECT title FROM guide_metadata
        WHERE title LIKE ?
        ORDER BY title
        LIMIT ?
      `).all(`${prefix}%`, limit) as Array<{ title: string }>;

      return { ok: true, value: rows.map(r => r.title) };
    } catch (error) {
      return { ok: false, error: error instanceof Error ? error : new Error(String(error)) };
    }
  }

  async getById(id: string, targetVersion?: string): Promise<Result<VersionAwareGuide | null, Error>> {
    if (!this.initialized) {
      return { ok: false, error: new Error('Search engine not initialized') };
    }

    try {
      // Get metadata first (includes compatibility_notes)
      const metadata = this.getMetadata(id);
      if (!metadata) {
        return { ok: true, value: null };
      }

      // Get FTS5 content
      const row = this.db.prepare(`
        SELECT id, title, explanation, patterns, examples, mistakes,
               compatibility, performance, debugging, tags, ecosystem, category
        FROM guides
        WHERE id = ?
      `).get(id) as SearchRow | undefined;

      if (!row) {
        return { ok: true, value: null };
      }

      // Build result (without scoring since it's a direct lookup)
      const snippet = this.buildSnippet(row, []);

      const baseResult: SearchResult = {
        id: row.id,
        title: row.title,
        ecosystem: row.ecosystem as Ecosystem,
        category: row.category as Category,
        snippet,
        score: 1.0, // Perfect match
        metadata: {
          versions: JSON.parse(metadata.versions),
          status: metadata.status as VerificationStatus,
          lastVerified: metadata.last_verified,
          tags: JSON.parse(metadata.tags),
        },
      };

      // If no target version, return base result without targetVersion
      if (!targetVersion) {
        return { ok: true, value: baseResult as VersionAwareGuide };
      }

      // If no compatibility checker, return base result with targetVersion but no warnings
      if (!this.compatChecker) {
        return {
          ok: true,
          value: {
            ...baseResult,
            metadata: {
              ...baseResult.metadata,
              targetVersion,
              versionWarnings: undefined,
            },
          } as VersionAwareGuide,
        };
      }

      // Use compatibility_notes from metadata (stored as JSON) instead of FTS5 compatibility text
      const compatibilityJson = metadata.compatibility_notes ?? row.compatibility;

      // Enrich with version-aware warnings
      const enrichedResult = await this.enrichWithVersionInfo(baseResult, targetVersion, compatibilityJson, row.ecosystem, row.category);
      return { ok: true, value: enrichedResult };
    } catch (error) {
      return { ok: false, error: error instanceof Error ? error : new Error(String(error)) };
    }
  }

  /**
   * Enrich a guide with version-specific compatibility warnings
   */
  private async enrichWithVersionInfo(
    guide: SearchResult,
    targetVersion: string,
    compatibilityJson: string,
    ecosystem: string,
    category: string
  ): Promise<VersionAwareGuide> {
    const versionWarnings: Array<{
      api: string;
      status: 'deprecated' | 'removed' | 'introduced';
      message: string;
      replacement?: string;
    }> = [];

    // Try to parse compatibility data as JSON (CompatibilityNote[])
    let compatNotes: CompatibilityNote[] = [];
    try {
      compatNotes = JSON.parse(compatibilityJson) as CompatibilityNote[];
    } catch {
      // If parsing fails (e.g., it's searchable text instead of JSON), return base result with targetVersion
      return {
        ...guide,
        metadata: {
          ...guide.metadata,
          targetVersion,
          versionWarnings: undefined,
        },
      };
    }

    // Check each API against the compatibility database
    if (this.compatChecker && compatNotes.length > 0) {
      for (const note of compatNotes) {
        const result = this.compatChecker.check(
          ecosystem as Ecosystem,
          category, // Use guide's category as component
          note.api,
          targetVersion
        );

        if (result.ok) {
          const compatResult = result.value as CompatibilityResult;
          const warning = this.createVersionWarning(compatResult, note);
          if (warning) {
            versionWarnings.push(warning);
          }
        }
        // If check fails, skip this API (don't add warning)
      }
    }

    return {
      ...guide,
      metadata: {
        ...guide.metadata,
        targetVersion,
        versionWarnings: versionWarnings.length > 0 ? versionWarnings : undefined,
      },
    };
  }

  /**
   * Create a version warning from a CompatibilityResult and CompatibilityNote
   */
  private createVersionWarning(
    compatResult: CompatibilityResult,
    note: CompatibilityNote
  ): { api: string; status: 'deprecated' | 'removed' | 'introduced'; message: string; replacement?: string } | null {
    const { api, compatible, introducedVersion, deprecatedVersion, removedVersion, replacement, notes } = compatResult;
    const guideReplacement = note.replacement;
    const effectiveReplacement = replacement ?? guideReplacement;

    // Not compatible - check why
    if (!compatible) {
      // Check if removed (target version >= removedIn)
      if (removedVersion) {
        return {
          api,
          status: 'removed',
          message: `API '${api}' was removed in version ${removedVersion} and is not available in ${compatResult.requestedVersion}` +
            (effectiveReplacement ? `. Use '${effectiveReplacement}' instead.` : ''),
          replacement: effectiveReplacement,
        };
      }

      // Check if not yet introduced (target version < firstSupported)
      if (introducedVersion) {
        return {
          api,
          status: 'introduced',
          message: `API '${api}' was introduced in version ${introducedVersion} and is not available in ${compatResult.requestedVersion}`,
        };
      }

      // Generic not compatible
      return {
        api,
        status: 'introduced',
        message: `API '${api}' is not compatible with version ${compatResult.requestedVersion}` +
          (notes ? `: ${notes}` : ''),
      };
    }

    // Compatible but deprecated at target version (check notes to confirm)
    // The compatChecker returns "API deprecated in X" in notes when target version >= deprecatedIn
    if (deprecatedVersion && notes && notes.includes('deprecated')) {
      return {
        api,
        status: 'deprecated',
        message: `API '${api}' has been deprecated since version ${deprecatedVersion}` +
          (effectiveReplacement ? `. Consider migrating to '${effectiveReplacement}'.` : '.'),
        replacement: effectiveReplacement,
      };
    }

    // Compatible and not deprecated at target version - no warning needed
    return null;
  }

  close(): void {
    if (this.db) {
      this.db.close();
      this.initialized = false;
    }
  }
}

export function createSearchEngine(config: SearchEngineConfig): SearchEngine {
  return new SearchEngine(config);
}