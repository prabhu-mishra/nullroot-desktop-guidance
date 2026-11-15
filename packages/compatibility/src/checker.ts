/**
 * Compatibility checker
 */

import type { Result } from '@nullroot/shared';
import type { CompatibilityResult, Ecosystem } from '@nullroot/core';
import { CompatibilityDatabase } from './database.js';

export class CompatibilityChecker {
  constructor(private db: CompatibilityDatabase) {}

  check(
    ecosystem: Ecosystem,
    component: string,
    api: string,
    version: string
  ): Result<CompatibilityResult, Error> {
    try {
      const result = this.db.checkCompatibility(ecosystem, component, api, version);
      return {
        ok: true,
        value: {
          compatible: result.compatible,
          api,
          requestedVersion: version,
          availableVersion: result.entry?.firstSupported,
          introducedVersion: result.entry?.firstSupported,
          deprecatedVersion: result.entry?.deprecatedIn,
          removedVersion: result.entry?.removedIn,
          replacement: result.entry?.replacement,
          notes: result.notes,
        },
      };
    } catch (error) {
      return { ok: false, error: error as Error };
    }
  }

  checkMultiple(
    checks: Array<{ ecosystem: Ecosystem; component: string; api: string; version: string }>
  ): Result<CompatibilityResult[], Error> {
    try {
      const results = checks.map((check) => {
        const result = this.db.checkCompatibility(
          check.ecosystem,
          check.component,
          check.api,
          check.version
        );
        return {
          compatible: result.compatible,
          api: check.api,
          requestedVersion: check.version,
          availableVersion: result.entry?.firstSupported,
          introducedVersion: result.entry?.firstSupported,
          deprecatedVersion: result.entry?.deprecatedIn,
          removedVersion: result.entry?.removedIn,
          replacement: result.entry?.replacement,
          notes: result.notes,
        };
      });
      return { ok: true, value: results };
    } catch (error) {
      return { ok: false, error: error as Error };
    }
  }
}

export function createCompatibilityChecker(db: CompatibilityDatabase): CompatibilityChecker {
  return new CompatibilityChecker(db);
}