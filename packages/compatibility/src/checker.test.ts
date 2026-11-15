/**
 * Tests for CompatibilityChecker
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { CompatibilityChecker, createCompatibilityChecker } from './checker.js';
import { CompatibilityDatabase, createCompatibilityDatabase } from './database.js';
import type { CompatibilityEntry } from './models.js';
import { join } from 'path';
import { tmpdir } from 'os';
import { mkdirSync, rmSync } from 'fs';

// Helper to create a test entry
const createTestEntry = (overrides: Partial<CompatibilityEntry> = {}): CompatibilityEntry => ({
  id: '123e4567-e89b-12d3-a456-426614174000',
  ecosystem: 'quickshell',
  component: 'Shell',
  api: 'Shell',
  firstSupported: '1.0',
  source: 'https://github.com/quickshell/quickshell',
  verifiedDate: '2026-01-15T00:00:00.000Z',
  ...overrides,
});

describe('CompatibilityChecker', () => {
  let testDir: string;
  let dbPath: string;
  let db: CompatibilityDatabase;
  let checker: CompatibilityChecker;

  beforeEach(() => {
    testDir = join(tmpdir(), `nullroot-checker-test-${Date.now()}-${Math.random().toString(36).slice(2)}`);
    mkdirSync(testDir, { recursive: true });
    dbPath = join(testDir, 'test.db');
    db = createCompatibilityDatabase(dbPath);
    checker = createCompatibilityChecker(db);

    // Insert test data
    const entries: CompatibilityEntry[] = [
      // Quickshell: API introduced at 1.0
      createTestEntry({ id: '11111111-1111-1111-1111-111111111111', ecosystem: 'quickshell', component: 'Shell', api: 'Shell', firstSupported: '1.0' }),
      // Quickshell: API introduced at 1.1, deprecated at 1.2
      createTestEntry({ id: '22222222-2222-2222-2222-222222222222', ecosystem: 'quickshell', component: 'WorkspaceIndicator', api: 'model', firstSupported: '1.1', deprecatedIn: '1.2' }),
      // Quickshell: API introduced at 1.2 (replacement)
      createTestEntry({ id: '33333333-3333-3333-3333-333333333333', ecosystem: 'quickshell', component: 'WorkspaceIndicator', api: 'workspaces', firstSupported: '1.2' }),
      // Hyprland: API introduced at 0.10, deprecated at 0.35, removed at 0.40
      createTestEntry({ id: '44444444-4444-4444-4444-444444444444', ecosystem: 'hyprland', component: 'Config', api: 'windowrule', firstSupported: '0.10', deprecatedIn: '0.35', removedIn: '0.40', replacement: 'windowrulev2' }),
      // Hyprland: API introduced at 0.35
      createTestEntry({ id: '55555555-5555-5555-5555-555555555555', ecosystem: 'hyprland', component: 'Config', api: 'windowrulev2', firstSupported: '0.35' }),
      // Hyprland: API introduced at 0.40
      createTestEntry({ id: '66666666-6666-6666-6666-666666666666', ecosystem: 'hyprland', component: 'Config', api: 'plugin', firstSupported: '0.40' }),
    ];
    for (const entry of entries) {
      db.insert(entry);
    }
  });

  afterEach(() => {
    db.close();
    try {
      rmSync(testDir, { recursive: true, force: true });
    } catch {
      // Ignore cleanup errors
    }
  });

  describe('check', () => {
    describe('basic compatibility checks', () => {
      it('should return ok=true with compatible=true for available API', () => {
        const result = checker.check('quickshell', 'Shell', 'Shell', '1.0');
        expect(result.ok).toBe(true);
        if (result.ok) {
          expect(result.value.compatible).toBe(true);
          expect(result.value.api).toBe('Shell');
          expect(result.value.requestedVersion).toBe('1.0');
          expect(result.value.introducedVersion).toBe('1.0');
          expect(result.value.notes).toBe('API available and supported');
        }
      });

      it('should return ok=true with compatible=false for unavailable API', () => {
        const result = checker.check('quickshell', 'Shell', 'Shell', '0.9');
        expect(result.ok).toBe(true);
        if (result.ok) {
          expect(result.value.compatible).toBe(false);
          expect(result.value.notes).toContain('introduced in 1.0');
        }
      });

      it('should return ok=false when database throws error', () => {
        // Close the database to force an error
        db.close();
        const result = checker.check('quickshell', 'Shell', 'Shell', '1.0');
        expect(result.ok).toBe(false);
        if (!result.ok) {
          expect(result.error).toBeInstanceOf(Error);
        }
      });
    });

    describe('version boundary checks', () => {
      it('should correctly report introduced version boundary', () => {
        // API introduced at 1.0, target 0.9 -> not compatible
        const result = checker.check('quickshell', 'Shell', 'Shell', '0.9');
        expect(result.ok).toBe(true);
        if (result.ok) {
          expect(result.value.compatible).toBe(false);
          expect(result.value.introducedVersion).toBe('1.0');
        }
      });

      it('should correctly report compatible at exact introduced version', () => {
        // API introduced at 1.0, target 1.0 -> compatible
        const result = checker.check('quickshell', 'Shell', 'Shell', '1.0');
        expect(result.ok).toBe(true);
        if (result.ok) {
          expect(result.value.compatible).toBe(true);
          expect(result.value.introducedVersion).toBe('1.0');
        }
      });

      it('should correctly report deprecation warning at deprecatedIn', () => {
        // API deprecated at 1.2, target 1.2 -> compatible with deprecation warning
        const result = checker.check('quickshell', 'WorkspaceIndicator', 'model', '1.2');
        expect(result.ok).toBe(true);
        if (result.ok) {
          expect(result.value.compatible).toBe(true);
          expect(result.value.deprecatedVersion).toBe('1.2');
          expect(result.value.notes).toContain('deprecated in 1.2');
        }
      });

      it('should correctly report no deprecation warning before deprecatedIn', () => {
        // API deprecated at 1.2, target 1.1 -> no warning
        const result = checker.check('quickshell', 'WorkspaceIndicator', 'model', '1.1');
        expect(result.ok).toBe(true);
        if (result.ok) {
          expect(result.value.compatible).toBe(true);
          expect(result.value.deprecatedVersion).toBe('1.2');
          expect(result.value.notes).toBe('API available and supported');
        }
      });

      it('should correctly report removal at removedIn', () => {
        // API removed at 0.40, target 0.40 -> not compatible
        const result = checker.check('hyprland', 'Config', 'windowrule', '0.40');
        expect(result.ok).toBe(true);
        if (result.ok) {
          expect(result.value.compatible).toBe(false);
          expect(result.value.removedVersion).toBe('0.40');
          expect(result.value.notes).toContain('removed in 0.40');
          expect(result.value.replacement).toBe('windowrulev2');
        }
      });

      it('should correctly report deprecated but not removed before removedIn', () => {
        // API deprecated at 0.35, removed at 0.40, target 0.35 -> compatible with deprecation
        const result = checker.check('hyprland', 'Config', 'windowrule', '0.35');
        expect(result.ok).toBe(true);
        if (result.ok) {
          expect(result.value.compatible).toBe(true);
          expect(result.value.deprecatedVersion).toBe('0.35');
          expect(result.value.removedVersion).toBe('0.40');
          expect(result.value.notes).toContain('deprecated in 0.35');
        }
      });
    });

    describe('result structure', () => {
      it('should include all required fields in result', () => {
        const result = checker.check('quickshell', 'Shell', 'Shell', '1.0');
        expect(result.ok).toBe(true);
        if (result.ok) {
          const value = result.value;
          expect(value).toHaveProperty('compatible');
          expect(value).toHaveProperty('api');
          expect(value).toHaveProperty('requestedVersion');
          expect(value).toHaveProperty('availableVersion');
          expect(value).toHaveProperty('introducedVersion');
          expect(value).toHaveProperty('deprecatedVersion');
          expect(value).toHaveProperty('removedVersion');
          expect(value).toHaveProperty('replacement');
          expect(value).toHaveProperty('notes');
        }
      });

      it('should set availableVersion to firstSupported', () => {
        const result = checker.check('quickshell', 'Shell', 'Shell', '1.0');
        expect(result.ok).toBe(true);
        if (result.ok) {
          expect(result.value.availableVersion).toBe('1.0');
          expect(result.value.introducedVersion).toBe('1.0');
        }
      });

      it('should set deprecatedVersion when present', () => {
        const result = checker.check('hyprland', 'Config', 'windowrule', '0.35');
        expect(result.ok).toBe(true);
        if (result.ok) {
          expect(result.value.deprecatedVersion).toBe('0.35');
        }
      });

      it('should set removedVersion when present', () => {
        const result = checker.check('hyprland', 'Config', 'windowrule', '0.35');
        expect(result.ok).toBe(true);
        if (result.ok) {
          expect(result.value.removedVersion).toBe('0.40');
        }
      });

      it('should set replacement when present', () => {
        const result = checker.check('hyprland', 'Config', 'windowrule', '0.40');
        expect(result.ok).toBe(true);
        if (result.ok) {
          expect(result.value.replacement).toBe('windowrulev2');
        }
      });

      it('should set null for missing optional fields (SQLite returns null)', () => {
        const result = checker.check('quickshell', 'Shell', 'Shell', '1.0');
        expect(result.ok).toBe(true);
        if (result.ok) {
          expect(result.value.deprecatedVersion).toBeNull();
          expect(result.value.removedVersion).toBeNull();
          expect(result.value.replacement).toBeNull();
        }
      });
    });

    describe('different ecosystem handling', () => {
      it('should return compatible=false for different ecosystem', () => {
        const result = checker.check('quickshell', 'Config', 'windowrule', '0.35');
        expect(result.ok).toBe(true);
        if (result.ok) {
          expect(result.value.compatible).toBe(false);
        }
      });
    });

    describe('invalid version handling', () => {
      it('should handle empty version gracefully', () => {
        const result = checker.check('quickshell', 'Shell', 'Shell', '');
        expect(result.ok).toBe(true);
        // Behavior depends on satisfiesVersion - just ensure no crash
        expect(typeof result.value.compatible).toBe('boolean');
      });

      it('should handle non-numeric version gracefully', () => {
        const result = checker.check('quickshell', 'Shell', 'Shell', 'invalid');
        expect(result.ok).toBe(true);
        expect(typeof result.value.compatible).toBe('boolean');
      });
    });
  });

  describe('checkMultiple', () => {
    it('should check multiple APIs in one call', () => {
      const checks = [
        { ecosystem: 'quickshell' as const, component: 'Shell', api: 'Shell', version: '1.0' },
        { ecosystem: 'quickshell' as const, component: 'WorkspaceIndicator', api: 'model', version: '1.2' },
        { ecosystem: 'hyprland' as const, component: 'Config', api: 'windowrule', version: '0.35' },
      ];
      const result = checker.checkMultiple(checks);
      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.value.length).toBe(3);
        expect(result.value[0].compatible).toBe(true);
        expect(result.value[1].compatible).toBe(true); // deprecated but compatible
        expect(result.value[2].compatible).toBe(true); // deprecated but compatible
      }
    });

    it('should return empty array for empty input', () => {
      const result = checker.checkMultiple([]);
      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.value).toEqual([]);
      }
    });

    it('should handle mixed compatible/incompatible results', () => {
      const checks = [
        { ecosystem: 'quickshell' as const, component: 'Shell', api: 'Shell', version: '1.0' }, // compatible
        { ecosystem: 'quickshell' as const, component: 'Shell', api: 'Shell', version: '0.9' }, // not compatible
        { ecosystem: 'hyprland' as const, component: 'Config', api: 'windowrule', version: '0.40' }, // removed
      ];
      const result = checker.checkMultiple(checks);
      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.value.length).toBe(3);
        expect(result.value[0].compatible).toBe(true);
        expect(result.value[1].compatible).toBe(false);
        expect(result.value[2].compatible).toBe(false);
      }
    });

    it('should handle database errors gracefully', () => {
      db.close();
      const checks = [
        { ecosystem: 'quickshell' as const, component: 'Shell', api: 'Shell', version: '1.0' },
      ];
      const result = checker.checkMultiple(checks);
      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.error).toBeInstanceOf(Error);
      }
    });
  });
});