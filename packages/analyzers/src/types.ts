/**
 * Analyzer types
 */

import type { Diagnostic, ProjectInfo, Ecosystem } from '@nullroot/core';

export type { Diagnostic, ProjectInfo, Ecosystem };

export interface Analyzer {
  name: string;
  analyze(path: string): Promise<AnalyzerResult>;
  supports(ecosystem: Ecosystem): boolean;
}

export interface AnalyzerResult {
  project: ProjectInfo;
  diagnostics: Diagnostic[];
  metadata: Record<string, unknown>;
}

export interface AnalyzerConfig {
  enabled: boolean;
  options: Record<string, unknown>;
}