/**
 * Lua analyzer
 */

import type { Analyzer, AnalyzerResult, ProjectInfo, Diagnostic } from './types.js';
import type { Ecosystem } from '@nullroot/core';

export class LuaAnalyzer implements Analyzer {
  name = 'lua';

  async analyze(path: string): Promise<AnalyzerResult> {
    // TODO: Implement Lua analysis
    // - Syntax checking
    // - luacheck integration
    // - Module analysis
    return {
      project: { type: 'lua', root: path, files: [], dependencies: [], issues: [] },
      diagnostics: [],
      metadata: {},
    };
  }

  supports(ecosystem: Ecosystem): boolean {
    return ecosystem === 'lua';
  }
}

export const luaAnalyzer = new LuaAnalyzer();