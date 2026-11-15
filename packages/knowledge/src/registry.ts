/**
 * Source registry for knowledge sources
 */

import { z } from 'zod';
import type { Result } from '@nullroot/shared';
import { computeChecksum } from '@nullroot/shared';
import type { SourceReference, Ecosystem } from '@nullroot/core';

export const SourceManifestSchema = z.object({
  id: z.string().uuid(),
  name: z.string().min(1),
  description: z.string(),
  ecosystem: z.enum([
    'quickskills',
    'hyprland',
    'qt-qml',
    'lua',
    'wayland',
    'linux-desktop',
  ]),
  version: z.string(),
  url: z.string().url(),
  license: z.string(),
  retrieved: z.string().datetime(),
  checksum: z.string(),
  guides: z.array(z.string().uuid()),
});

export type SourceManifest = z.infer<typeof SourceManifestSchema>;

export class SourceRegistry {
  private sources = new Map<string, SourceManifest>();

  register(manifest: SourceManifest): Result<void, Error> {
    const parseResult = SourceManifestSchema.safeParse(manifest);
    if (!parseResult.success) {
      return { ok: false, error: new Error('Invalid source manifest') };
    }

    if (this.sources.has(manifest.id)) {
      return { ok: false, error: new Error(`Source already registered: ${manifest.id}`) };
    }

    this.sources.set(manifest.id, manifest);
    return { ok: true, value: undefined };
  }

  unregister(id: string): boolean {
    return this.sources.delete(id);
  }

  get(id: string): SourceManifest | undefined {
    return this.sources.get(id);
  }

  getByEcosystem(ecosystem: Ecosystem): SourceManifest[] {
    return Array.from(this.sources.values()).filter((s) => s.ecosystem === ecosystem);
  }

  getAll(): SourceManifest[] {
    return Array.from(this.sources.values());
  }

  has(id: string): boolean {
    return this.sources.has(id);
  }

  clear(): void {
    this.sources.clear();
  }
}

export const sourceRegistry = new SourceRegistry();

export async function createSourceManifest(
  input: Omit<SourceManifest, 'id' | 'checksum' | 'retrieved'>
): Promise<SourceManifest> {
  const now = new Date().toISOString();
  const data = JSON.stringify(input);
  const checksum = await computeChecksum(data);

  return {
    ...input,
    id: crypto.randomUUID(),
    retrieved: now,
    checksum,
  };
}