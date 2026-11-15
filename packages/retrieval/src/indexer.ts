/**
 * Knowledge indexer for building search indexes
 */

import Database from 'better-sqlite3';
import type { GuideEntry } from '@nullroot/core';
import { FTS5Index, createFTS5Index } from './fts5.js';
import { splitCamelCase } from './bm25.js';
import type { Result } from '@nullroot/shared';

/**
 * Existing metadata from the database for incremental indexing
 */
export interface ExistingMetadata {
  checksum: string | null;
  mtime: number | null;
}

export interface IndexerConfig {
  dbPath: string;
  batchSize?: number;
}

export class KnowledgeIndexer {
  private ftsIndex: FTS5Index | null = null;
  private db: Database.Database | null = null;
  private initialized = false;

  constructor(private config: IndexerConfig) {}

  async initialize(): Promise<Result<void, Error>> {
    try {
      this.db = new Database(this.config.dbPath);

      // Create the FTS5 virtual table for guides
      const ftsResult = createFTS5Index(this.db, {
        tableName: 'guides',
        columns: [
          'id',
          'title',
          'explanation',
          'patterns',
          'examples',
          'mistakes',
          'compatibility',
          'performance',
          'debugging',
          'tags',
          'ecosystem',
          'category',
        ],
        tokenize: 'porter unicode61',
      });

      if (!ftsResult.ok) {
        return ftsResult;
      }

      this.ftsIndex = ftsResult.value;
      this.initialized = true;

      // Create additional tables for metadata
      this.db.exec(`
        CREATE TABLE IF NOT EXISTS guide_metadata (
          id TEXT PRIMARY KEY,
          title TEXT NOT NULL,
          ecosystem TEXT NOT NULL,
          category TEXT NOT NULL,
          versions TEXT NOT NULL,
          status TEXT NOT NULL,
          last_verified TEXT NOT NULL,
          tags TEXT NOT NULL,
          checksum TEXT,
          mtime INTEGER,
          compatibility_notes TEXT
        );
      `);

      // Migration: add compatibility_notes column if it doesn't exist
      try {
        this.db.exec(`ALTER TABLE guide_metadata ADD COLUMN compatibility_notes TEXT;`);
      } catch {
        // Column already exists, ignore
      }

      // Migration: add mtime column if it doesn't exist (for existing databases)
      // Must be done before creating indexes on mtime
      try {
        this.db.exec(`ALTER TABLE guide_metadata ADD COLUMN mtime INTEGER;`);
      } catch {
        // Column already exists, ignore
      }

      // Create index for filtering
      this.db.exec(`
        CREATE INDEX IF NOT EXISTS idx_guide_ecosystem ON guide_metadata(ecosystem);
        CREATE INDEX IF NOT EXISTS idx_guide_category ON guide_metadata(category);
        CREATE INDEX IF NOT EXISTS idx_guide_status ON guide_metadata(status);
        CREATE INDEX IF NOT EXISTS idx_guide_checksum ON guide_metadata(checksum);
        CREATE INDEX IF NOT EXISTS idx_guide_mtime ON guide_metadata(mtime);
      `);

      return { ok: true, value: undefined };
    } catch (error) {
      return { ok: false, error: error instanceof Error ? error : new Error(String(error)) };
    }
  }

  private extractSearchableText(guide: GuideEntry): Record<string, string> {
    const content = guide.content;

    // Extract text from patterns
    const patternsText = content.patterns
      .map(p => `${p.name} ${p.description} ${p.code} ${p.context || ''}`)
      .join(' ');

    // Extract text from examples
    const examplesText = content.examples
      .map(e => `${e.name} ${e.description} ${e.code}`)
      .join(' ');

    // Extract text from mistakes
    const mistakesText = content.mistakes
      .map(m => `${m.pattern} ${m.problem} ${m.solution}`)
      .join(' ');

    // Extract text from compatibility
    const compatibilityText = content.compatibility
      .map(c => `${c.api} ${c.notes || ''}`)
      .join(' ');

    // Extract text from performance
    const performanceText = content.performance
      .map(p => `${p.area} ${p.description} ${p.mitigation || ''}`)
      .join(' ');

    // Extract text from debugging
    const debuggingText = content.debugging
      .map(d => `${d.symptom} ${d.cause} ${d.diagnosis} ${d.resolution}`)
      .join(' ');

    // Extract tags
    const tagsText = guide.tags.join(' ');

    // Apply camelCase splitting to searchable content fields to ensure identifiers
    // like 'WorkspaceIndicator' are searchable as 'workspace indicator'
    // Note: title, ecosystem, category are kept in original form for display/filtering
    return {
      id: guide.id,
      title: guide.title,
      explanation: splitCamelCase(content.explanation),
      patterns: splitCamelCase(patternsText),
      examples: splitCamelCase(examplesText),
      mistakes: splitCamelCase(mistakesText),
      compatibility: splitCamelCase(compatibilityText),
      performance: splitCamelCase(performanceText),
      debugging: splitCamelCase(debuggingText),
      tags: splitCamelCase(tagsText),
      ecosystem: guide.ecosystem,
      category: guide.category,
    };
  }

  private storeMetadata(guide: GuideEntry, mtime?: number): void {
    if (!this.db) return;

    this.db.prepare(`
      INSERT OR REPLACE INTO guide_metadata
      (id, title, ecosystem, category, versions, status, last_verified, tags, checksum, mtime, compatibility_notes)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      guide.id,
      guide.title,
      guide.ecosystem,
      guide.category,
      JSON.stringify(guide.versions),
      guide.status,
      guide.lastVerified,
      JSON.stringify(guide.tags),
      guide.checksum ?? null,
      mtime ?? null,
      JSON.stringify(guide.content.compatibility)
    );
  }

  async indexGuide(guide: GuideEntry): Promise<Result<void, Error>> {
    if (!this.initialized || !this.ftsIndex || !this.db) {
      return { ok: false, error: new Error('Indexer not initialized. Call initialize() first.') };
    }

    try {
      const searchableText = this.extractSearchableText(guide);
      this.ftsIndex.insert(guide.id, searchableText);
      this.storeMetadata(guide);
      return { ok: true, value: undefined };
    } catch (error) {
      return { ok: false, error: error instanceof Error ? error : new Error(String(error)) };
    }
  }

  async indexGuides(guides: GuideEntry[]): Promise<Result<number, Error>> {
    if (!this.initialized || !this.ftsIndex || !this.db) {
      return { ok: false, error: new Error('Indexer not initialized. Call initialize() first.') };
    }

    try {
      const batchSize = this.config.batchSize ?? 100;
      let indexed = 0;

      const insertStmt = this.db.prepare(`
        INSERT INTO guides (id, title, explanation, patterns, examples, mistakes, compatibility, performance, debugging, tags, ecosystem, category)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `);

      const metadataStmt = this.db.prepare(`
        INSERT OR REPLACE INTO guide_metadata
        (id, title, ecosystem, category, versions, status, last_verified, tags, checksum, mtime, compatibility_notes)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `);

      const transaction = this.db.transaction((guidesToIndex: GuideEntry[]) => {
        for (const guide of guidesToIndex) {
          const searchableText = this.extractSearchableText(guide);
          const columns = [
            'title', 'explanation', 'patterns', 'examples', 'mistakes',
            'compatibility', 'performance', 'debugging', 'tags', 'ecosystem', 'category'
          ];
          const values = [guide.id, ...columns.map(c => searchableText[c])];
          insertStmt.run(...values);
          metadataStmt.run(
            guide.id,
            guide.title,
            guide.ecosystem,
            guide.category,
            JSON.stringify(guide.versions),
            guide.status,
            guide.lastVerified,
            JSON.stringify(guide.tags),
            guide.checksum ?? null,
            null, // mtime not available in standard indexing
            JSON.stringify(guide.content.compatibility)
          );
          indexed++;
        }
      });

      // Process in batches
      for (let i = 0; i < guides.length; i += batchSize) {
        const batch = guides.slice(i, i + batchSize);
        transaction(batch);
      }

      return { ok: true, value: indexed };
    } catch (error) {
      return { ok: false, error: error instanceof Error ? error : new Error(String(error)) };
    }
  }

  async rebuildIndex(guides: GuideEntry[]): Promise<Result<number, Error>> {
    if (!this.initialized || !this.ftsIndex || !this.db) {
      return { ok: false, error: new Error('Indexer not initialized. Call initialize() first.') };
    }

    try {
      // Clear existing data
      this.ftsIndex.clear();
      this.db.prepare('DELETE FROM guide_metadata').run();

      // Re-index all guides
      return await this.indexGuides(guides);
    } catch (error) {
      return { ok: false, error: error instanceof Error ? error : new Error(String(error)) };
    }
  }

  /**
   * Get existing metadata (checksum and mtime) for all indexed guides
   * Used for incremental indexing to avoid re-indexing unchanged files
   */
  async getExistingMetadata(): Promise<Result<Map<string, ExistingMetadata>, Error>> {
    if (!this.initialized || !this.db) {
      return { ok: false, error: new Error('Indexer not initialized. Call initialize() first.') };
    }

    try {
      const rows = this.db.prepare(`
        SELECT id, checksum, mtime FROM guide_metadata
      `).all() as Array<{ id: string; checksum: string | null; mtime: number | null }>;

      const metadata = new Map<string, ExistingMetadata>();
      for (const row of rows) {
        metadata.set(row.id, { checksum: row.checksum, mtime: row.mtime });
      }

      return { ok: true, value: metadata };
    } catch (error) {
      return { ok: false, error: error instanceof Error ? error : new Error(String(error)) };
    }
  }

  /**
   * Incrementally index guides using mtime + checksum comparison
   * Only re-indexes guides that have changed since last indexing
   */
  async indexGuidesIncremental(
    guides: GuideEntry[],
    options?: { force?: boolean; guideMtimes?: Map<string, number> }
  ): Promise<Result<{ indexed: number; skipped: number; errors: number }, Error>> {
    if (!this.initialized || !this.ftsIndex || !this.db) {
      return { ok: false, error: new Error('Indexer not initialized. Call initialize() first.') };
    }

    try {
      // If force rebuild, clear and re-index all
      if (options?.force) {
        this.ftsIndex.clear();
        this.db.prepare('DELETE FROM guide_metadata').run();
        const result = await this.indexGuides(guides);
        if (!result.ok) return result;
        return { ok: true, value: { indexed: result.value, skipped: 0, errors: 0 } };
      }

      // Get existing metadata from database
      const existingMetaResult = await this.getExistingMetadata();
      if (!existingMetaResult.ok) return existingMetaResult;
      const existingMeta = existingMetaResult.value;

      const guideMtimes = options?.guideMtimes ?? new Map<string, number>();

      const insertStmt = this.db.prepare(`
        INSERT INTO guides (id, title, explanation, patterns, examples, mistakes, compatibility, performance, debugging, tags, ecosystem, category)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `);

      const metadataStmt = this.db.prepare(`
        INSERT OR REPLACE INTO guide_metadata
        (id, title, ecosystem, category, versions, status, last_verified, tags, checksum, mtime, compatibility_notes)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `);

      let indexed = 0;
      let skipped = 0;
      let errors = 0;

      const transaction = this.db.transaction((guidesToProcess: GuideEntry[]) => {
        for (const guide of guidesToProcess) {
          try {
            const existing = existingMeta.get(guide.id);
            const fileMtime = guideMtimes.get(guide.id) ?? null;
            const guideChecksum = guide.checksum ?? null;

            // Tier 1: Mtime check (fast path)
            let shouldIndex = true;
            if (existing && fileMtime !== null && existing.mtime !== null) {
              if (fileMtime <= existing.mtime) {
                // Tier 2: Checksum verification (definitive)
                if (existing.checksum && guideChecksum && existing.checksum === guideChecksum) {
                  shouldIndex = false; // Content unchanged
                }
              }
            }

            if (shouldIndex) {
              const searchableText = this.extractSearchableText(guide);
              const columns = [
                'title', 'explanation', 'patterns', 'examples', 'mistakes',
                'compatibility', 'performance', 'debugging', 'tags', 'ecosystem', 'category'
              ];
              const values = [guide.id, ...columns.map(c => searchableText[c])];
              insertStmt.run(...values);
              metadataStmt.run(
                guide.id,
                guide.title,
                guide.ecosystem,
                guide.category,
                JSON.stringify(guide.versions),
                guide.status,
                guide.lastVerified,
                JSON.stringify(guide.tags),
                guideChecksum,
                fileMtime,
                JSON.stringify(guide.content.compatibility)
              );
              indexed++;
            } else {
              skipped++;
            }
          } catch {
            errors++;
          }
        }
      });

      // Process in batches
      const batchSize = this.config.batchSize ?? 100;
      for (let i = 0; i < guides.length; i += batchSize) {
        const batch = guides.slice(i, i + batchSize);
        transaction(batch);
      }

      return { ok: true, value: { indexed, skipped, errors } };
    } catch (error) {
      return { ok: false, error: error instanceof Error ? error : new Error(String(error)) };
    }
  }

  getStats(): { totalDocuments: number; indexSize: number } {
    if (!this.db) {
      return { totalDocuments: 0, indexSize: 0 };
    }

    const countResult = this.db.prepare('SELECT COUNT(*) as count FROM guide_metadata').get() as { count: number };
    const totalDocuments = countResult.count;

    // Estimate index size (rough approximation)
    const indexSize = totalDocuments * 1024; // ~1KB per document estimate

    return { totalDocuments, indexSize };
  }

  close(): void {
    if (this.db) {
      this.db.close();
      this.db = null;
      this.ftsIndex = null;
      this.initialized = false;
    }
  }
}

export function createIndexer(config: IndexerConfig): KnowledgeIndexer {
  return new KnowledgeIndexer(config);
}