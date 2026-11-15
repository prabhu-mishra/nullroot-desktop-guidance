/**
 * Knowledge metadata schemas using Zod
 */

import { z } from 'zod';

export const SourceReferenceSchema = z.object({
  url: z.string().url(),
  title: z.string().min(1),
  ecosystem: z.enum([
    'quickshell',
    'hyprland',
    'qt-qml',
    'lua',
    'wayland',
    'linux-desktop',
  ]),
  versionApplicability: z.string().optional(),
  retrieved: z.string().datetime(),
  license: z.string().optional(),
  verificationState: z.enum(['official', 'community', 'derived']),
});

export type SourceReference = z.infer<typeof SourceReferenceSchema>;

export const BaseMetadataSchema = z.object({
  id: z.string().uuid(),
  title: z.string().min(1).max(200),
  ecosystem: z.enum([
    'quickshell',
    'hyprland',
    'qt-qml',
    'lua',
    'wayland',
    'linux-desktop',
  ]),
  category: z.string().min(1),
  versions: z.array(z.string()).min(1),
  sources: z.array(SourceReferenceSchema).min(1),
  status: z.enum(['verified', 'reviewed', 'community', 'unverified', 'deprecated']),
  lastVerified: z.string().datetime(),
  tags: z.array(z.string()).default([]),
  checksum: z.string().optional(),
});

export type BaseMetadata = z.infer<typeof BaseMetadataSchema>;

export const ImplementationPatternSchema = z.object({
  name: z.string().min(1),
  description: z.string().min(1),
  code: z.string().min(1),
  language: z.enum(['qml', 'hyprlang', 'lua', 'typescript', 'javascript', 'cpp', 'json', 'yaml']),
  context: z.string().optional(),
});

export type ImplementationPattern = z.infer<typeof ImplementationPatternSchema>;

export const CodeExampleSchema = z.object({
  name: z.string().min(1),
  description: z.string().min(1),
  code: z.string().min(1),
  language: z.enum(['qml', 'hyprlang', 'lua', 'typescript', 'javascript', 'cpp', 'json', 'yaml', 'bash']),
  runnable: z.boolean().default(false),
  dependencies: z.array(z.string()).optional(),
});

export type CodeExample = z.infer<typeof CodeExampleSchema>;

export const CommonMistakeSchema = z.object({
  pattern: z.string().min(1),
  problem: z.string().min(1),
  solution: z.string().min(1),
  severity: z.enum(['error', 'warning', 'info']),
});

export type CommonMistake = z.infer<typeof CommonMistakeSchema>;

export const CompatibilityNoteSchema = z.object({
  api: z.string().min(1),
  introduced: z.string().min(1),
  deprecated: z.string().optional(),
  removed: z.string().optional(),
  replacement: z.string().optional(),
  notes: z.string().optional(),
});

export type CompatibilityNote = z.infer<typeof CompatibilityNoteSchema>;

export const PerformanceConsiderationSchema = z.object({
  area: z.string().min(1),
  impact: z.enum(['high', 'medium', 'low']),
  description: z.string().min(1),
  mitigation: z.string().optional(),
});

export type PerformanceConsideration = z.infer<typeof PerformanceConsiderationSchema>;

export const DebuggingGuidanceSchema = z.object({
  symptom: z.string().min(1),
  cause: z.string().min(1),
  diagnosis: z.string().min(1),
  resolution: z.string().min(1),
  tools: z.array(z.string()).optional(),
});

export type DebuggingGuidance = z.infer<typeof DebuggingGuidanceSchema>;

export const ReferenceSchema = z.object({
  title: z.string().min(1),
  url: z.string().url(),
  type: z.enum(['official', 'community', 'tutorial', 'specification']),
});

export type Reference = z.infer<typeof ReferenceSchema>;

export const GuideContentSchema = z.object({
  explanation: z.string().min(1),
  patterns: z.array(ImplementationPatternSchema).default([]),
  examples: z.array(CodeExampleSchema).default([]),
  mistakes: z.array(CommonMistakeSchema).default([]),
  compatibility: z.array(CompatibilityNoteSchema).default([]),
  performance: z.array(PerformanceConsiderationSchema).default([]),
  debugging: z.array(DebuggingGuidanceSchema).default([]),
  references: z.array(ReferenceSchema).default([]),
});

export type GuideContent = z.infer<typeof GuideContentSchema>;

export const GuideEntrySchema = BaseMetadataSchema.extend({
  content: GuideContentSchema,
});

export type GuideEntry = z.infer<typeof GuideEntrySchema>;

export const SearchOptionsSchema = z.object({
  query: z.string().min(1),
  ecosystems: z.array(z.enum(['quickshell', 'hyprland', 'qt-qml', 'lua', 'wayland', 'linux-desktop'])).optional(),
  categories: z.array(z.string()).optional(),
  versions: z.array(z.string()).optional(),
  status: z.array(z.enum(['verified', 'reviewed', 'community', 'unverified', 'deprecated'])).optional(),
  limit: z.number().int().positive().max(100).default(10),
  offset: z.number().int().nonnegative().default(0),
});

export type SearchOptions = z.infer<typeof SearchOptionsSchema>;

export const SearchResultSchema = z.object({
  id: z.string().uuid(),
  title: z.string(),
  ecosystem: z.enum(['quickshell', 'hyprland', 'qt-qml', 'lua', 'wayland', 'linux-desktop']),
  category: z.string(),
  snippet: z.string(),
  score: z.number(),
  metadata: z.object({
    versions: z.array(z.string()),
    status: z.enum(['verified', 'reviewed', 'community', 'unverified', 'deprecated']),
    lastVerified: z.string().datetime(),
    tags: z.array(z.string()),
  }),
});

export type SearchResult = z.infer<typeof SearchResultSchema>;

// Validation functions
export function validateGuideEntry(data: unknown) {
  return GuideEntrySchema.safeParse(data);
}

export function validateSearchOptions(data: unknown) {
  return SearchOptionsSchema.safeParse(data);
}

export function validateSourceReference(data: unknown) {
  return SourceReferenceSchema.safeParse(data);
}