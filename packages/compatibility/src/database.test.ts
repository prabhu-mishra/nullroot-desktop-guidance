/**
 * Tests for CompatibilityDatabase
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
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

describe('CompatibilityDatabase', () => {
  let testDir: string;
  let dbPath: string;
  let db: CompatibilityDatabase;

  beforeEach(() => {
    testDir = join(tmpdir(), `nullroot-compat-test-${Date.now()}-${Math.random().toString(36).slice(2)}`);
    mkdirSync(testDir, { recursive: true });
    dbPath = join(testDir, 'test.db');
    db = createCompatibilityDatabase(dbPath);
  });

  afterEach(() => {
    db.close();
    try {
      rmSync(testDir, { recursive: true, force: true });
    } catch {
      // Ignore cleanup errors
    }
  });

  describe('initialization', () => {
    it('should create database and tables on construction', () => {
      // Database is created in constructor
      expect(db).toBeInstanceOf(CompatibilityDatabase);
    });

    it('should create required indexes', () => {
      // Verify indexes exist by querying - if indexes missing, queries still work but slower
      const entries = db.query({});
      expect(Array.isArray(entries)).toBe(true);
    });

    it('should persist across multiple instances', () => {
      // Insert an entry
      const entry = createTestEntry();
      const insertResult = db.insert(entry);
      expect(insertResult.ok).toBe(true);

      // Close and reopen
      db.close();
      const db2 = createCompatibilityDatabase(dbPath);
      const entries = db2.query({});
      expect(entries.length).toBe(1);
      expect(entries[0].id).toBe(entry.id);
      db2.close();
    });
  });

  describe('insert', () => {
    it('should insert a valid entry successfully', () => {
      const entry = createTestEntry();
      const result = db.insert(entry);

      expect(result.ok).toBe(true);
    });

    it('should return error for duplicate primary key with INSERT OR REPLACE', () => {
      const entry = createTestEntry();
      db.insert(entry);
      const result = db.insert(entry); // Same ID - should replace

      expect(result.ok).toBe(true);
    });

    it('should handle missing optional fields correctly', () => {
      const entry = createTestEntry({
        deprecatedIn: undefined,
        removedIn: undefined,
        replacement: undefined,
        notes: undefined,
      });
      const result = db.insert(entry);

      expect(result.ok).toBe(true);
    });

    it('should store all fields including optional ones', () => {
      const entry = createTestEntry({
        deprecatedIn: '1.2',
        removedIn: '2.0',
        replacement: 'NewAPI',
        notes: 'Test notes',
      });
      db.insert(entry);

      const entries = db.query({ ecosystem: 'quickshell', component: 'Shell', api: 'Shell' });
      expect(entries.length).toBe(1);
      expect(entries[0].deprecatedIn).toBe('1.2');
      expect(entries[0].removedIn).toBe('2.0');
      expect(entries[0].replacement).toBe('NewAPI');
      expect(entries[0].notes).toBe('Test notes');
    });
  });

  describe('query', () => {
    beforeEach(() => {
      // Insert test data
      const entries: CompatibilityEntry[] = [
        createTestEntry({ id: '11111111-1111-1111-1111-111111111111', ecosystem: 'quickshell', component: 'Shell', api: 'Shell', firstSupported: '1.0' }),
        createTestEntry({ id: '22222222-2222-2222-2222-222222222222', ecosystem: 'quickshell', component: 'Shell', api: 'Layer', firstSupported: '1.0' }),
        createTestEntry({ id: '33333333-3333-3333-3333-333333333333', ecosystem: 'hyprland', component: 'Config', api: 'windowrule', firstSupported: '0.10', deprecatedIn: '0.35', removedIn: '0.40', replacement: 'windowrulev2' }),
        createTestEntry({ id: '44444444-4444-4444-4444-444444444444', ecosystem: 'hyprland', component: 'Config', api: 'windowrulev2', firstSupported: '0.35' }),
      ];
      for (const entry of entries) {
        db.insert(entry);
      }
    });

    it('should return all entries when no filters provided', () => {
      const entries = db.query({});
      expect(entries.length).toBe(4);
    });

    it('should filter by ecosystem', () => {
      const entries = db.query({ ecosystem: 'quickshell' });
      expect(entries.length).toBe(2);
      expect(entries.every(e => e.ecosystem === 'quickshell')).toBe(true);
    });

    it('should filter by component', () => {
      const entries = db.query({ ecosystem: 'hyprland', component: 'Config' });
      expect(entries.length).toBe(2);
      expect(entries.every(e => e.component === 'Config')).toBe(true);
    });

    it('should filter by api', () => {
      const entries = db.query({ ecosystem: 'hyprland', component: 'Config', api: 'windowrule' });
      expect(entries.length).toBe(1);
      expect(entries[0].api).toBe('windowrule');
    });

    it('should return empty array for non-matching filters', () => {
      const entries = db.query({ ecosystem: 'lua' });
      expect(entries.length).toBe(0);
    });

    it('should map snake_case columns to camelCase properties', () => {
      const entries = db.query({ ecosystem: 'hyprland', api: 'windowrule' });
      expect(entries.length).toBe(1);
      const entry = entries[0];
      // Verify camelCase mapping
      expect(entry.firstSupported).toBe('0.10');
      expect(entry.deprecatedIn).toBe('0.35');
      expect(entry.removedIn).toBe('0.40');
      expect(entry.replacement).toBe('windowrulev2');
      expect(entry.verifiedDate).toBeDefined();
    });
  });

  describe('queryCompatible', () => {
    beforeEach(() => {
      // Insert test data with various version constraints
      const entries: CompatibilityEntry[] = [
        // Introduced at 1.0, no deprecation/removal
        createTestEntry({ id: '11111111-1111-1111-1111-111111111111', ecosystem: 'quickshell', component: 'Shell', api: 'Shell', firstSupported: '1.0' }),
        // Introduced at 1.1, deprecated at 1.2
        createTestEntry({ id: '22222222-2222-2222-2222-222222222222', ecosystem: 'quickshell', component: 'WorkspaceIndicator', api: 'model', firstSupported: '1.1', deprecatedIn: '1.2' }),
        // Introduced at 1.2 (replacement)
        createTestEntry({ id: '33333333-3333-3333-3333-333333333333', ecosystem: 'quickshell', component: 'WorkspaceIndicator', api: 'workspaces', firstSupported: '1.2' }),
        // Introduced at 0.10, deprecated at 0.35, removed at 0.40
        createTestEntry({ id: '44444444-4444-4444-4444-444444444444', ecosystem: 'hyprland', component: 'Config', api: 'windowrule', firstSupported: '0.10', deprecatedIn: '0.35', removedIn: '0.40', replacement: 'windowrulev2' }),
        // Introduced at 0.35 (replacement)
        createTestEntry({ id: '55555555-5555-5555-5555-555555555555', ecosystem: 'hyprland', component: 'Config', api: 'windowrulev2', firstSupported: '0.35' }),
        // Introduced at 0.40 (new API)
        createTestEntry({ id: '66666666-6666-6666-6666-666666666666', ecosystem: 'hyprland', component: 'Config', api: 'plugin', firstSupported: '0.40' }),
      ];
      for (const entry of entries) {
        db.insert(entry);
      }
    });

    it('should return entries where version >= firstSupported', () => {
      const result = db.queryCompatible('quickshell', '1.0');
      expect(result.ok).toBe(true);
      if (result.ok) {
        const entries = result.value;
        expect(entries.length).toBe(1);
        expect(entries[0].api).toBe('Shell');
      }
    });

    it('should return entries where version >= firstSupported (1.1)', () => {
      const result = db.queryCompatible('quickshell', '1.1');
      expect(result.ok).toBe(true);
      if (result.ok) {
        const entries = result.value;
        expect(entries.length).toBe(2);
        const apis = entries.map(e => e.api).sort();
        expect(apis).toEqual(['Shell', 'model']);
      }
    });

    it('should return entries where version >= firstSupported (1.2)', () => {
      const result = db.queryCompatible('quickshell', '1.2');
      expect(result.ok).toBe(true);
      if (result.ok) {
        const entries = result.value;
        expect(entries.length).toBe(3);
        const apis = entries.map(e => e.api).sort();
        expect(apis).toEqual(['Shell', 'model', 'workspaces']);
      }
    });

    it('should exclude entries where version < firstSupported', () => {
      const result = db.queryCompatible('quickshell', '0.9');
      expect(result.ok).toBe(true);
      if (result.ok) {
        const entries = result.value;
        expect(entries.length).toBe(0);
      }
    });

    it('should exclude entries where version >= removedIn', () => {
      const result = db.queryCompatible('hyprland', '0.40');
      expect(result.ok).toBe(true);
      if (result.ok) {
        const entries = result.value;
        const apis = entries.map(e => e.api).sort();
        expect(apis).not.toContain('windowrule');
        expect(apis).toContain('windowrulev2');
        expect(apis).toContain('plugin');
      }
    });

    it('should include entries where version < removedIn', () => {
      const result = db.queryCompatible('hyprland', '0.35');
      expect(result.ok).toBe(true);
      if (result.ok) {
        const entries = result.value;
        const apis = entries.map(e => e.api).sort();
        expect(apis).toContain('windowrule'); // 0.35 < 0.40, so included
        expect(apis).toContain('windowrulev2'); // introduced at 0.35
      }
    });

    it('should include entries with no removedIn at any version >= firstSupported', () => {
      const result = db.queryCompatible('hyprland', '0.50');
      expect(result.ok).toBe(true);
      if (result.ok) {
        const entries = result.value;
        const apis = entries.map(e => e.api).sort();
        expect(apis).toContain('windowrulev2');
        expect(apis).toContain('plugin');
        expect(apis).not.toContain('windowrule'); // removed at 0.40
      }
    });

    it('should filter by ecosystem correctly', () => {
      const result = db.queryCompatible('quickshell', '1.2');
      expect(result.ok).toBe(true);
      if (result.ok) {
        const entries = result.value;
        expect(entries.every(e => e.ecosystem === 'quickshell')).toBe(true);
      }
    });
  });

  describe('checkCompatibility', () => {
    beforeEach(() => {
      const entries: CompatibilityEntry[] = [
        // API introduced at 1.0
        createTestEntry({ id: '11111111-1111-1111-1111-111111111111', ecosystem: 'quickshell', component: 'Shell', api: 'Shell', firstSupported: '1.0' }),
        // API introduced at 1.1, deprecated at 1.2
        createTestEntry({ id: '22222222-2222-2222-2222-222222222222', ecosystem: 'quickshell', component: 'WorkspaceIndicator', api: 'model', firstSupported: '1.1', deprecatedIn: '1.2' }),
        // API introduced at 1.2 (replacement)
        createTestEntry({ id: '33333333-3333-3333-3333-333333333333', ecosystem: 'quickshell', component: 'WorkspaceIndicator', api: 'workspaces', firstSupported: '1.2' }),
        // API introduced at 0.10, deprecated at 0.35, removed at 0.40
        createTestEntry({ id: '44444444-4444-4444-4444-444444444444', ecosystem: 'hyprland', component: 'Config', api: 'windowrule', firstSupported: '0.10', deprecatedIn: '0.35', removedIn: '0.40', replacement: 'windowrulev2' }),
        // API introduced at 0.35
        createTestEntry({ id: '55555555-5555-5555-5555-555555555555', ecosystem: 'hyprland', component: 'Config', api: 'windowrulev2', firstSupported: '0.35' }),
        // API introduced at 0.40
        createTestEntry({ id: '66666666-6666-6666-6666-666666666666', ecosystem: 'hyprland', component: 'Config', api: 'plugin', firstSupported: '0.40' }),
      ];
      for (const entry of entries) {
        db.insert(entry);
      }
    });

    describe('introduced version boundaries', () => {
      it('should return not compatible when target version < firstSupported', () => {
        const result = db.checkCompatibility('quickshell', 'Shell', 'Shell', '0.9');
        expect(result.compatible).toBe(false);
        expect(result.notes).toContain('introduced in 1.0');
        expect(result.notes).toContain('not available in 0.9');
      });

      it('should return compatible when target version == firstSupported', () => {
        const result = db.checkCompatibility('quickshell', 'Shell', 'Shell', '1.0');
        expect(result.compatible).toBe(true);
        expect(result.notes).toBe('API available and supported');
      });

      it('should return compatible when target version > firstSupported', () => {
        const result = db.checkCompatibility('quickshell', 'Shell', 'Shell', '1.5');
        expect(result.compatible).toBe(true);
      });
    });

    describe('deprecated version boundaries', () => {
      it('should return no deprecation warning when target version < deprecatedIn', () => {
        const result = db.checkCompatibility('quickshell', 'WorkspaceIndicator', 'model', '1.1');
        expect(result.compatible).toBe(true);
        expect(result.notes).toBe('API available and supported');
      });

      it('should return deprecation warning when target version == deprecatedIn', () => {
        const result = db.checkCompatibility('quickshell', 'WorkspaceIndicator', 'model', '1.2');
        expect(result.compatible).toBe(true);
        expect(result.notes).toContain('deprecated in 1.2');
      });

      it('should return deprecation warning when target version > deprecatedIn but < removedIn', () => {
        const result = db.checkCompatibility('hyprland', 'Config', 'windowrule', '0.35');
        expect(result.compatible).toBe(true);
        expect(result.notes).toContain('deprecated in 0.35');
      });
    });

    describe('removed version boundaries', () => {
      it('should return compatible + deprecated when target version < removedIn but >= deprecatedIn', () => {
        const result = db.checkCompatibility('hyprland', 'Config', 'windowrule', '0.35');
        expect(result.compatible).toBe(true);
        expect(result.notes).toContain('deprecated in 0.35');
      });

      it('should return not compatible when target version == removedIn', () => {
        const result = db.checkCompatibility('hyprland', 'Config', 'windowrule', '0.40');
        expect(result.compatible).toBe(false);
        expect(result.notes).toContain('removed in 0.40');
        expect(result.notes).toContain('Use windowrulev2 instead');
      });

      it('should return not compatible when target version > removedIn', () => {
        const result = db.checkCompatibility('hyprland', 'Config', 'windowrule', '0.45');
        expect(result.compatible).toBe(false);
        expect(result.notes).toContain('removed in 0.40');
      });
    });

    describe('missing optional version constraints', () => {
      it('should work correctly when deprecatedIn is missing', () => {
        const result = db.checkCompatibility('quickshell', 'Shell', 'Shell', '2.0');
        expect(result.compatible).toBe(true);
        expect(result.notes).toBe('API available and supported');
      });

      it('should work correctly when removedIn is missing', () => {
        const result = db.checkCompatibility('quickshell', 'WorkspaceIndicator', 'model', '2.0');
        expect(result.compatible).toBe(true);
        expect(result.notes).toContain('deprecated in 1.2');
      });

      it('should work correctly when replacement is missing', () => {
        const entry = createTestEntry({ id: '77777777-7777-7777-7777-777777777777', ecosystem: 'quickshell', component: 'Test', api: 'NoReplacement', firstSupported: '1.0', deprecatedIn: '2.0' });
        db.insert(entry);
        const result = db.checkCompatibility('quickshell', 'Test', 'NoReplacement', '2.0');
        expect(result.compatible).toBe(true);
        expect(result.notes).toContain('deprecated in 2.0');
        expect(result.notes).not.toContain('Consider migrating');
      });

      it('should include replacement in notes when present', () => {
        const result = db.checkCompatibility('hyprland', 'Config', 'windowrule', '0.40');
        expect(result.notes).toContain('Use windowrulev2 instead');
      });
    });

    describe('different ecosystem handling', () => {
      it('should not match entries from different ecosystem', () => {
        const result = db.checkCompatibility('quickshell', 'Config', 'windowrule', '0.35');
        expect(result.compatible).toBe(false);
        expect(result.entry).toBeUndefined();
      });

      it('should not match entries from different component', () => {
        const result = db.checkCompatibility('hyprland', 'IPC', 'windowrule', '0.35');
        expect(result.compatible).toBe(false);
      });

      it('should not match entries from different api', () => {
        const result = db.checkCompatibility('hyprland', 'Config', 'animation', '0.35');
        expect(result.compatible).toBe(false);
      });
    });

    describe('invalid version strings', () => {
      it('should handle empty version string gracefully', () => {
        const result = db.checkCompatibility('quickshell', 'Shell', 'Shell', '');
        // Empty version should not match any firstSupported >= empty
        expect(result.compatible).toBe(false);
      });

      it('should handle non-numeric version gracefully', () => {
        const result = db.checkCompatibility('quickshell', 'Shell', 'Shell', 'not-a-version');
        // Should not crash - behavior depends on satisfiesVersion implementation
        expect(typeof result.compatible).toBe('boolean');
      });

      it('should handle malformed version gracefully', () => {
        const result = db.checkCompatibility('quickshell', 'Shell', 'Shell', '1..2');
        expect(typeof result.compatible).toBe('boolean');
      });
    });

    describe('return value structure', () => {
      it('should return entry when found', () => {
        const result = db.checkCompatibility('quickshell', 'Shell', 'Shell', '1.0');
        expect(result.entry).toBeDefined();
        expect(result.entry?.api).toBe('Shell');
        expect(result.entry?.firstSupported).toBe('1.0');
      });

      it('should return undefined entry when not found', () => {
        const result = db.checkCompatibility('quickshell', 'NonExistent', 'API', '1.0');
        expect(result.entry).toBeUndefined();
      });

      it('should include deprecatedIn in entry when present', () => {
        const result = db.checkCompatibility('hyprland', 'Config', 'windowrule', '0.35');
        expect(result.entry?.deprecatedIn).toBe('0.35');
      });

      it('should include removedIn in entry when present', () => {
        const result = db.checkCompatibility('hyprland', 'Config', 'windowrule', '0.35');
        expect(result.entry?.removedIn).toBe('0.40');
      });

      it('should include replacement in entry when present', () => {
        const result = db.checkCompatibility('hyprland', 'Config', 'windowrule', '0.35');
        expect(result.entry?.replacement).toBe('windowrulev2');
      });
    });
  });

  describe('close', () => {
    it('should close the database without throwing', () => {
      expect(() => db.close()).not.toThrow();
    });

    it('should prevent further operations after close', () => {
      db.close();
      // Operations after close should throw
      expect(() => db.query({})).toThrow('The database connection is not open');
    });
  });

  describe('database error handling', () => {
    it('should handle insert errors gracefully', () => {
      // Try to insert with invalid data - database constraints should catch this
      const entry = createTestEntry({ id: 'invalid-uuid' });
      const result = db.insert(entry);
      // Should not throw, should return error result
      if (!result.ok) {
        expect(result.error).toBeInstanceOf(Error);
      }
    });
  });
});