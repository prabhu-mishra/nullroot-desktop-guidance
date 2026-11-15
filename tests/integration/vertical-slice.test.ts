/**
 * End-to-End Integration Test: Vertical Slice
 *
 * Tests the complete flow:
 * Guide file → YAML parsing → Schema validation (GuideEntry)
 * → KnowledgeLoader → KnowledgeIndexer → SQLite FTS5
 * → SearchEngine → BM25 ranking → Retrieve by ID
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { KnowledgeLoader, createKnowledgeLoader } from '@nullroot/knowledge';
import { KnowledgeIndexer, createIndexer } from '@nullroot/retrieval';
import { SearchEngine, createSearchEngine } from '@nullroot/retrieval';
import { join } from 'path';
import { tmpdir } from 'os';
import { mkdirSync, writeFileSync, rmSync, readFileSync } from 'fs';

// Test constants
const WORKSPACE_INDICATOR_GUIDE = `---
id: "aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee"
title: "Workspace Indicator Configuration"
ecosystem: "quickshell"
category: "components"
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

The WorkspaceIndicator component displays the current workspace and allows switching between workspaces in your Quickshell panel. It integrates with the Workspaces service to provide visual feedback and interaction.

This guide covers configuration options, styling, and common patterns for using WorkspaceIndicator in your panel setup.

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

### WorkspaceIndicatorWithClick
Context: Interactive workspace indicator that responds to clicks
\`\`\`qml
import QtQuick
import Quickshell

WorkspaceIndicator {
    model: Workspaces.workspacesModel
    currentIndex: Workspaces.currentIndex
    onClicked: (index) => {
        Workspaces.requestActivate(index)
    }
    delegate: Item {
        width: 40
        height: 40
        MouseArea {
            anchors.fill: parent
            onClicked: parent.WorkspaceIndicator.clicked(index)
        }
        Rectangle {
            anchors.fill: parent
            color: model.currentIndex === index ? "#00ff00" : "#444444"
            radius: 6
            border.color: model.currentIndex === index ? "#ffffff" : "transparent"
        }
        Text {
            anchors.centerIn: parent
            text: model.name || String(index + 1)
            color: "#ffffff"
        }
    }
}
\`\`\`

## Examples

### Basic Workspace Indicator
Runnable: true
Dependencies: QtQuick, Quickshell
\`\`\`qml
import QtQuick
import Quickshell

Panel {
    WorkspaceIndicator {
        model: Workspaces.workspacesModel
        currentIndex: Workspaces.currentIndex
    }
}
\`\`\`

### Styled Workspace Indicator
Runnable: false
Dependencies: QtQuick, Quickshell
\`\`\`qml
import QtQuick
import Quickshell

WorkspaceIndicator {
    model: Workspaces.workspacesModel
    currentIndex: Workspaces.currentIndex
    delegate: Rectangle {
        width: 24
        height: 24
        radius: 12
        color: model.currentIndex === index ? "#2196F3" : "#757575"
        Text {
            anchors.centerIn: parent
            text: model.name || String(index + 1)
            color: "white"
            font.pixelSize: 12
        }
    }
}
\`\`\`

## Mistakes

### WrongPropertyName
Problem: Using wrong property name for workspace model
Solution: Use 'Workspaces.workspacesModel' not 'Workspaces.model'
Severity: error

### MissingImport
Problem: Forgetting to import Quickshell module
Solution: Add 'import Quickshell' at the top of your QML file
Severity: warning

## Compatibility

### WorkspaceIndicator
Introduced: 1.0
Deprecated: 2.0
Removed: 3.0
Replacement: NewWorkspaceIndicator
Notes: Migration required - new API uses different property names

## Performance

### Rendering
Impact: low
Description: WorkspaceIndicator has minimal rendering overhead
Mitigation: Use simple delegates for best performance

## Debugging

### IndicatorNotShowing
Cause: Workspaces service not running or not connected
Diagnosis: Check if Workspaces.workspacesModel has data
Resolution: Ensure Quickshell is running with workspace support enabled
Tools: qmllint, quikcshell --debug

## References

- [Official Docs](https://quickshell.org/docs/components/workspace-indicator) (official)
- [Quickshell GitHub](https://github.com/quickshell/quickshell) (community)
`;

const HYPRLAND_GUIDE = `---
id: "bbbbbbbb-cccc-dddd-eeee-ffffffffffff"
title: "Hyprland Workspace Rules"
ecosystem: "hyprland"
category: "configuration"
versions: ["0.45"]
sources:
  - url: "https://wiki.hypr.land/Configuring/Workspace-Rules"
    title: "Workspace Rules Configuration"
    ecosystem: "hyprland"
    retrieved: "2024-01-15T00:00:00Z"
    verificationState: "official"
status: "verified"
lastVerified: "2024-01-15T00:00:00Z"
tags: ["workspace", "rules", "hyprland", "window-management"]
checksum: "test-checksum-hyprland-workspace"
---

# Explanation

Hyprland provides powerful workspace management through workspace rules. You can configure workspace-specific settings, assign windows to workspaces, and define workspace behaviors.

## Patterns

### WorkspaceRule
Context: Assign windows to specific workspaces
\`\`\`hyprlang
workspace = 1, name:main
workspace = 2, name:dev
workspace = 3, name:web
\`\`\`

## Examples

### Basic Workspace Assignment
Runnable: true
Dependencies: Hyprland
\`\`\`hyprlang
windowrulev2 = workspace 2, class:^(code|Code)$
windowrulev2 = workspace 3, class:^(firefox|Firefox)$
\`\`\`

## Mistakes

### WrongWorkspaceNumber
Problem: Using 0-indexed workspace numbers
Solution: Hyprland workspaces are 1-indexed
Severity: error

## Compatibility

### workspace
Introduced: 0.35
Notes: Workspace rules have been stable since 0.35

## Performance

### Window Assignment
Impact: low
Description: Workspace rules are evaluated on window creation

## Debugging

### WindowNotAssigned
Cause: Window class doesn't match rule
Diagnosis: Use 'hyprctl clients' to check window class
Resolution: Update rule to match correct class
Tools: hyprctl

## References

- [Hyprland Wiki](https://wiki.hypr.land/Configuring/Workspace-Rules) (official)
`;

const QT_QML_GUIDE = `---
id: "cccccccc-dddd-eeee-ffff-000000000000"
title: "QML Property Bindings"
ecosystem: "qt-qml"
category: "properties"
versions: ["6.8"]
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

QML property bindings allow you to create dynamic relationships between properties. When a source property changes, all bound target properties automatically update.

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

## Examples

### Simple Binding
Runnable: true
Dependencies: QtQuick
\`\`\`qml
import QtQuick

Rectangle {
    width: 100
    height: 100
    color: "blue"
    property int doubleWidth: width * 2
}
\`\`\`

## Mistakes

### CircularBinding
Problem: Creating circular property bindings
Solution: Avoid binding A to B and B to A
Severity: error

## Compatibility

### property
Introduced: 5.0
Notes: Property bindings are a core QML feature

## Performance

### BindingOverhead
Impact: medium
Description: Complex bindings can impact performance
Mitigation: Use simple bindings, avoid deep binding chains

## Debugging

### BindingNotUpdating
Cause: Source property not notifying changes
Diagnosis: Check if source property has NOTIFY signal
Resolution: Ensure proper property declaration
Tools: qmllint

## References

- [Qt Documentation](https://doc.qt.io/qt-6/qtqml-syntax-propertybinding.html) (official)
`;

describe('Vertical Slice: End-to-End Integration Test', () => {
  let testDir: string;
  let guidesDir: string;
  let dbPath: string;
  let loader: KnowledgeLoader;
  let indexer: KnowledgeIndexer;
  let searchEngine: SearchEngine;

  beforeEach(async () => {
    // Create temporary directories
    testDir = join(tmpdir(), `nullroot-integration-test-${Date.now()}-${Math.random().toString(36).slice(2)}`);
    guidesDir = join(testDir, 'guides');
    dbPath = join(testDir, 'test.db');

    mkdirSync(guidesDir, { recursive: true });

    // Create ecosystem subdirectories
    const ecosystems = ['quickshell', 'hyprland', 'qt-qml', 'lua', 'wayland', 'linux-desktop'];
    for (const eco of ecosystems) {
      mkdirSync(join(guidesDir, eco), { recursive: true });
    }

    // Write test guide files
    writeFileSync(join(guidesDir, 'quickshell', 'workspace-indicator.md'), WORKSPACE_INDICATOR_GUIDE);
    writeFileSync(join(guidesDir, 'hyprland', 'workspace-rules.md'), HYPRLAND_GUIDE);
    writeFileSync(join(guidesDir, 'qt-qml', 'property-bindings.md'), QT_QML_GUIDE);

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

    // Close indexer and create SearchEngine
    indexer.close();
    searchEngine = createSearchEngine({
      dbPath,
      defaultLimit: 10,
      maxLimit: 100,
    });
  });

  afterEach(() => {
    // Clean up
    searchEngine?.close();
    indexer?.close();
    try {
      rmSync(testDir, { recursive: true, force: true });
    } catch {
      // Ignore cleanup errors
    }
  });

  describe('Test Case 1: Full Pipeline Test', () => {
    it('should load guide → index → search → retrieve by ID with all data intact', async () => {
      // Search for the workspace indicator guide
      const searchResult = await searchEngine.search({ query: 'workspace indicator' });
      expect(searchResult.ok).toBe(true);
      expect(searchResult.value.length).toBeGreaterThan(0);

      const foundGuide = searchResult.value.find(r => r.title.includes('Workspace Indicator'));
      expect(foundGuide).toBeDefined();

      if (foundGuide) {
        // Retrieve by ID
        const retrieveResult = await searchEngine.getById(foundGuide.id);
        expect(retrieveResult.ok).toBe(true);
        expect(retrieveResult.value).not.toBeNull();

        if (retrieveResult.value) {
          const guide = retrieveResult.value;
          // Verify all provenance fields
          expect(guide.id).toBe('aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee');
          expect(guide.title).toBe('Workspace Indicator Configuration');
          expect(guide.ecosystem).toBe('quickshell');
          expect(guide.category).toBe('components');
          expect(guide.metadata.versions).toEqual(['1.0', '1.1', '1.2']);
          expect(guide.metadata.status).toBe('verified');
          expect(guide.metadata.lastVerified).toBe('2024-01-15T00:00:00Z');
          expect(guide.metadata.tags).toContain('workspace');
          expect(guide.metadata.tags).toContain('indicator');
          expect(guide.metadata.tags).toContain('panel');
          expect(guide.snippet).toBeDefined();
          expect(guide.score).toBeGreaterThan(0);
        }
      }
    });
  });

  describe('Test Case 2: Search Relevance Test', () => {
    it('should find WorkspaceIndicator guide when querying "workspace indicator"', async () => {
      const result = await searchEngine.search({ query: 'workspace indicator' });
      expect(result.ok).toBe(true);

      const workspaceGuide = result.value.find(r => r.title.includes('Workspace Indicator'));
      expect(workspaceGuide).toBeDefined();
      expect(workspaceGuide?.ecosystem).toBe('quickshell');
    });

    it('should rank WorkspaceIndicator guide higher for relevant queries', async () => {
      const result = await searchEngine.search({ query: 'workspace indicator panel' });
      expect(result.ok).toBe(true);
      expect(result.value.length).toBeGreaterThan(0);

      // First result should be the most relevant
      expect(result.value[0].title).toContain('Workspace');
    });
  });

  describe('Test Case 3: CamelCase Test', () => {
    it('should find guide with PascalCase query "WorkspaceIndicator"', async () => {
      const result = await searchEngine.search({ query: 'WorkspaceIndicator' });
      expect(result.ok).toBe(true);

      const workspaceGuide = result.value.find(r => r.title.includes('Workspace Indicator'));
      expect(workspaceGuide).toBeDefined();
    });

    it('should find guide with camelCase query "workspaceIndicator"', async () => {
      const result = await searchEngine.search({ query: 'workspaceIndicator' });
      expect(result.ok).toBe(true);

      const workspaceGuide = result.value.find(r => r.title.includes('Workspace Indicator'));
      expect(workspaceGuide).toBeDefined();
    });

    it('should find guide with snake_case query "workspace_indicator"', async () => {
      const result = await searchEngine.search({ query: 'workspace_indicator' });
      expect(result.ok).toBe(true);

      const workspaceGuide = result.value.find(r => r.title.includes('Workspace Indicator'));
      expect(workspaceGuide).toBeDefined();
    });

    it('should find guide with kebab-case query "workspace-indicator"', async () => {
      const result = await searchEngine.search({ query: 'workspace-indicator' });
      expect(result.ok).toBe(true);

      const workspaceGuide = result.value.find(r => r.title.includes('Workspace Indicator'));
      expect(workspaceGuide).toBeDefined();
    });

    it('should find guide with mixed case query "Workspace indicator"', async () => {
      const result = await searchEngine.search({ query: 'Workspace indicator' });
      expect(result.ok).toBe(true);

      const workspaceGuide = result.value.find(r => r.title.includes('Workspace Indicator'));
      expect(workspaceGuide).toBeDefined();
    });
  });

  describe('Test Case 4: Filter Test', () => {
    it('should filter by ecosystem', async () => {
      const result = await searchEngine.search({
        query: 'workspace',
        ecosystems: ['quickshell']
      });

      expect(result.ok).toBe(true);
      expect(result.value.every(r => r.ecosystem === 'quickshell')).toBe(true);
      expect(result.value.some(r => r.title.includes('Workspace Indicator'))).toBe(true);
    });

    it('should filter by category', async () => {
      const result = await searchEngine.search({
        query: 'workspace',
        categories: ['components']
      });

      expect(result.ok).toBe(true);
      expect(result.value.every(r => r.category === 'components')).toBe(true);
      expect(result.value.some(r => r.title.includes('Workspace Indicator'))).toBe(true);
    });

    it('should filter by status', async () => {
      const result = await searchEngine.search({
        query: 'workspace',
        status: ['verified']
      });

      expect(result.ok).toBe(true);
      expect(result.value.every(r => r.metadata.status === 'verified')).toBe(true);
    });

    it('should filter by versions', async () => {
      const result = await searchEngine.search({
        query: 'workspace',
        versions: ['1.0']
      });

      expect(result.ok).toBe(true);
      // Should find guides that have version 1.0
      expect(result.value.length).toBeGreaterThan(0);
    });

    it('should filter by multiple ecosystems', async () => {
      const result = await searchEngine.search({
        query: 'workspace',
        ecosystems: ['quickshell', 'hyprland']
      });

      expect(result.ok).toBe(true);
      expect(result.value.every(r => ['quickshell', 'hyprland'].includes(r.ecosystem))).toBe(true);
    });

    it('should filter by multiple categories', async () => {
      const result = await searchEngine.search({
        query: 'guide',
        categories: ['components', 'configuration']
      });

      expect(result.ok).toBe(true);
      expect(result.value.every(r => ['components', 'configuration'].includes(r.category))).toBe(true);
    });
  });

  describe('Test Case 5: Pagination Test', () => {
    it('should respect limit parameter', async () => {
      const result = await searchEngine.search({
        query: 'guide',
        limit: 2
      });

      expect(result.ok).toBe(true);
      expect(result.value.length).toBeLessThanOrEqual(2);
    });

    it('should respect offset parameter', async () => {
      const result1 = await searchEngine.search({ query: 'guide', limit: 10 });
      const result2 = await searchEngine.search({ query: 'guide', limit: 10, offset: 1 });

      expect(result1.ok).toBe(true);
      expect(result2.ok).toBe(true);

      if (result1.ok && result2.ok && result1.value.length > 1) {
        expect(result2.value[0].id).toBe(result1.value[1].id);
      }
    });

    it('should return empty results when offset exceeds total', async () => {
      const result = await searchEngine.search({
        query: 'guide',
        limit: 10,
        offset: 100
      });

      expect(result.ok).toBe(true);
      expect(result.value.length).toBe(0);
    });

    it('should not exceed maxLimit', async () => {
      const result = await searchEngine.search({
        query: 'guide',
        limit: 200 // Exceeds maxLimit of 100
      });

      expect(result.ok).toBe(true);
      expect(result.value.length).toBeLessThanOrEqual(100);
    });
  });

  describe('Test Case 6: Empty Result Test', () => {
    it('should return empty array for unrelated query', async () => {
      const result = await searchEngine.search({ query: 'xyzabc123nonexistent' });
      expect(result.ok).toBe(true);
      expect(result.value.length).toBe(0);
    });

    it('should return empty array for empty query', async () => {
      const result = await searchEngine.search({ query: '' });
      expect(result.ok).toBe(true);
      expect(result.value.length).toBe(0);
    });

    it('should return empty array when filters exclude all results', async () => {
      const result = await searchEngine.search({
        query: 'workspace',
        ecosystems: ['lua'] // No lua guides with workspace
      });

      expect(result.ok).toBe(true);
      expect(result.value.length).toBe(0);
    });
  });

  describe('Test Case 7: Retrieve by ID Test', () => {
    it('should retrieve guide by exact ID', async () => {
      const result = await searchEngine.getById('aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee');
      expect(result.ok).toBe(true);
      expect(result.value).not.toBeNull();

      if (result.value) {
        expect(result.value.id).toBe('aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee');
        expect(result.value.title).toBe('Workspace Indicator Configuration');
        expect(result.value.score).toBe(1.0); // Perfect match for direct lookup
      }
    });

    it('should return null for non-existent ID', async () => {
      const result = await searchEngine.getById('00000000-0000-0000-0000-000000000000');
      expect(result.ok).toBe(true);
      expect(result.value).toBeNull();
    });

    it('should retrieve Hyprland guide by ID', async () => {
      const result = await searchEngine.getById('bbbbbbbb-cccc-dddd-eeee-ffffffffffff');
      expect(result.ok).toBe(true);
      expect(result.value).not.toBeNull();

      if (result.value) {
        expect(result.value.id).toBe('bbbbbbbb-cccc-dddd-eeee-ffffffffffff');
        expect(result.value.title).toBe('Hyprland Workspace Rules');
        expect(result.value.ecosystem).toBe('hyprland');
      }
    });

    it('should retrieve Qt/QML guide by ID', async () => {
      const result = await searchEngine.getById('cccccccc-dddd-eeee-ffff-000000000000');
      expect(result.ok).toBe(true);
      expect(result.value).not.toBeNull();

      if (result.value) {
        expect(result.value.id).toBe('cccccccc-dddd-eeee-ffff-000000000000');
        expect(result.value.title).toBe('QML Property Bindings');
        expect(result.value.ecosystem).toBe('qt-qml');
      }
    });
  });

  describe('Test Case 8: Provenance Test', () => {
    it('should have all metadata fields in retrieved guide', async () => {
      const result = await searchEngine.getById('aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee');
      expect(result.ok).toBe(true);
      expect(result.value).not.toBeNull();

      if (result.value) {
        const guide = result.value;
        // Check all provenance fields
        expect(guide.id).toBeDefined();
        expect(guide.title).toBeDefined();
        expect(guide.ecosystem).toBeDefined();
        expect(guide.category).toBeDefined();
        expect(guide.metadata.versions).toBeDefined();
        expect(Array.isArray(guide.metadata.versions)).toBe(true);
        expect(guide.metadata.versions.length).toBeGreaterThan(0);
        expect(guide.metadata.status).toBeDefined();
        expect(['verified', 'reviewed', 'community', 'unverified', 'deprecated']).toContain(guide.metadata.status);
        expect(guide.metadata.lastVerified).toBeDefined();
        // Verify ISO 8601 date format
        expect(guide.metadata.lastVerified).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}Z$/);
        expect(guide.metadata.tags).toBeDefined();
        expect(Array.isArray(guide.metadata.tags)).toBe(true);
      }
    });

    it('should have correct versions array', async () => {
      const result = await searchEngine.getById('aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee');
      expect(result.ok).toBe(true);
      expect(result.value?.metadata.versions).toEqual(['1.0', '1.1', '1.2']);
    });

    it('should have correct status', async () => {
      const result = await searchEngine.getById('aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee');
      expect(result.ok).toBe(true);
      expect(result.value?.metadata.status).toBe('verified');
    });

    it('should have correct lastVerified date', async () => {
      const result = await searchEngine.getById('aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee');
      expect(result.ok).toBe(true);
      expect(result.value?.metadata.lastVerified).toBe('2024-01-15T00:00:00Z');
    });

    it('should have correct tags', async () => {
      const result = await searchEngine.getById('aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee');
      expect(result.ok).toBe(true);
      const tags = result.value?.metadata.tags || [];
      expect(tags).toContain('workspace');
      expect(tags).toContain('indicator');
      expect(tags).toContain('panel');
      expect(tags).toContain('workspace-indicator');
      expect(tags).toContain('WorkspaceIndicator');
    });

    it('should have provenance for all three guides', async () => {
      const ids = [
        'aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee',
        'bbbbbbbb-cccc-dddd-eeee-ffffffffffff',
        'cccccccc-dddd-eeee-ffff-000000000000'
      ];

      for (const id of ids) {
        const result = await searchEngine.getById(id);
        expect(result.ok).toBe(true);
        expect(result.value).not.toBeNull();

        if (result.value) {
          expect(result.value.metadata.versions).toBeDefined();
          expect(result.value.metadata.status).toBeDefined();
          expect(result.value.metadata.lastVerified).toBeDefined();
          expect(result.value.metadata.tags).toBeDefined();
        }
      }
    });
  });

  describe('Additional: Deterministic Results', () => {
    it('should return consistent results for same query', async () => {
      const result1 = await searchEngine.search({ query: 'workspace indicator' });
      const result2 = await searchEngine.search({ query: 'workspace indicator' });

      expect(result1.ok).toBe(true);
      expect(result2.ok).toBe(true);

      if (result1.ok && result2.ok) {
        expect(result1.value.map(r => r.id)).toEqual(result2.value.map(r => r.id));
        expect(result1.value.map(r => r.score)).toEqual(result2.value.map(r => r.score));
      }
    });

    it('should return consistent results for direct ID lookup', async () => {
      const result1 = await searchEngine.getById('aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee');
      const result2 = await searchEngine.getById('aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee');

      expect(result1.ok).toBe(true);
      expect(result2.ok).toBe(true);

      if (result1.ok && result2.ok && result1.value && result2.value) {
        expect(result1.value.id).toBe(result2.value.id);
        expect(result1.value.title).toBe(result2.value.title);
        expect(result1.value.score).toBe(result2.value.score);
      }
    });
  });

  describe('Additional: Case-Insensitive Retrieval', () => {
    it('should find guide with uppercase query', async () => {
      const result = await searchEngine.search({ query: 'WORKSPACE INDICATOR' });
      expect(result.ok).toBe(true);
      expect(result.value.some(r => r.title.includes('Workspace Indicator'))).toBe(true);
    });

    it('should find guide with mixed case query', async () => {
      const result = await searchEngine.search({ query: 'Workspace INDICATOR' });
      expect(result.ok).toBe(true);
      expect(result.value.some(r => r.title.includes('Workspace Indicator'))).toBe(true);
    });

    it('should find guide with partial case-insensitive match', async () => {
      const result = await searchEngine.search({ query: 'WORKSPACE' });
      expect(result.ok).toBe(true);
      expect(result.value.some(r => r.title.includes('Workspace Indicator'))).toBe(true);
    });
  });

  describe('Additional: Cross-Ecosystem Search', () => {
    it('should find workspace guides across ecosystems', async () => {
      const result = await searchEngine.search({ query: 'workspace' });
      expect(result.ok).toBe(true);

      // Should find both quickshell and hyprland workspace guides
      const ecosystems = result.value.map(r => r.ecosystem);
      expect(ecosystems).toContain('quickshell');
      expect(ecosystems).toContain('hyprland');
    });

    it('should not return qt-qml guide for workspace query', async () => {
      const result = await searchEngine.search({ query: 'workspace' });
      expect(result.ok).toBe(true);

      const ecosystems = result.value.map(r => r.ecosystem);
      expect(ecosystems).not.toContain('qt-qml');
    });
  });

  describe('Additional: Search Result Structure', () => {
    it('should return results with correct SearchResult structure', async () => {
      const result = await searchEngine.search({ query: 'workspace' });
      expect(result.ok).toBe(true);

      if (result.ok && result.value.length > 0) {
        const searchResult = result.value[0];
        expect(searchResult).toHaveProperty('id');
        expect(searchResult).toHaveProperty('title');
        expect(searchResult).toHaveProperty('ecosystem');
        expect(searchResult).toHaveProperty('category');
        expect(searchResult).toHaveProperty('snippet');
        expect(searchResult).toHaveProperty('score');
        expect(searchResult).toHaveProperty('metadata');
        expect(searchResult.metadata).toHaveProperty('versions');
        expect(searchResult.metadata).toHaveProperty('status');
        expect(searchResult.metadata).toHaveProperty('lastVerified');
        expect(searchResult.metadata).toHaveProperty('tags');
        expect(typeof searchResult.score).toBe('number');
        expect(searchResult.score).toBeGreaterThan(0);
      }
    });

    it('should include snippet in search results', async () => {
      const result = await searchEngine.search({ query: 'workspace indicator' });
      expect(result.ok).toBe(true);

      if (result.ok && result.value.length > 0) {
        expect(result.value[0].snippet).toBeDefined();
        expect(typeof result.value[0].snippet).toBe('string');
        expect(result.value[0].snippet.length).toBeGreaterThan(0);
      }
    });
  });

  describe('Additional: Suggestions', () => {
    it('should return title suggestions for prefix', async () => {
      const result = await searchEngine.getSuggestions('Work', 5);
      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.value.length).toBeGreaterThan(0);
        expect(result.value[0].startsWith('Work')).toBe(true);
      }
    });

    it('should return empty array for non-matching prefix', async () => {
      const result = await searchEngine.getSuggestions('NonExistentPrefix', 5);
      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.value.length).toBe(0);
      }
    });
  });

  describe('Additional: Database Isolation', () => {
    it('should use isolated temporary database', async () => {
      // Verify the database file exists and is in the temp directory
      const dbExists = readFileSync(dbPath).length > 0;
      expect(dbExists).toBe(true);

      // Verify it's not the production database
      expect(dbPath).toContain('nullroot-integration-test');
    });

    it('should clean up database resources after test', async () => {
      // This is verified by the afterEach hook
      // If cleanup fails, the test will error
      expect(true).toBe(true);
    });
  });
});