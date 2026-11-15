/**
 * Knowledge loader for parsing guide files with YAML frontmatter
 */

import { readFileSync, readdirSync, statSync } from 'fs';
import { join } from 'path';
import { load as loadYaml } from 'js-yaml';
import type { Result } from '@nullroot/shared';
import { computeChecksum } from '@nullroot/shared';
import type {
  BaseMetadata,
  GuideEntry,
  GuideContent,
  Ecosystem,
  Category,
  VerificationStatus,
  SourceReference,
  ImplementationPattern,
  CodeExample,
  CommonMistake,
  CompatibilityNote,
  PerformanceConsideration,
  DebuggingGuidance,
  Reference,
} from '@nullroot/core';
import { validateGuideEntry } from './schemas.js';

/**
 * Configuration for KnowledgeLoader
 */
export interface KnowledgeLoaderConfig {
  /** Root directory containing guide files organized by ecosystem */
  guidesRoot: string;
  /** Supported file extensions */
  extensions?: string[];
  /** Whether to validate entries against schemas */
  validate?: boolean;
}

/**
 * Guide entry with file metadata for incremental indexing
 */
export interface LoadedGuide {
  /** The parsed guide entry */
  entry: GuideEntry;
  /** Absolute file path */
  filePath: string;
  /** File modification time in milliseconds (Unix epoch) */
  mtime: number;
  /** SHA-256 checksum of file content */
  checksum: string;
}

/**
 * Parsed frontmatter and content
 */
interface ParsedGuide {
  frontmatter: Record<string, unknown>;
  content: string;
  rawContent: string;
}

/**
 * Knowledge loader for parsing guide markdown files with YAML frontmatter
 */
export class KnowledgeLoader {
  private config: KnowledgeLoaderConfig;
  private guidesRoot: string;

  constructor(config: KnowledgeLoaderConfig) {
    this.config = {
      extensions: ['.md', '.markdown'],
      validate: true,
      ...config,
    };
    this.guidesRoot = config.guidesRoot;
  }

  /**
   * Parse a guide file with YAML frontmatter
   */
  parseGuide(filePath: string): Result<ParsedGuide, Error> {
    try {
      const rawContent = readFileSync(filePath, 'utf-8');

      // Check for frontmatter delimiter
      if (!rawContent.startsWith('---')) {
        return {
          ok: false,
          error: new Error(`File ${filePath} does not have YAML frontmatter`),
        };
      }

      // Find the closing delimiter
      const endDelimiterIndex = rawContent.indexOf('\n---', 3);
      if (endDelimiterIndex === -1) {
        return {
          ok: false,
          error: new Error(`File ${filePath} has unclosed frontmatter delimiter`),
        };
      }

      const frontmatterYaml = rawContent.slice(3, endDelimiterIndex).trim();
      const content = rawContent.slice(endDelimiterIndex + 4).trim();

      // Parse YAML frontmatter
      let frontmatter: Record<string, unknown>;
      try {
        const parsed = loadYaml(frontmatterYaml);
        if (typeof parsed !== 'object' || parsed === null || Array.isArray(parsed)) {
          return {
            ok: false,
            error: new Error(`Frontmatter in ${filePath} must be a YAML object`),
          };
        }
        frontmatter = parsed as Record<string, unknown>;
      } catch (yamlError) {
        return {
          ok: false,
          error: new Error(`Invalid YAML in ${filePath}: ${yamlError instanceof Error ? yamlError.message : String(yamlError)}`),
        };
      }

      return { ok: true, value: { frontmatter, content, rawContent } };
    } catch (error) {
      return {
        ok: false,
        error: error instanceof Error ? error : new Error(String(error)),
      };
    }
  }

  /**
   * Load a single guide entry from a file
   */
  async loadGuide(filePath: string): Promise<Result<GuideEntry, Error>> {
    const parseResult = this.parseGuide(filePath);
    if (!parseResult.ok) {
      return parseResult;
    }

    const { frontmatter, content, rawContent } = parseResult.value;

    // Validate required fields
    const requiredFields = ['id', 'title', 'ecosystem', 'category', 'versions', 'sources', 'status', 'lastVerified'];
    for (const field of requiredFields) {
      if (!(field in frontmatter)) {
        return {
          ok: false,
          error: new Error(`Missing required field '${field}' in ${filePath}`),
        };
      }
    }

    // Build metadata using bracket notation for index signature access
    const metadata: BaseMetadata = {
      id: frontmatter['id'] as string,
      title: frontmatter['title'] as string,
      ecosystem: frontmatter['ecosystem'] as Ecosystem,
      category: frontmatter['category'] as Category,
      versions: (frontmatter['versions'] as string[]) || [],
      sources: (frontmatter['sources'] as SourceReference[]) || [],
      status: frontmatter['status'] as VerificationStatus,
      lastVerified: frontmatter['lastVerified'] as string,
      tags: (frontmatter['tags'] as string[]) || [],
      checksum: frontmatter['checksum'] as string | undefined,
    };

    // Build content from markdown sections
    const guideContent = this.parseContent(content);

    const entry: GuideEntry = {
      ...metadata,
      content: guideContent,
    };

    // Validate if enabled
    if (this.config.validate) {
      const validation = validateGuideEntry(entry);
      if (!validation.success) {
        return {
          ok: false,
          error: new Error(`Validation failed for ${filePath}: ${validation.error.message}`),
        };
      }
    }

    // Compute checksum if not present
    if (!entry.checksum) {
      entry.checksum = await computeChecksum(rawContent);
    }

    return { ok: true, value: entry };
  }

  /**
   * Load a single guide entry with file metadata for incremental indexing
   * Returns the guide entry plus file path, mtime, and checksum
   */
  async loadGuideWithMetadata(filePath: string): Promise<Result<LoadedGuide, Error>> {
    const parseResult = this.parseGuide(filePath);
    if (!parseResult.ok) {
      return parseResult;
    }

    const { frontmatter, content, rawContent } = parseResult.value;

    // Validate required fields
    const requiredFields = ['id', 'title', 'ecosystem', 'category', 'versions', 'sources', 'status', 'lastVerified'];
    for (const field of requiredFields) {
      if (!(field in frontmatter)) {
        return {
          ok: false,
          error: new Error(`Missing required field '${field}' in ${filePath}`),
        };
      }
    }

    // Build metadata using bracket notation for index signature access
    const metadata: BaseMetadata = {
      id: frontmatter['id'] as string,
      title: frontmatter['title'] as string,
      ecosystem: frontmatter['ecosystem'] as Ecosystem,
      category: frontmatter['category'] as Category,
      versions: (frontmatter['versions'] as string[]) || [],
      sources: (frontmatter['sources'] as SourceReference[]) || [],
      status: frontmatter['status'] as VerificationStatus,
      lastVerified: frontmatter['lastVerified'] as string,
      tags: (frontmatter['tags'] as string[]) || [],
      checksum: frontmatter['checksum'] as string | undefined,
    };

    // Build content from markdown sections
    const guideContent = this.parseContent(content);

    const entry: GuideEntry = {
      ...metadata,
      content: guideContent,
    };

    // Validate if enabled
    if (this.config.validate) {
      const validation = validateGuideEntry(entry);
      if (!validation.success) {
        return {
          ok: false,
          error: new Error(`Validation failed for ${filePath}: ${validation.error.message}`),
        };
      }
    }

    // Compute checksum if not present
    if (!entry.checksum) {
      entry.checksum = await computeChecksum(rawContent);
    }

    // Get file stats for mtime
    let mtime: number;
    try {
      const stats = statSync(filePath);
      mtime = stats.mtimeMs;
    } catch {
      // If we can't stat the file, use current time
      mtime = Date.now();
    }

    // Use computed checksum or the one from frontmatter
    const finalChecksum = entry.checksum ?? (await computeChecksum(rawContent));

    return {
      ok: true,
      value: {
        entry,
        filePath,
        mtime,
        checksum: finalChecksum,
      },
    };
  }

  /**
   * Parse markdown content into structured guide content
   */
  private parseContent(content: string): GuideContent {
    const sections = this.splitSections(content);

    return {
      explanation: sections['explanation'] || '',
      patterns: this.parsePatterns(sections['patterns'] || ''),
      examples: this.parseExamples(sections['examples'] || ''),
      mistakes: this.parseMistakes(sections['mistakes'] || ''),
      compatibility: this.parseCompatibility(sections['compatibility'] || ''),
      performance: this.parsePerformance(sections['performance'] || ''),
      debugging: this.parseDebugging(sections['debugging'] || ''),
      references: this.parseReferences(sections['references'] || ''),
    };
  }

  /**
   * Split content into sections by ## headers
   */
  private splitSections(content: string): Record<string, string> {
    const sections: Record<string, string> = {};
    const lines = content.split('\n');
    let currentSection = 'explanation';
    let currentContent: string[] = [];

    for (const line of lines) {
      const headerMatch = line.match(/^##\s+(.+)$/);
      if (headerMatch && headerMatch[1]) {
        // Save previous section
        sections[currentSection] = currentContent.join('\n').trim();
        // Start new section
        currentSection = headerMatch[1].toLowerCase().replace(/\s+/g, '-');
        currentContent = [];
      } else {
        currentContent.push(line);
      }
    }
    // Save last section
    sections[currentSection] = currentContent.join('\n').trim();

    return sections;
  }

  private parsePatterns(content: string): ImplementationPattern[] {
    const patterns: ImplementationPattern[] = [];
    const blocks = content.split(/^###\s+/m).slice(1);

    for (const block of blocks) {
      const lines = block.trim().split('\n');
      if (lines.length < 2) continue;

      const firstLine = lines[0];
      if (!firstLine) continue;
      const name = firstLine.trim();
      let description = '';
      let language: ImplementationPattern['language'] = 'typescript';
      let context: string | undefined;
      let inCodeBlock = false;
      const codeLines: string[] = [];

      for (let i = 1; i < lines.length; i++) {
        const line = lines[i];
        if (!line) continue;

        if (line.startsWith('```')) {
          if (!inCodeBlock) {
            inCodeBlock = true;
            const lang = line.slice(3).trim() || 'typescript';
            if (['qml', 'hyprlang', 'lua', 'typescript', 'javascript', 'cpp', 'json', 'yaml'].includes(lang)) {
              language = lang as ImplementationPattern['language'];
            }
          } else {
            inCodeBlock = false;
          }
        } else if (inCodeBlock) {
          codeLines.push(line);
        } else if (line.startsWith('Context:')) {
          context = line.slice(8).trim();
        } else if (!description && line.trim()) {
          description = line.trim();
        }
      }

      if (name && codeLines.length > 0) {
        patterns.push({
          name,
          description: description || name,
          code: codeLines.join('\n'),
          language,
          context,
        });
      }
    }

    return patterns;
  }

  private parseExamples(content: string): CodeExample[] {
    const examples: CodeExample[] = [];
    const blocks = content.split(/^###\s+/m).slice(1);

    for (const block of blocks) {
      const lines = block.trim().split('\n');
      if (lines.length < 2) continue;

      const firstLine = lines[0];
      if (!firstLine) continue;
      const name = firstLine.trim();
      let description = '';
      let language: CodeExample['language'] = 'typescript';
      let runnable = false;
      let dependencies: string[] | undefined;
      let inCodeBlock = false;
      const codeLines: string[] = [];

      for (let i = 1; i < lines.length; i++) {
        const line = lines[i];
        if (!line) continue;

        if (line.startsWith('```')) {
          if (!inCodeBlock) {
            inCodeBlock = true;
            const lang = line.slice(3).trim() || 'typescript';
            if (['qml', 'hyprlang', 'lua', 'typescript', 'javascript', 'cpp', 'json', 'yaml', 'bash'].includes(lang)) {
              language = lang as CodeExample['language'];
            }
          } else {
            inCodeBlock = false;
          }
        } else if (inCodeBlock) {
          codeLines.push(line);
        } else if (line.startsWith('Runnable:')) {
          runnable = line.slice(9).trim().toLowerCase() === 'true';
        } else if (line.startsWith('Dependencies:')) {
          dependencies = line.slice(13).trim().split(',').map(s => s.trim()).filter(Boolean);
        } else if (!description && line.trim()) {
          description = line.trim();
        }
      }

      if (name && codeLines.length > 0) {
        examples.push({
          name,
          description: description || name,
          code: codeLines.join('\n'),
          language,
          runnable,
          dependencies,
        });
      }
    }

    return examples;
  }

  private parseMistakes(content: string): CommonMistake[] {
    const mistakes: CommonMistake[] = [];
    const blocks = content.split(/^###\s+/m).slice(1);

    for (const block of blocks) {
      const lines = block.trim().split('\n');
      if (lines.length < 3) continue;

      const firstLine = lines[0];
      if (!firstLine) continue;
      const pattern = firstLine.trim();
      let problem = '';
      let solution = '';
      let severity: CommonMistake['severity'] = 'warning';

      for (let i = 1; i < lines.length; i++) {
        const line = lines[i];
        if (!line) continue;

        if (line.startsWith('Problem:')) {
          problem = line.slice(8).trim();
        } else if (line.startsWith('Solution:')) {
          solution = line.slice(9).trim();
        } else if (line.startsWith('Severity:')) {
          const sev = line.slice(9).trim().toLowerCase();
          if (['error', 'warning', 'info'].includes(sev)) {
            severity = sev as CommonMistake['severity'];
          }
        }
      }

      if (pattern && problem && solution) {
        mistakes.push({ pattern, problem, solution, severity });
      }
    }

    return mistakes;
  }

  private parseCompatibility(content: string): CompatibilityNote[] {
    const notes: CompatibilityNote[] = [];
    const blocks = content.split(/^###\s+/m).slice(1);

    for (const block of blocks) {
      const lines = block.trim().split('\n');
      if (lines.length < 2) continue;

      const firstLine = lines[0];
      if (!firstLine) continue;
      const api = firstLine.trim();
      let introduced = '';
      let deprecated: string | undefined;
      let removed: string | undefined;
      let replacement: string | undefined;
      let notesText: string | undefined;

      for (let i = 1; i < lines.length; i++) {
        const line = lines[i];
        if (!line) continue;

        if (line.startsWith('Introduced:')) {
          introduced = line.slice(11).trim();
        } else if (line.startsWith('Deprecated:')) {
          deprecated = line.slice(11).trim();
        } else if (line.startsWith('Removed:')) {
          removed = line.slice(8).trim();
        } else if (line.startsWith('Replacement:')) {
          replacement = line.slice(12).trim();
        } else if (line.startsWith('Notes:')) {
          notesText = line.slice(6).trim();
        }
      }

      if (api && introduced) {
        notes.push({ api, introduced, deprecated, removed, replacement, notes: notesText });
      }
    }

    return notes;
  }

  private parsePerformance(content: string): PerformanceConsideration[] {
    const considerations: PerformanceConsideration[] = [];
    const blocks = content.split(/^###\s+/m).slice(1);

    for (const block of blocks) {
      const lines = block.trim().split('\n');
      if (lines.length < 2) continue;

      const firstLine = lines[0];
      if (!firstLine) continue;
      const area = firstLine.trim();
      let impact: PerformanceConsideration['impact'] = 'medium';
      let description = '';
      let mitigation: string | undefined;

      for (let i = 1; i < lines.length; i++) {
        const line = lines[i];
        if (!line) continue;

        if (line.startsWith('Impact:')) {
          const imp = line.slice(7).trim().toLowerCase();
          if (['high', 'medium', 'low'].includes(imp)) {
            impact = imp as PerformanceConsideration['impact'];
          }
        } else if (line.startsWith('Description:')) {
          description = line.slice(12).trim();
        } else if (line.startsWith('Mitigation:')) {
          mitigation = line.slice(11).trim();
        }
      }

      if (area && description) {
        considerations.push({ area, impact, description, mitigation });
      }
    }

    return considerations;
  }

  private parseDebugging(content: string): DebuggingGuidance[] {
    const guidance: DebuggingGuidance[] = [];
    const blocks = content.split(/^###\s+/m).slice(1);

    for (const block of blocks) {
      const lines = block.trim().split('\n');
      if (lines.length < 4) continue;

      const firstLine = lines[0];
      if (!firstLine) continue;
      const symptom = firstLine.trim();
      let cause = '';
      let diagnosis = '';
      let resolution = '';
      let tools: string[] | undefined;

      for (let i = 1; i < lines.length; i++) {
        const line = lines[i];
        if (!line) continue;

        if (line.startsWith('Cause:')) {
          cause = line.slice(6).trim();
        } else if (line.startsWith('Diagnosis:')) {
          diagnosis = line.slice(10).trim();
        } else if (line.startsWith('Resolution:')) {
          resolution = line.slice(11).trim();
        } else if (line.startsWith('Tools:')) {
          tools = line.slice(6).trim().split(',').map(s => s.trim()).filter(Boolean);
        }
      }

      if (symptom && cause && diagnosis && resolution) {
        guidance.push({ symptom, cause, diagnosis, resolution, tools });
      }
    }

    return guidance;
  }

  private parseReferences(content: string): Reference[] {
    const references: Reference[] = [];
    const lines = content.split('\n');

    for (const line of lines) {
      if (!line) continue;
      const match = line.match(/^-\s+\[(.+)\]\((.+)\)\s*\((official|community|tutorial|specification)\)/);
      if (match && match[1] && match[2] && match[3]) {
        references.push({
          title: match[1],
          url: match[2],
          type: match[3] as Reference['type'],
        });
      }
    }

    return references;
  }

  /**
   * Load all guides from the guides root directory
   */
  async loadAllGuides(): Promise<Result<GuideEntry[], Error>> {
    const entries: GuideEntry[] = [];
    const errors: Error[] = [];

    const ecosystems = [
      'quickshell',
      'hyprland',
      'qt-qml',
      'lua',
      'wayland',
      'linux-desktop',
    ] as Ecosystem[];

    for (const ecosystem of ecosystems) {
      const ecosystemPath = join(this.guidesRoot, ecosystem);
      const result = await this.loadGuidesFromDirectory(ecosystemPath, ecosystem);
      if (result.ok) {
        entries.push(...result.value);
      } else {
        errors.push(result.error);
      }
    }

    if (errors.length > 0) {
      return { ok: false, error: new Error(`Failed to load some guides: ${errors.map(e => e.message).join('; ')}`) };
    }

    return { ok: true, value: entries };
  }

  /**
   * Load guides from a specific directory
   */
  private async loadGuidesFromDirectory(dirPath: string, _ecosystem: Ecosystem): Promise<Result<GuideEntry[], Error>> {
    const entries: GuideEntry[] = [];

    try {
      const files = readdirSync(dirPath, { withFileTypes: true });

      for (const file of files) {
        const fullPath = join(dirPath, file.name);
        if (file.isDirectory()) {
          const subResult = await this.loadGuidesFromDirectory(fullPath, _ecosystem);
          if (subResult.ok) {
            entries.push(...subResult.value);
          }
        } else if (this.config.extensions?.some(ext => file.name.endsWith(ext))) {
          const result = await this.loadGuide(fullPath);
          if (result.ok) {
            entries.push(result.value);
          }
        }
      }
    } catch (error) {
      // Directory might not exist, return empty array
      if ((error as NodeJS.ErrnoException).code !== 'ENOENT') {
        return { ok: false, error: error instanceof Error ? error : new Error(String(error)) };
      }
    }

    return { ok: true, value: entries };
  }
}

/**
 * Create a KnowledgeLoader instance
 */
export function createKnowledgeLoader(config: KnowledgeLoaderConfig): KnowledgeLoader {
  return new KnowledgeLoader(config);
}