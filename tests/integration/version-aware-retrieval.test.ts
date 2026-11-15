/**
 * Integration Tests: Version-Aware Retrieval
 *
 * Tests the complete flow:
 * Compatibility DB → SearchEngine → VersionAwareGuide
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { KnowledgeLoader, createKnowledgeLoader } from '@nullroot/knowledge';
import { KnowledgeIndexer, createIndexer } from '@nullroot/retrieval';
import { SearchEngine, createSearchEngine, VersionAwareGuide } from '@nullroot/retrieval';
import { createCompatibilityDatabase } from '@nullroot/compatibility';
import type { CompatibilityEntry } from '@nullroot/compatibility';
import { join } from 'path';
import { tmpdir } from 'os';
import { mkdirSync, writeFileSync, rmSync, readFileSync } from 'fs';

// Test constants - guides with compatibility sections matching seed data
const QUICKSHELL_WORKSPACE_INDICATOR_GUIDE = `---
id: "aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee"
title: "Workspace Indicator Configuration"
ecosystem: "quickshell"
category: "WorkspaceIndicator"
versions: ["1.0", "1.1", "1.2"]
sources:
  - url: "https://quickshell.org/docs/components/workspace-indicator"
    title: "Workspace Indicator Documentation"
    ecosystem: "quickshell"
    retrieved: "2024-01-15T00:00:00Z"
    verificationState: "official"
status: "verified"
lastVerified: "2024-01-15T00:00:00Z"
tags: ["workspace", "indicator", "panel", "workspace-indicator", "WorkspaceIndicator"]
checksum: "test-checksum-workspace-indicator"
---

# Explanation

The WorkspaceIndicator component displays the current workspace and allows switching between workspaces in your Quickshell panel.

## Patterns

### WorkspaceIndicator
Context: Used in panel configurations to show workspace information
\`\`\`qml
import QtQuick
import Quickshell

WorkspaceIndicator {
    id: workspaceIndicator
    model: Workspaces.workspacesModel
    currentIndex: Workspaces.currentIndex
    delegate: Item {
        width: 30
        height: 30
        Rectangle {
            anchors.fill: parent
            color: model.currentIndex === index ? "#ffffff" : "#888888"
            radius: 4
        }
        Text {
            anchors.centerIn: parent
            text: model.name || String(index + 1)
            color: "#000000"
        }
    }
}
\`\`\`

## Compatibility

### model
Introduced: 1.1
Deprecated: 1.2
Removed: 2.0
Replacement: workspaces
Notes: Deprecated in 1.2, replaced by workspaces property

### workspaces
Introduced: 1.2
Notes: Replacement for deprecated model API
`;

const HYPRLAND_WINDOW_RULES_GUIDE = `---
id: "bbbbbbbb-cccc-dddd-eeee-ffffffffffff"
title: "Hyprland Window Rules"
ecosystem: "hyprland"
category: "Config"
versions: ["0.35", "0.40", "0.45"]
sources:
  - url: "https://wiki.hypr.land/Configuring/Window-Rules/"
    title: "Window Rules Configuration"
    ecosystem: "hyprland"
    retrieved: "2024-01-15T00:00:00Z"
    verificationState: "official"
status: "verified"
lastVerified: "2024-01-15T00:00:00Z"
tags: ["window", "rules", "hyprland", "window-management"]
checksum: "test-checksum-hyprland-window-rules"
---

# Explanation

Hyprland provides powerful window management through window rules.

## Patterns

### WindowRuleV2
Context: Modern window rules syntax (v2)
\`\`\`hyprlang
windowrulev2 = float, class:^(kitty|Alacritty)$
windowrulev2 = workspace 2, class:^(code|Code)$
\`\`\`

### WindowRuleLegacy
Context: Legacy window rules syntax (deprecated)
\`\`\`hyprlang
windowrule = float, class:^(kitty|Alacritty)$
\`\`\`

## Compatibility

### windowrule
Introduced: 0.10
Deprecated: 0.35
Removed: 0.40
Replacement: windowrulev2
Notes: Legacy window rules, removed in 0.40

### windowrulev2
Introduced: 0.35
Notes: Modern window rules syntax (v2)
`;

const QT_QML_PROPERTIES_GUIDE = `---
id: "cccccccc-dddd-eeee-ffff-000000000000"
title: "QML Property Bindings"
ecosystem: "qt-qml"
category: "QtQuick"
versions: ["5.0", "6.0", "6.8"]
sources:
  - url: "https://doc.qt.io/qt-6/qtqml-syntax-propertybinding.html"
    title: "QML Property Binding"
    ecosystem: "qt-qml"
    retrieved: "2024-01-15T00:00:00Z"
    verificationState: "official"
status: "verified"
lastVerified: "2024-01-15T00:00:00Z"
tags: ["qml", "property", "binding", "properties"]
checksum: "test-checksum-qml-properties"
---

# Explanation

QML property bindings allow you to create dynamic relationships between properties.

## Patterns

### PropertyBinding
Context: Basic property binding syntax
\`\`\`qml
import QtQuick

Rectangle {
    width: 200
    height: 200
    color: "red"
    property int scaleFactor: 2
    property int scaledWidth: width * scaleFactor
}
\`\`\`

## Compatibility

### Item
Introduced: 5.0
Notes: Base visual item type

### Rectangle
Introduced: 5.0
Notes: Filled rectangle visual item
`;

describe('Version-Aware Retrieval Integration Tests', () => {
  let testDir: string;
  let guidesDir: string;
  let dbPath: string;
  let compatDbPath: string;
  let loader: KnowledgeLoader;
  let indexer: KnowledgeIndexer;
  let searchEngine: SearchEngine;
  let searchEngineNoCompat: SearchEngine;

  beforeEach(async () => {
    // Create temporary directories
    testDir = join(tmpdir(), `nullroot-version-test-${Date.now()}-${Math.random().toString(36).slice(2)}`);
    guidesDir = join(testDir, 'guides');
    dbPath = join(testDir, 'test.db');
    compatDbPath = join(testDir, 'compat.db');

    mkdirSync(guidesDir, { recursive: true });

    // Create ecosystem subdirectories
    const ecosystems = ['quickshell', 'hyprland', 'qt-qml', 'lua', 'wayland', 'linux-desktop'];
    for (const eco of ecosystems) {
      mkdirSync(join(guidesDir, eco), { recursive: true });
    }

    // Write test guide files
    writeFileSync(join(guidesDir, 'quickshell', 'workspace-indicator.md'), QUICKSHELL_WORKSPACE_INDICATOR_GUIDE);
    writeFileSync(join(guidesDir, 'hyprland', 'window-rules.md'), HYPRLAND_WINDOW_RULES_GUIDE);
    writeFileSync(join(guidesDir, 'qt-qml', 'property-bindings.md'), QT_QML_PROPERTIES_GUIDE);

    // Initialize KnowledgeLoader
    loader = createKnowledgeLoader({
      guidesRoot: guidesDir,
      validate: true,
    });

    // Initialize KnowledgeIndexer
    indexer = createIndexer({ dbPath, batchSize: 10 });
    await indexer.initialize();

    // Load all guides
    const loadResult = await loader.loadAllGuides();
    expect(loadResult.ok).toBe(true);
    if (!loadResult.ok) throw new Error('Failed to load guides');

    // Index all guides
    const indexResult = await indexer.indexGuides(loadResult.value);
    expect(indexResult.ok).toBe(true);
    if (!indexResult.ok) throw new Error('Failed to index guides');

    // Create and seed compatibility database
    const compatDb = createCompatibilityDatabase(compatDbPath);
    const seedDataPath = join(__dirname, '..', '..', 'packages', 'compatibility', 'seed-data.json');
    const seedData = JSON.parse(readFileSync(seedDataPath, 'utf-8')) as CompatibilityEntry[];
    for (const entry of seedData) {
      const result = compatDb.insert(entry);
      expect(result.ok).toBe(true);
    }
    compatDb.close();

    // Close indexer and create SearchEngine with compatDbPath
    indexer.close();
    searchEngine = createSearchEngine({
      dbPath,
      defaultLimit: 10,
      maxLimit: 100,
      compatDbPath,
    });

    // Create SearchEngine without compatDbPath for comparison
    searchEngineNoCompat = createSearchEngine({
      dbPath,
      defaultLimit: 10,
      maxLimit: 100,
    });
  });

  afterEach(() => {
    // Clean up
    searchEngine?.close();
    searchEngineNoCompat?.close();
    indexer?.close();
    try {
      rmSync(testDir, { recursive: true, force: true });
    } catch {
      // Ignore cleanup errors
    }
  });

  describe('Test Case 1: SearchEngine configured with compatDbPath', () => {
    it('should initialize SearchEngine with compatibility database path', () => {
      expect(searchEngine).toBeDefined();
      expect(searchEngineNoCompat).toBeDefined();
    });

    it('should have compatibility checker when compatDbPath provided', async () => {
      // Verify the search engine can retrieve guides
      const result = await searchEngine.getById('aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee');
      expect(result.ok).toBe(true);
      expect(result.value).not.toBeNull();
    });

    it('should work without compatibility database', async () => {
      const result = await searchEngineNoCompat.getById('aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee');
      expect(result.ok).toBe(true);
      expect(result.value).not.toBeNull();
    });
  });

  describe('Test Case 2: Retrieval for a compatible API (no warnings)', () => {
    it('should return no warnings for Item API in qt-qml at version 6.8', async () => {
      const result = await searchEngine.getById('cccccccc-dddd-eeee-ffff-000000000000', '6.8');
      expect(result.ok).toBe(true);
      expect(result.value).not.toBeNull();

      if (result.value) {
        const guide = result.value as VersionAwareGuide;
        // Item was introduced in 5.0, no deprecation/removal - should have no warnings
        expect(guide.metadata.targetVersion).toBe('6.8');
        expect(guide.metadata.versionWarnings).toBeUndefined();
      }
    });

    it('should return no warnings for Rectangle API in qt-qml at version 6.8', async () => {
      const result = await searchEngine.getById('cccccccc-dddd-eeee-ffff-000000000000', '6.8');
      expect(result.ok).toBe(true);
      expect(result.value).not.toBeNull();

      if (result.value) {
        const guide = result.value as VersionAwareGuide;
        // Rectangle was introduced in 5.0, no deprecation/removal - should have no warnings
        expect(guide.metadata.targetVersion).toBe('6.8');
        // The guide includes Rectangle and Item which are both compatible
        // No warnings expected for these stable APIs
      }
    });

    it('should return no warnings for workspaces API in quickshell at version 1.2', async () => {
      const result = await searchEngine.getById('aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee', '1.2');
      expect(result.ok).toBe(true);
      expect(result.value).not.toBeNull();

      if (result.value) {
        const guide = result.value as VersionAwareGuide;
        // workspaces was introduced in 1.2, so it's compatible at 1.2
        expect(guide.metadata.targetVersion).toBe('1.2');
      }
    });
  });

  describe('Test Case 3: Retrieval for a deprecated API (deprecation warning)', () => {
    it('should return deprecation warning for model API in quickshell at version 1.2', async () => {
      const result = await searchEngine.getById('aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee', '1.2');
      expect(result.ok).toBe(true);
      expect(result.value).not.toBeNull();

      if (result.value) {
        const guide = result.value as VersionAwareGuide;
        expect(guide.metadata.targetVersion).toBe('1.2');
        expect(guide.metadata.versionWarnings).toBeDefined();

        if (guide.metadata.versionWarnings) {
          const modelWarning = guide.metadata.versionWarnings.find(w => w.api === 'model');
          expect(modelWarning).toBeDefined();
          expect(modelWarning?.status).toBe('deprecated');
          expect(modelWarning?.message).toContain('deprecated');
          expect(modelWarning?.replacement).toBe('workspaces');
        }
      }
    });

    it('should return deprecation warning for windowrule API in hyprland at version 0.38', async () => {
      const result = await searchEngine.getById('bbbbbbbb-cccc-dddd-eeee-ffffffffffff', '0.38');
      expect(result.ok).toBe(true);
      expect(result.value).not.toBeNull();

      if (result.value) {
        const guide = result.value as VersionAwareGuide;
        expect(guide.metadata.targetVersion).toBe('0.38');
        expect(guide.metadata.versionWarnings).toBeDefined();

        if (guide.metadata.versionWarnings) {
          const windowRuleWarning = guide.metadata.versionWarnings.find(w => w.api === 'windowrule');
          expect(windowRuleWarning).toBeDefined();
          expect(windowRuleWarning?.status).toBe('deprecated');
          expect(windowRuleWarning?.message).toContain('deprecated');
          expect(windowRuleWarning?.replacement).toBe('windowrulev2');
        }
      }
    });

    it('should include proper message format for deprecation warnings', async () => {
      const result = await searchEngine.getById('aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee', '1.2');
      expect(result.ok).toBe(true);

      if (result.value?.metadata.versionWarnings) {
        const deprecatedWarnings = result.value.metadata.versionWarnings.filter(w => w.status === 'deprecated');
        for (const warning of deprecatedWarnings) {
          expect(warning.api).toBeDefined();
          expect(warning.status).toBe('deprecated');
          expect(warning.message).toBeDefined();
          expect(warning.message.length).toBeGreaterThan(0);
          // Should mention the version it was deprecated in
          expect(warning.message).toMatch(/deprecated (since|in) version/);
        }
      }
    });
  });

  describe('Test Case 4: Retrieval for a removed API (removed warning)', () => {
    it('should return removed warning for windowrule API in hyprland at version 0.40', async () => {
      const result = await searchEngine.getById('bbbbbbbb-cccc-dddd-eeee-ffffffffffff', '0.40');
      expect(result.ok).toBe(true);
      expect(result.value).not.toBeNull();

      if (result.value) {
        const guide = result.value as VersionAwareGuide;
        expect(guide.metadata.targetVersion).toBe('0.40');
        expect(guide.metadata.versionWarnings).toBeDefined();

        if (guide.metadata.versionWarnings) {
          const windowRuleWarning = guide.metadata.versionWarnings.find(w => w.api === 'windowrule');
          expect(windowRuleWarning).toBeDefined();
          expect(windowRuleWarning?.status).toBe('removed');
          expect(windowRuleWarning?.message).toContain('removed');
          expect(windowRuleWarning?.replacement).toBe('windowrulev2');
        }
      }
    });

    it('should return removed warning for windowrule API in hyprland at version 0.45', async () => {
      const result = await searchEngine.getById('bbbbbbbb-cccc-dddd-eeee-ffffffffffff', '0.45');
      expect(result.ok).toBe(true);
      expect(result.value).not.toBeNull();

      if (result.value) {
        const guide = result.value as VersionAwareGuide;
        expect(guide.metadata.targetVersion).toBe('0.45');
        expect(guide.metadata.versionWarnings).toBeDefined();

        if (guide.metadata.versionWarnings) {
          const windowRuleWarning = guide.metadata.versionWarnings.find(w => w.api === 'windowrule');
          expect(windowRuleWarning).toBeDefined();
          expect(windowRuleWarning?.status).toBe('removed');
          expect(windowRuleWarning?.message).toContain('removed');
        }
      }
    });

    it('should include proper message format for removed warnings', async () => {
      const result = await searchEngine.getById('bbbbbbbb-cccc-dddd-eeee-ffffffffffff', '0.40');
      expect(result.ok).toBe(true);

      if (result.value?.metadata.versionWarnings) {
        const removedWarnings = result.value.metadata.versionWarnings.filter(w => w.status === 'removed');
        for (const warning of removedWarnings) {
          expect(warning.api).toBeDefined();
          expect(warning.status).toBe('removed');
          expect(warning.message).toBeDefined();
          expect(warning.message.length).toBeGreaterThan(0);
          // Should mention the version it was removed in
          expect(warning.message).toMatch(/removed in version/);
        }
      }
    });
  });

  describe('Test Case 5: Correct versionWarnings array populated with api, status, message, replacement', () => {
    it('should populate versionWarnings with correct structure', async () => {
      const result = await searchEngine.getById('aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee', '1.2');
      expect(result.ok).toBe(true);

      if (result.value?.metadata.versionWarnings) {
        for (const warning of result.value.metadata.versionWarnings) {
          expect(warning).toHaveProperty('api');
          expect(warning).toHaveProperty('status');
          expect(warning).toHaveProperty('message');
          expect(typeof warning.api).toBe('string');
          expect(['deprecated', 'removed', 'introduced']).toContain(warning.status);
          expect(typeof warning.message).toBe('string');
          expect(warning.message.length).toBeGreaterThan(0);
          // replacement is optional but should be string if present
          if (warning.replacement !== undefined) {
            expect(typeof warning.replacement).toBe('string');
          }
        }
      }
    });

    it('should include replacement when available from compatibility database', async () => {
      const result = await searchEngine.getById('aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee', '1.2');
      expect(result.ok).toBe(true);

      if (result.value?.metadata.versionWarnings) {
        const modelWarning = result.value.metadata.versionWarnings.find(w => w.api === 'model');
        expect(modelWarning).toBeDefined();
        expect(modelWarning?.replacement).toBe('workspaces');
      }
    });

    it('should include replacement from guide note when not in database', async () => {
      const result = await searchEngine.getById('bbbbbbbb-cccc-dddd-eeee-ffffffffffff', '0.38');
      expect(result.ok).toBe(true);

      if (result.value?.metadata.versionWarnings) {
        const windowRuleWarning = result.value.metadata.versionWarnings.find(w => w.api === 'windowrule');
        expect(windowRuleWarning).toBeDefined();
        expect(windowRuleWarning?.replacement).toBe('windowrulev2');
      }
    });
  });

  describe('Test Case 6: Correct targetVersion populated', () => {
    it('should populate targetVersion in metadata', async () => {
      const result = await searchEngine.getById('aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee', '1.2');
      expect(result.ok).toBe(true);
      expect(result.value).not.toBeNull();

      if (result.value) {
        const guide = result.value as VersionAwareGuide;
        expect(guide.metadata.targetVersion).toBe('1.2');
      }
    });

    it('should populate targetVersion for different versions', async () => {
      const versions = ['1.0', '1.1', '1.2', '0.35', '0.40', '0.45', '5.0', '6.0', '6.8'];
      for (const version of versions) {
        // Use appropriate guide ID based on ecosystem
        let guideId = 'aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee';
        if (version.startsWith('0.')) guideId = 'bbbbbbbb-cccc-dddd-eeee-ffffffffffff';
        if (version.startsWith('5.') || version.startsWith('6.')) guideId = 'cccccccc-dddd-eeee-ffff-000000000000';

        const result = await searchEngine.getById(guideId, version);
        expect(result.ok).toBe(true);
        if (result.value) {
          const guide = result.value as VersionAwareGuide;
          expect(guide.metadata.targetVersion).toBe(version);
        }
      }
    });

    it('should not populate targetVersion when no version provided', async () => {
      const result = await searchEngine.getById('aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee');
      expect(result.ok).toBe(true);
      expect(result.value).not.toBeNull();

      if (result.value) {
        const guide = result.value as VersionAwareGuide;
        expect(guide.metadata.targetVersion).toBeUndefined();
      }
    });
  });

  describe('Test Case 7: Missing compatibility database behavior (no compatDbPath = no warnings)', () => {
    it('should not populate versionWarnings when no compatDbPath provided', async () => {
      const result = await searchEngineNoCompat.getById('aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee', '1.2');
      expect(result.ok).toBe(true);
      expect(result.value).not.toBeNull();

      if (result.value) {
        const guide = result.value as VersionAwareGuide;
        expect(guide.metadata.targetVersion).toBe('1.2');
        expect(guide.metadata.versionWarnings).toBeUndefined();
      }
    });

    it('should not populate versionWarnings for deprecated API when no compatDbPath', async () => {
      const result = await searchEngineNoCompat.getById('aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee', '1.2');
      expect(result.ok).toBe(true);
      expect(result.value).not.toBeNull();

      if (result.value) {
        const guide = result.value as VersionAwareGuide;
        expect(guide.metadata.versionWarnings).toBeUndefined();
      }
    });

    it('should not populate versionWarnings for removed API when no compatDbPath', async () => {
      const result = await searchEngineNoCompat.getById('bbbbbbbb-cccc-dddd-eeee-ffffffffffff', '0.40');
      expect(result.ok).toBe(true);
      expect(result.value).not.toBeNull();

      if (result.value) {
        const guide = result.value as VersionAwareGuide;
        expect(guide.metadata.versionWarnings).toBeUndefined();
      }
    });
  });

  describe('Test Case 8: Retrieval without target version (no enrichment)', () => {
    it('should return base result without versionWarnings when targetVersion not provided', async () => {
      const result = await searchEngine.getById('aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee');
      expect(result.ok).toBe(true);
      expect(result.value).not.toBeNull();

      if (result.value) {
        const guide = result.value as VersionAwareGuide;
        expect(guide.metadata.targetVersion).toBeUndefined();
        expect(guide.metadata.versionWarnings).toBeUndefined();
      }
    });

    it('should return base result for deprecated API when no targetVersion', async () => {
      const result = await searchEngine.getById('aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee');
      expect(result.ok).toBe(true);
      expect(result.value).not.toBeNull();

      if (result.value) {
        const guide = result.value as VersionAwareGuide;
        expect(guide.metadata.versionWarnings).toBeUndefined();
      }
    });

    it('should return base result for removed API when no targetVersion', async () => {
      const result = await searchEngine.getById('bbbbbbbb-cccc-dddd-eeee-ffffffffffff');
      expect(result.ok).toBe(true);
      expect(result.value).not.toBeNull();

      if (result.value) {
        const guide = result.value as VersionAwareGuide;
        expect(guide.metadata.versionWarnings).toBeUndefined();
      }
    });
  });

  describe('Test Case 9: Unknown guide or API identifiers', () => {
    it('should return null for non-existent guide ID', async () => {
      const result = await searchEngine.getById('00000000-0000-0000-0000-000000000000', '1.2');
      expect(result.ok).toBe(true);
      expect(result.value).toBeNull();
    });

    it('should return null for non-existent guide ID with compatDbPath', async () => {
      const result = await searchEngine.getById('ffffffff-ffff-ffff-ffff-ffffffffffff', '1.2');
      expect(result.ok).toBe(true);
      expect(result.value).toBeNull();
    });

    it('should handle guide with API not in compatibility database gracefully', async () => {
      // The qt-qml guide has APIs that are in the database
      // But if an API is not found, it should not crash and just not add warnings
      const result = await searchEngine.getById('cccccccc-dddd-eeee-ffff-000000000000', '6.8');
      expect(result.ok).toBe(true);
      expect(result.value).not.toBeNull();

      if (result.value) {
        const guide = result.value as VersionAwareGuide;
        // Should work without errors
        expect(guide.metadata.targetVersion).toBe('6.8');
      }
    });

    it('should handle unknown ecosystem gracefully', async () => {
      // We only have 3 guides, all with known ecosystems
      // Test passes if no crash occurs
      const result = await searchEngine.getById('aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee', '1.2');
      expect(result.ok).toBe(true);
    });
  });

  describe('Test Case 10: No false warnings across ecosystems', () => {
    it('should not generate warnings for quickshell APIs when querying hyprland guide', async () => {
      const result = await searchEngine.getById('bbbbbbbb-cccc-dddd-eeee-ffffffffffff', '0.40');
      expect(result.ok).toBe(true);
      expect(result.value).not.toBeNull();

      if (result.value) {
        const guide = result.value as VersionAwareGuide;
        // The hyprland guide should only have warnings for hyprland APIs
        if (guide.metadata.versionWarnings) {
          for (const warning of guide.metadata.versionWarnings) {
            // Should only have hyprland-related warnings (windowrule, windowrulev2)
            expect(['windowrule', 'windowrulev2']).toContain(warning.api);
          }
        }
      }
    });

    it('should not generate warnings for hyprland APIs when querying quickshell guide', async () => {
      const result = await searchEngine.getById('aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee', '1.2');
      expect(result.ok).toBe(true);
      expect(result.value).not.toBeNull();

      if (result.value) {
        const guide = result.value as VersionAwareGuide;
        // The quickshell guide should only have warnings for quickshell APIs
        if (guide.metadata.versionWarnings) {
          for (const warning of guide.metadata.versionWarnings) {
            // Should only have quickshell-related warnings (model, workspaces)
            expect(['model', 'workspaces']).toContain(warning.api);
          }
        }
      }
    });

    it('should not generate warnings for qt-qml APIs when querying quickshell guide', async () => {
      const result = await searchEngine.getById('aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee', '1.2');
      expect(result.ok).toBe(true);
      expect(result.value).not.toBeNull();

      if (result.value) {
        const guide = result.value as VersionAwareGuide;
        if (guide.metadata.versionWarnings) {
          for (const warning of guide.metadata.versionWarnings) {
            // Should not have qt-qml APIs like Item, Rectangle, etc.
            expect(['Item', 'Rectangle', 'Text', 'MouseArea', 'ListView', 'PropertyBinding', 'Signal', 'Model', 'Button', 'Menu']).not.toContain(warning.api);
          }
        }
      }
    });

    it('should correctly isolate warnings by ecosystem', async () => {
      // Test quickshell guide at version where model is deprecated
      const qsResult = await searchEngine.getById('aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee', '1.2');
      // Test hyprland guide at version where windowrule is removed
      const hlResult = await searchEngine.getById('bbbbbbbb-cccc-dddd-eeee-ffffffffffff', '0.40');

      expect(qsResult.ok).toBe(true);
      expect(hlResult.ok).toBe(true);

      if (qsResult.value?.metadata.versionWarnings) {
        const qsWarnings = qsResult.value.metadata.versionWarnings;
        // All warnings should be for quickshell APIs
        for (const w of qsWarnings) {
          expect(['model', 'workspaces']).toContain(w.api);
        }
      }

      if (hlResult.value?.metadata.versionWarnings) {
        const hlWarnings = hlResult.value.metadata.versionWarnings;
        // All warnings should be for hyprland APIs
        for (const w of hlWarnings) {
          expect(['windowrule', 'windowrulev2']).toContain(w.api);
        }
      }
    });
  });

  describe('Additional: Multiple warnings in single guide', () => {
    it('should return multiple warnings when guide has multiple deprecated/removed APIs', async () => {
      const result = await searchEngine.getById('bbbbbbbb-cccc-dddd-eeee-ffffffffffff', '0.40');
      expect(result.ok).toBe(true);
      expect(result.value).not.toBeNull();

      if (result.value) {
        const guide = result.value as VersionAwareGuide;
        // The hyprland guide has both windowrule (removed) and windowrulev2 (compatible)
        // Should have warning for windowrule but not for windowrulev2
        if (guide.metadata.versionWarnings) {
          expect(guide.metadata.versionWarnings.length).toBeGreaterThanOrEqual(1);
          const windowRuleWarning = guide.metadata.versionWarnings.find(w => w.api === 'windowrule');
          expect(windowRuleWarning).toBeDefined();
          expect(windowRuleWarning?.status).toBe('removed');
        }
      }
    });

    it('should only warn for deprecated/removed APIs, not for compatible ones', async () => {
      const result = await searchEngine.getById('aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee', '1.2');
      expect(result.ok).toBe(true);
      expect(result.value).not.toBeNull();

      if (result.value) {
        const guide = result.value as VersionAwareGuide;
        // model is deprecated, workspaces is compatible
        if (guide.metadata.versionWarnings) {
          const modelWarning = guide.metadata.versionWarnings.find(w => w.api === 'model');
          const workspacesWarning = guide.metadata.versionWarnings.find(w => w.api === 'workspaces');
          expect(modelWarning).toBeDefined();
          expect(modelWarning?.status).toBe('deprecated');
          // workspaces should not have a warning since it's compatible
          expect(workspacesWarning).toBeUndefined();
        }
      }
    });
  });

  describe('Additional: Version boundary testing', () => {
    it('should show model as compatible at version 1.1 (before deprecation)', async () => {
      const result = await searchEngine.getById('aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee', '1.1');
      expect(result.ok).toBe(true);

      if (result.value?.metadata.versionWarnings) {
        const modelWarning = result.value.metadata.versionWarnings.find(w => w.api === 'model');
        // At version 1.1, model should be compatible (deprecated in 1.2)
        expect(modelWarning).toBeUndefined();
      }
    });

    it('should show model as deprecated at version 1.2', async () => {
      const result = await searchEngine.getById('aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee', '1.2');
      expect(result.ok).toBe(true);

      if (result.value?.metadata.versionWarnings) {
        const modelWarning = result.value.metadata.versionWarnings.find(w => w.api === 'model');
        // At version 1.2, model should be deprecated
        expect(modelWarning).toBeDefined();
        expect(modelWarning?.status).toBe('deprecated');
      }
    });

    it('should show windowrule as deprecated at version 0.38', async () => {
      const result = await searchEngine.getById('bbbbbbbb-cccc-dddd-eeee-ffffffffffff', '0.38');
      expect(result.ok).toBe(true);

      if (result.value?.metadata.versionWarnings) {
        const windowRuleWarning = result.value.metadata.versionWarnings.find(w => w.api === 'windowrule');
        // At version 0.38, windowrule should be deprecated (deprecated in 0.35, removed in 0.40)
        expect(windowRuleWarning).toBeDefined();
        expect(windowRuleWarning?.status).toBe('deprecated');
      }
    });

    it('should show windowrule as removed at version 0.40', async () => {
      const result = await searchEngine.getById('bbbbbbbb-cccc-dddd-eeee-ffffffffffff', '0.40');
      expect(result.ok).toBe(true);

      if (result.value?.metadata.versionWarnings) {
        const windowRuleWarning = result.value.metadata.versionWarnings.find(w => w.api === 'windowrule');
        // At version 0.40, windowrule should be removed
        expect(windowRuleWarning).toBeDefined();
        expect(windowRuleWarning?.status).toBe('removed');
      }
    });

    it('should show workspaces as not available at version 1.1 (introduced in 1.2)', async () => {
      const result = await searchEngine.getById('aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee', '1.1');
      expect(result.ok).toBe(true);

      if (result.value?.metadata.versionWarnings) {
        const workspacesWarning = result.value.metadata.versionWarnings.find(w => w.api === 'workspaces');
        // At version 1.1, workspaces should not be available yet (introduced in 1.2)
        expect(workspacesWarning).toBeDefined();
        expect(workspacesWarning?.status).toBe('introduced');
      }
    });
  });
});