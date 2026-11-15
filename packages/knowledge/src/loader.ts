/**
 * Knowledge loader for reading guide files from disk
 */

import { readFile } from 'fs/promises';
import { joinPaths } from '@nullroot/shared';
import type { Result } from '@nullroot/shared';
import { validateGuideEntry, type GuideEntry } from './schemas.js';
import { KnowledgeNotFoundError } from '@nullroot/core';

export interface LoaderConfig {
  knowledgeRoot: string;
  ecosystems?: string[];
}

export class KnowledgeLoader {
  constructor(private config: LoaderConfig) {}

  async loadGuide(id: string): Promise<Result<GuideEntry, KnowledgeNotFoundError>> {
    try {
      // Search for the guide file across ecosystems
      const ecosystems = this.config.ecosystems ?? [
        'quickshell',
        'hyprland',
        'qt-qml',
        'lua',
        'wayland',
        'linux-desktop',
      ];

      for (const ecosystem of ecosystems) {
        const filePath = joinPaths(this.config.knowledgeRoot, ecosystem, `${id}.md`);
        try {
          const content = await readFile(filePath, 'utf-8');
          const guide = this.parseGuide(content);
          const validation = validateGuideEntry(guide);

          if (validation.success) {
            return { ok: true, value: validation.data };
          }
        } catch {
          // File not found, try next ecosystem
        }
      }

      return { ok: false, error: new KnowledgeNotFoundError(id) };
    } catch (error) {
      return { ok: false, error: new KnowledgeNotFoundError(id) };
    }
  }

  async loadGuidesByEcosystem(ecosystem: string): Promise<GuideEntry[]> {
    // This would scan the ecosystem directory for guide files
    // Implementation depends on filesystem structure
    return [];
  }

  private parseGuide(content: string): Partial<GuideEntry> {
    // Parse frontmatter and content
    const frontmatterMatch = content.match(/^---\n([\s\S]*?)\n---/);
    const frontmatter = frontmatterMatch ? frontmatterMatch[1] : '';
    const body = frontmatterMatch ? content.slice(frontmatterMatch[0].length).trim() : content;

    const metadata: Record<string, unknown> = {};
    for (const line of frontmatter.split('\n')) {
      const [key, ...valueParts] = line.split(':');
      if (key && valueParts.length > 0) {
        metadata[key.trim()] = valueParts.join(':').trim();
      }
    }

    return {
      ...metadata,
      content: {
        explanation: body,
        patterns: [],
        examples: [],
        mistakes: [],
        compatibility: [],
        performance: [],
        debugging: [],
        references: [],
      },
    } as Partial<GuideEntry>;
  }
}

export function createLoader(config: LoaderConfig): KnowledgeLoader {
  return new KnowledgeLoader(config);
}