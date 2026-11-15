/**
 * Tests for seed script functionality
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { CompatibilityDatabase, createCompatibilityDatabase } from '../src/database.js';
import type { CompatibilityEntry } from '../src/models.js';
import { join } from 'path';
import { tmpdir } from 'os';
import { mkdirSync, rmSync, writeFileSync, readFileSync } from 'fs';

// Test seed data (subset of actual seed-data.json)
const testSeedData: CompatibilityEntry[] = [
  {
    id: '0192f0a0-0000-0000-0000-000000000001',
    ecosystem: 'quickshell',
    component: 'Shell',
    api: 'Shell',
    firstSupported: '1.0',
    source: 'https://github.com/quickshell/quickshell',
    verifiedDate: '2026-01-15T00:00:00.000Z',
    notes: 'Main Shell API for creating desktop shells',
  },
  {
    id: '0192f0a0-0000-0000-0000-000000000002',
    ecosystem: 'quickshell',
    component: 'Shell',
    api: 'Layer',
    firstSupported: '1.0',
    source: 'https://github.com/quickshell/quickshell',
    verifiedDate: '2026-01-15T00:00:00.000Z',
    notes: 'Layer management for window layering',
  },
  {
    id: '0192f0a0-0000-0000-0000-000000000003',
    ecosystem: 'quickshell',
    component: 'WorkspaceIndicator',
    api: 'model',
    firstSupported: '1.1',
    deprecatedIn: '1.2',
    source: 'https://github.com/quickshell/quickshell',
    verifiedDate: '2026-01-15T00:00:00.000Z',
    notes: 'Deprecated in 1.2, replaced by workspaces property',
  },
  {
    id: '0192f0a0-0000-0000-0000-000000000004',
    ecosystem: 'quickshell',
    component: 'WorkspaceIndicator',
    api: 'workspaces',
    firstSupported: '1.2',
    source: 'https://github.com/quickshell/quickshell',
    verifiedDate: '2026-01-15T00:00:00.000Z',
    notes: 'Replacement for deprecated model API',
  },
  {
    id: '0192f0a0-0000-0000-0000-000000000016',
    ecosystem: 'hyprland',
    component: 'Config',
    api: 'windowrulev2',
    firstSupported: '0.35',
    source: 'https://wiki.hyprland.org/Configuring/Window-Rules/',
    verifiedDate: '2026-01-15T00:00:00.000Z',
    notes: 'Modern window rules syntax (v2)',
  },
  {
    id: '0192f0a0-0000-0000-0000-000000000017',
    ecosystem: 'hyprland',
    component: 'Config',
    api: 'windowrule',
    firstSupported: '0.10',
    deprecatedIn: '0.35',
    removedIn: '0.40',
    replacement: 'windowrulev2',
    source: 'https://wiki.hyprland.org/Configuring/Window-Rules/',
    verifiedDate: '2026-01-15T00:00:00.000Z',
    notes: 'Legacy window rules, removed in 0.40',
  },
  {
    id: '0192f0a0-0000-0000-0000-000000000028',
    ecosystem: 'qt-qml',
    component: 'QtQuick',
    api: 'Item',
    firstSupported: '5.0',
    source: 'https://doc.qt.io/qt-6/qml-qtquick-item.html',
    verifiedDate: '2026-01-15T00:00:00.000Z',
    notes: 'Base visual item type',
  },
];

describe('Seed Script Functionality', () => {
  let testDir: string;
  let dbPath: string;
  let seedPath: string;
  let db: CompatibilityDatabase;

  beforeEach(() => {
    testDir = join(tmpdir(), `nullroot-seed-test-${Date.now()}-${Math.random().toString(36).slice(2)}`);
    mkdirSync(testDir, { recursive: true });
    dbPath = join(testDir, 'test.db');
    seedPath = join(testDir, 'test-seed.json');
    writeFileSync(seedPath, JSON.stringify(testSeedData, null, 2));
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

  describe('seed data loading', () => {
    it('should load seed data from JSON file', () => {
      const loadedData = JSON.parse(readFileSync(seedPath, 'utf-8')) as CompatibilityEntry[];
      expect(loadedData.length).toBe(testSeedData.length);
      expect(loadedData[0].id).toBe(testSeedData[0].id);
    });

    it('should validate seed data structure', () => {
      const loadedData = JSON.parse(readFileSync(seedPath, 'utf-8')) as CompatibilityEntry[];
      for (const entry of loadedData) {
        expect(entry.id).toBeDefined();
        expect(entry.ecosystem).toBeDefined();
        expect(entry.component).toBeDefined();
        expect(entry.api).toBeDefined();
        expect(entry.firstSupported).toBeDefined();
        expect(entry.source).toBeDefined();
        expect(entry.verifiedDate).toBeDefined();
      }
    });
  });

  describe('database seeding', () => {
    it('should insert all seed entries successfully', () => {
      let inserted = 0;
      let failed = 0;
      const errors: string[] = [];

      for (const entry of testSeedData) {
        const result = db.insert(entry);
        if (result.ok) {
          inserted++;
        } else {
          failed++;
          errors.push(`${entry.id}: ${result.error.message}`);
        }
      }

      expect(failed).toBe(0);
      expect(inserted).toBe(testSeedData.length);
    });

    it('should verify all entries are in database after seeding', () => {
      for (const entry of testSeedData) {
        db.insert(entry);
      }

      const allEntries = db.query({});
      expect(allEntries.length).toBe(testSeedData.length);
    });

    it('should preserve all fields including optional ones', () => {
      const entryWithOptionals = testSeedData.find(e => e.deprecatedIn && e.removedIn);
      expect(entryWithOptionals).toBeDefined();
      if (entryWithOptionals) {
        db.insert(entryWithOptionals);
        const entries = db.query({ ecosystem: entryWithOptionals.ecosystem, api: entryWithOptionals.api });
        expect(entries.length).toBe(1);
        expect(entries[0].deprecatedIn).toBe(entryWithOptionals.deprecatedIn);
        expect(entries[0].removedIn).toBe(entryWithOptionals.removedIn);
        expect(entries[0].replacement).toBe(entryWithOptionals.replacement);
      }
    });
  });

  describe('repeatable seeding (no duplicates on re-seed)', () => {
    it('should not create duplicates when seeding same data twice', () => {
      // First seed
      for (const entry of testSeedData) {
        db.insert(entry);
      }
      const countAfterFirst = db.query({}).length;
      expect(countAfterFirst).toBe(testSeedData.length);

      // Second seed (same data)
      for (const entry of testSeedData) {
        db.insert(entry);
      }
      const countAfterSecond = db.query({}).length;
      expect(countAfterSecond).toBe(testSeedData.length);
    });

    it('should replace existing entries with same ID (INSERT OR REPLACE)', () => {
      // Insert initial entry
      const entry = testSeedData[0];
      db.insert(entry);

      // Modify and re-insert with same ID
      const modifiedEntry = { ...entry, notes: 'Updated notes' };
      db.insert(modifiedEntry);

      const entries = db.query({ ecosystem: 'quickshell', api: 'Shell' });
      expect(entries.length).toBe(1);
      expect(entries[0].notes).toBe('Updated notes');
    });
  });

  describe('duplicate identifiers handling', () => {
    it('should handle duplicate IDs in seed data by replacing', () => {
      // Create seed data with duplicate ID
      const duplicateSeedData = [
        testSeedData[0],
        { ...testSeedData[0], notes: 'Duplicate with different notes' }, // Same ID
      ];

      for (const entry of duplicateSeedData) {
        db.insert(entry);
      }

      // Should only have one entry (the last one wins due to INSERT OR REPLACE)
      const entries = db.query({ ecosystem: 'quickshell', api: 'Shell' });
      expect(entries.length).toBe(1);
      expect(entries[0].notes).toBe('Duplicate with different notes');
    });
  });

  describe('ecosystem filtering', () => {
    beforeEach(() => {
      for (const entry of testSeedData) {
        db.insert(entry);
      }
    });

    it('should filter by quickshell ecosystem', () => {
      const entries = db.query({ ecosystem: 'quickshell' });
      expect(entries.length).toBe(4); // Shell, Layer, model, workspaces
      expect(entries.every(e => e.ecosystem === 'quickshell')).toBe(true);
    });

    it('should filter by hyprland ecosystem', () => {
      const entries = db.query({ ecosystem: 'hyprland' });
      expect(entries.length).toBe(2);
      expect(entries.every(e => e.ecosystem === 'hyprland')).toBe(true);
    });

    it('should filter by qt-qml ecosystem', () => {
      const entries = db.query({ ecosystem: 'qt-qml' });
      expect(entries.length).toBe(1);
      expect(entries[0].ecosystem).toBe('qt-qml');
    });

    it('should return empty for non-existent ecosystem', () => {
      const entries = db.query({ ecosystem: 'lua' });
      expect(entries.length).toBe(0);
    });
  });

  describe('ecosystem coverage', () => {
    it('should cover all 6 ecosystems in full seed data', () => {
      // This test validates the actual seed-data.json has 6 ecosystems
      const fullSeedPath = join(__dirname, '..', 'seed-data.json');
      const fullSeedData = JSON.parse(readFileSync(fullSeedPath, 'utf-8')) as CompatibilityEntry[];
      const ecosystems = new Set(fullSeedData.map(e => e.ecosystem));
      expect(ecosystems.size).toBe(6);
      expect(ecosystems.has('quickshell')).toBe(true);
      expect(ecosystems.has('hyprland')).toBe(true);
      expect(ecosystems.has('qt-qml')).toBe(true);
      expect(ecosystems.has('lua')).toBe(true);
      expect(ecosystems.has('wayland')).toBe(true);
      expect(ecosystems.has('linux-desktop')).toBe(true);
    });

    it('should have 58 entries in full seed data', () => {
      const fullSeedPath = join(__dirname, '..', 'seed-data.json');
      const fullSeedData = JSON.parse(readFileSync(fullSeedPath, 'utf-8')) as CompatibilityEntry[];
      expect(fullSeedData.length).toBe(58);
    });
  });

  describe('version compatibility queries after seeding', () => {
    beforeEach(() => {
      for (const entry of testSeedData) {
        db.insert(entry);
      }
    });

    it('should query compatible entries for quickshell 1.0', () => {
      const result = db.queryCompatible('quickshell', '1.0');
      expect(result.ok).toBe(true);
      if (result.ok) {
        const entries = result.value;
        expect(entries.length).toBe(2); // Shell and Layer
        expect(entries.map(e => e.api).sort()).toEqual(['Layer', 'Shell']);
      }
    });

    it('should query compatible entries for quickshell 1.1', () => {
      const result = db.queryCompatible('quickshell', '1.1');
      expect(result.ok).toBe(true);
      if (result.ok) {
        const entries = result.value;
        expect(entries.length).toBe(3); // Shell, Layer, model
        const apis = entries.map(e => e.api).sort();
        expect(apis).toEqual(['Layer', 'Shell', 'model']);
      }
    });

    it('should query compatible entries for quickshell 1.2', () => {
      const result = db.queryCompatible('quickshell', '1.2');
      expect(result.ok).toBe(true);
      if (result.ok) {
        const entries = result.value;
        expect(entries.length).toBe(4); // Shell, Layer, model, workspaces
        const apis = entries.map(e => e.api).sort();
        expect(apis).toEqual(['Layer', 'Shell', 'model', 'workspaces']);
      }
    });

    it('should query compatible entries for hyprland 0.35', () => {
      const result = db.queryCompatible('hyprland', '0.35');
      expect(result.ok).toBe(true);
      if (result.ok) {
        const entries = result.value;
        // windowrule: 0.10 <= 0.35 < 0.40 -> included (deprecated)
        // windowrulev2: 0.35 <= 0.35 -> included
        expect(entries.length).toBe(2);
        const apis = entries.map(e => e.api).sort();
        expect(apis).toEqual(['windowrule', 'windowrulev2']);
      }
    });

    it('should query compatible entries for hyprland 0.40', () => {
      const result = db.queryCompatible('hyprland', '0.40');
      expect(result.ok).toBe(true);
      if (result.ok) {
        const entries = result.value;
        // windowrule: removed in 0.40 -> excluded
        // windowrulev2: 0.35 <= 0.40 -> included
        expect(entries.length).toBe(1);
        expect(entries[0].api).toBe('windowrulev2');
      }
    });
  });

  describe('checkCompatibility after seeding', () => {
    beforeEach(() => {
      for (const entry of testSeedData) {
        db.insert(entry);
      }
    });

    it('should check compatibility for quickshell Shell at 1.0', () => {
      const result = db.checkCompatibility('quickshell', 'Shell', 'Shell', '1.0');
      expect(result.compatible).toBe(true);
      expect(result.notes).toBe('API available and supported');
    });

    it('should check compatibility for quickshell model at 1.1 (before deprecation)', () => {
      const result = db.checkCompatibility('quickshell', 'WorkspaceIndicator', 'model', '1.1');
      expect(result.compatible).toBe(true);
      expect(result.notes).toBe('API available and supported');
    });

    it('should check compatibility for quickshell model at 1.2 (deprecated)', () => {
      const result = db.checkCompatibility('quickshell', 'WorkspaceIndicator', 'model', '1.2');
      expect(result.compatible).toBe(true);
      expect(result.notes).toContain('deprecated in 1.2');
    });

    it('should check compatibility for hyprland windowrule at 0.35 (deprecated)', () => {
      const result = db.checkCompatibility('hyprland', 'Config', 'windowrule', '0.35');
      expect(result.compatible).toBe(true);
      expect(result.notes).toContain('deprecated in 0.35');
    });

    it('should check compatibility for hyprland windowrule at 0.40 (removed)', () => {
      const result = db.checkCompatibility('hyprland', 'Config', 'windowrule', '0.40');
      expect(result.compatible).toBe(false);
      expect(result.notes).toContain('removed in 0.40');
      expect(result.notes).toContain('windowrulev2');
    });
  });
});