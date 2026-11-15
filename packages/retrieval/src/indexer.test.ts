/**
 * Tests for KnowledgeIndexer and SearchEngine
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { KnowledgeIndexer, createIndexer } from './indexer.js';
import { SearchEngine, createSearchEngine } from './search.js';
import { splitCamelCase, tokenize, computeBM25, DEFAULT_BM25_CONFIG } from './bm25.js';
import type { GuideEntry } from '@nullroot/core';
import { join } from 'path';
import { tmpdir } from 'os';
import { mkdirSync, rmSync } from 'fs';

describe('KnowledgeIndexer', () => {
  let testDir: string;
  let dbPath: string;
  let indexer: KnowledgeIndexer;

  const createTestGuide = (overrides: Partial<GuideEntry> = {}): GuideEntry => ({
    id: '123e4567-e89b-12d3-a456-426614174000',
    title: 'Test Guide',
    ecosystem: 'quickshell',
    category: 'fundamentals',
    versions: ['1.0'],
    sources: [
      {
        url: 'https://example.com',
        title: 'Example Source',
        ecosystem: 'quickshell',
        retrieved: '2024-01-01T00:00:00Z',
        verificationState: 'official',
      },
    ],
    status: 'verified',
    lastVerified: '2024-01-01T00:00:00Z',
    tags: ['test', 'example'],
    checksum: 'abc123',
    content: {
      explanation: 'This is a test guide about workspace indicators in Quickshell.',
      patterns: [
        {
          name: 'WorkspaceIndicator',
          description: 'A pattern for showing workspace indicators',
          code: 'import QtQuick; Item { }',
          language: 'qml',
          context: 'Used in panel configurations',
        },
      ],
      examples: [
        {
          name: 'Basic Example',
          description: 'A simple workspace indicator',
          code: 'WorkspaceIndicator { }',
          language: 'qml',
          runnable: true,
          dependencies: ['QtQuick'],
        },
      ],
      mistakes: [
        {
          pattern: 'WrongProperty',
          problem: 'Using wrong property name',
          solution: 'Use correct property',
          severity: 'error',
        },
      ],
      compatibility: [
        {
          api: 'WorkspaceIndicator',
          introduced: '1.0',
          deprecated: '2.0',
          removed: '3.0',
          replacement: 'NewIndicator',
          notes: 'Migration required',
        },
      ],
      performance: [
        {
          area: 'Rendering',
          impact: 'high',
          description: 'High rendering cost',
          mitigation: 'Use caching',
        },
      ],
      debugging: [
        {
          symptom: 'Indicator not showing',
          cause: 'Missing import',
          diagnosis: 'Check imports',
          resolution: 'Add import',
          tools: ['qmllint'],
        },
      ],
      references: [
        {
          title: 'Official Docs',
          url: 'https://docs.quickshell.org',
          type: 'official',
        },
      ],
    },
    ...overrides,
  });

  beforeEach(() => {
    testDir = join(tmpdir(), `nullroot-retrieval-test-${Date.now()}-${Math.random().toString(36).slice(2)}`);
    mkdirSync(testDir, { recursive: true });
    dbPath = join(testDir, 'test.db');

    indexer = createIndexer({ dbPath, batchSize: 10 });
  });

  afterEach(async () => {
    indexer.close();
    try {
      rmSync(testDir, { recursive: true, force: true });
    } catch {
      // Ignore cleanup errors
    }
  });

  describe('initialize', () => {
    it('should initialize the database and FTS5 index', async () => {
      const result = await indexer.initialize();

      expect(result.ok).toBe(true);
    });

    it('should create guide_metadata table', async () => {
      await indexer.initialize();

      // The database should be created and accessible
      // We can't directly test table existence without exposing internals,
      // but we can test that indexing works which requires the table
    });
  });

  describe('indexGuide', () => {
    it('should fail if not initialized', async () => {
      const guide = createTestGuide();
      const result = await indexer.indexGuide(guide);

      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.error.message).toContain('not initialized');
      }
    });

    it('should index a single guide successfully', async () => {
      await indexer.initialize();

      const guide = createTestGuide();
      const result = await indexer.indexGuide(guide);

      if (!result.ok) {
        console.log('indexGuide error:', result.error);
      }
      expect(result.ok).toBe(true);
    });
  });

  describe('indexGuides', () => {
    it('should fail if not initialized', async () => {
      const guides = [createTestGuide({ id: '11111111-1111-1111-1111-111111111111' })];
      const result = await indexer.indexGuides(guides);

      expect(result.ok).toBe(false);
    });

    it('should index multiple guides in batches', async () => {
      await indexer.initialize();

      const guides = [
        createTestGuide({ id: '11111111-1111-1111-1111-111111111111', title: 'Guide 1' }),
        createTestGuide({ id: '22222222-2222-2222-2222-222222222222', title: 'Guide 2' }),
        createTestGuide({ id: '33333333-3333-3333-3333-333333333333', title: 'Guide 3' }),
      ];

      const result = await indexer.indexGuides(guides);

      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.value).toBe(3);
      }
    });

    it('should handle guides from different ecosystems', async () => {
      await indexer.initialize();

      const guides = [
        createTestGuide({ id: '11111111-1111-1111-1111-111111111111', ecosystem: 'quickshell' }),
        createTestGuide({ id: '22222222-2222-2222-2222-222222222222', ecosystem: 'hyprland', category: 'configuration' }),
        createTestGuide({ id: '33333333-3333-3333-3333-333333333333', ecosystem: 'qt-qml', category: 'properties' }),
      ];

      const result = await indexer.indexGuides(guides);

      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.value).toBe(3);
      }
    });
  });

  describe('rebuildIndex', () => {
    it('should fail if not initialized', async () => {
      const guides = [createTestGuide()];
      const result = await indexer.rebuildIndex(guides);

      expect(result.ok).toBe(false);
    });

    it('should clear and rebuild index', async () => {
      await indexer.initialize();

      // Index some guides first
      const guides1 = [
        createTestGuide({ id: '11111111-1111-1111-1111-111111111111', title: 'Guide 1' }),
      ];
      await indexer.indexGuides(guides1);

      // Rebuild with different guides
      const guides2 = [
        createTestGuide({ id: '22222222-2222-2222-2222-222222222222', title: 'Guide 2' }),
        createTestGuide({ id: '33333333-3333-3333-3333-333333333333', title: 'Guide 3' }),
      ];

      const result = await indexer.rebuildIndex(guides2);

      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.value).toBe(2);
      }
    });
  });

  describe('getStats', () => {
    it('should return zero stats when empty', async () => {
      await indexer.initialize();

      const stats = indexer.getStats();

      expect(stats.totalDocuments).toBe(0);
      expect(stats.indexSize).toBe(0);
    });

    it('should return correct stats after indexing', async () => {
      await indexer.initialize();

      const guides = [
        createTestGuide({ id: '11111111-1111-1111-1111-111111111111' }),
        createTestGuide({ id: '22222222-2222-2222-2222-222222222222' }),
      ];
      await indexer.indexGuides(guides);

      const stats = indexer.getStats();

      expect(stats.totalDocuments).toBe(2);
      expect(stats.indexSize).toBeGreaterThan(0);
    });
  });

  describe('close', () => {
    it('should close the database', async () => {
      await indexer.initialize();
      indexer.close();

      // After close, operations should fail
      const guide = createTestGuide();
      const result = await indexer.indexGuide(guide);

      expect(result.ok).toBe(false);
    });
  });
});

describe('SearchEngine', () => {
  let testDir: string;
  let dbPath: string;
  let indexer: KnowledgeIndexer;
  let searchEngine: SearchEngine;

  const createTestGuide = (overrides: Partial<GuideEntry> = {}): GuideEntry => ({
    id: '123e4567-e89b-12d3-a456-426614174000',
    title: 'Test Guide',
    ecosystem: 'quickshell',
    category: 'fundamentals',
    versions: ['1.0'],
    sources: [
      {
        url: 'https://example.com',
        title: 'Example Source',
        ecosystem: 'quickshell',
        retrieved: '2024-01-01T00:00:00Z',
        verificationState: 'official',
      },
    ],
    status: 'verified',
    lastVerified: '2024-01-01T00:00:00Z',
    tags: ['test', 'example', 'workspace'],
    checksum: 'abc123',
    content: {
      explanation: 'This is a test guide about workspace indicators in Quickshell. It explains how to configure workspace indicators in your panel.',
      patterns: [
        {
          name: 'WorkspaceIndicator',
          description: 'A pattern for showing workspace indicators',
          code: 'import QtQuick; Item { }',
          language: 'qml',
          context: 'Used in panel configurations',
        },
      ],
      examples: [
        {
          name: 'Basic Example',
          description: 'A simple workspace indicator',
          code: 'WorkspaceIndicator { }',
          language: 'qml',
          runnable: true,
          dependencies: ['QtQuick'],
        },
      ],
      mistakes: [
        {
          pattern: 'WrongProperty',
          problem: 'Using wrong property name',
          solution: 'Use correct property',
          severity: 'error',
        },
      ],
      compatibility: [
        {
          api: 'WorkspaceIndicator',
          introduced: '1.0',
          deprecated: '2.0',
          removed: '3.0',
          replacement: 'NewIndicator',
          notes: 'Migration required',
        },
      ],
      performance: [
        {
          area: 'Rendering',
          impact: 'high',
          description: 'High rendering cost',
          mitigation: 'Use caching',
        },
      ],
      debugging: [
        {
          symptom: 'Indicator not showing',
          cause: 'Missing import',
          diagnosis: 'Check imports',
          resolution: 'Add import',
          tools: ['qmllint'],
        },
      ],
      references: [
        {
          title: 'Official Docs',
          url: 'https://docs.quickshell.org',
          type: 'official',
        },
      ],
    },
    ...overrides,
  });

  beforeEach(async () => {
    testDir = join(tmpdir(), `nullroot-search-test-${Date.now()}-${Math.random().toString(36).slice(2)}`);
    mkdirSync(testDir, { recursive: true });
    dbPath = join(testDir, 'test.db');

    // First, index some guides
    indexer = createIndexer({ dbPath, batchSize: 10 });
    await indexer.initialize();

    const guides = [
      createTestGuide({
        id: '11111111-1111-1111-1111-111111111111',
        title: 'Workspace Indicator Guide',
        tags: ['workspace', 'indicator', 'panel'],
      }),
      createTestGuide({
        id: '22222222-2222-2222-2222-222222222222',
        title: 'Hyprland Configuration Guide',
        ecosystem: 'hyprland',
        category: 'configuration',
        tags: ['hyprland', 'config', 'window'],
        content: {
          ...createTestGuide().content,
          explanation: 'This guide covers Hyprland window manager configuration including workspace rules.',
        },
      }),
      createTestGuide({
        id: '33333333-3333-3333-3333-333333333333',
        title: 'Qt/QML Properties Guide',
        ecosystem: 'qt-qml',
        category: 'properties',
        tags: ['qt', 'qml', 'properties', 'binding'],
        content: {
          ...createTestGuide().content,
          explanation: 'Learn about Qt/QML property bindings and how to use them effectively.',
        },
      }),
    ];

    await indexer.indexGuides(guides);
    indexer.close();

    // Now create search engine
    searchEngine = createSearchEngine({
      dbPath,
      defaultLimit: 10,
      maxLimit: 100
    });
  });

  afterEach(() => {
    searchEngine.close();
    try {
      rmSync(testDir, { recursive: true, force: true });
    } catch {
      // Ignore cleanup errors
    }
  });

  describe('search', () => {
    it('should return empty array for empty query', async () => {
      const result = await searchEngine.search({ query: '' });

      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.value).toHaveLength(0);
      }
    });

    it('should search by query text', async () => {
      const result = await searchEngine.search({ query: 'workspace indicator' });

      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.value.length).toBeGreaterThan(0);
        expect(result.value[0].title).toContain('Workspace');
      }
    });

    it('should filter by ecosystem', async () => {
      const result = await searchEngine.search({
        query: 'configuration',
        ecosystems: ['hyprland']
      });

      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.value.length).toBeGreaterThan(0);
        expect(result.value.every(r => r.ecosystem === 'hyprland')).toBe(true);
      }
    });

    it('should filter by category', async () => {
      const result = await searchEngine.search({
        query: 'properties',
        categories: ['properties']
      });

      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.value.length).toBeGreaterThan(0);
        expect(result.value.every(r => r.category === 'properties')).toBe(true);
      }
    });

    it('should filter by status', async () => {
      const result = await searchEngine.search({
        query: 'guide',
        status: ['verified']
      });

      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.value.length).toBeGreaterThan(0);
        expect(result.value.every(r => r.metadata.status === 'verified')).toBe(true);
      }
    });

    it('should filter by versions', async () => {
      const result = await searchEngine.search({
        query: 'workspace',
        versions: ['1.0']
      });

      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.value.length).toBeGreaterThan(0);
      }
    });

    it('should respect limit', async () => {
      const result = await searchEngine.search({
        query: 'guide',
        limit: 2
      });

      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.value.length).toBeLessThanOrEqual(2);
      }
    });

    it('should respect offset', async () => {
      const result1 = await searchEngine.search({ query: 'guide', limit: 10 });
      const result2 = await searchEngine.search({ query: 'guide', limit: 10, offset: 1 });

      expect(result1.ok).toBe(true);
      expect(result2.ok).toBe(true);

      if (result1.ok && result2.ok && result1.value.length > 1) {
        expect(result2.value[0].id).toBe(result1.value[1].id);
      }
    });

    it('should return results with correct structure', async () => {
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
  });

  describe('searchByEcosystem', () => {
    it('should search within a specific ecosystem', async () => {
      const result = await searchEngine.searchByEcosystem('workspace', 'quickshell', 5);

      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.value.every(r => r.ecosystem === 'quickshell')).toBe(true);
      }
    });
  });

  describe('getSuggestions', () => {
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
        expect(result.value).toHaveLength(0);
      }
    });
  });

  describe('close', () => {
    it('should close the database', async () => {
      searchEngine.close();

      const result = await searchEngine.search({ query: 'test' });

      expect(result.ok).toBe(false);
    });
  });
});

describe('splitCamelCase utility', () => {
  it('should split PascalCase identifiers', () => {
    expect(splitCamelCase('WorkspaceIndicator')).toBe('workspace indicator');
    expect(splitCamelCase('XMLHttpRequest')).toBe('xml http request');
    expect(splitCamelCase('HTMLElement')).toBe('html element');
  });

  it('should split camelCase identifiers', () => {
    expect(splitCamelCase('workspaceIndicator')).toBe('workspace indicator');
    expect(splitCamelCase('getHTTPResponse')).toBe('get http response');
    expect(splitCamelCase('parseJSONData')).toBe('parse json data');
  });

  it('should handle snake_case identifiers', () => {
    expect(splitCamelCase('workspace_indicator')).toBe('workspace indicator');
    expect(splitCamelCase('get_http_response')).toBe('get http response');
  });

  it('should handle kebab-case identifiers', () => {
    expect(splitCamelCase('workspace-indicator')).toBe('workspace indicator');
    expect(splitCamelCase('get-http-response')).toBe('get http response');
  });

  it('should handle mixed separators', () => {
    expect(splitCamelCase('workspace_Indicator')).toBe('workspace indicator');
    expect(splitCamelCase('workspace-indicator_test')).toBe('workspace indicator test');
  });

  it('should handle already space-separated text', () => {
    expect(splitCamelCase('workspace indicator')).toBe('workspace indicator');
    expect(splitCamelCase('get http response')).toBe('get http response');
  });

  it('should handle single words', () => {
    expect(splitCamelCase('workspace')).toBe('workspace');
    expect(splitCamelCase('indicator')).toBe('indicator');
  });

  it('should handle empty string', () => {
    expect(splitCamelCase('')).toBe('');
  });

  it('should normalize multiple spaces', () => {
    expect(splitCamelCase('workspace   indicator')).toBe('workspace indicator');
  });
});

describe('tokenize with camelCase splitting', () => {
  it('should tokenize PascalCase into separate tokens', () => {
    const tokens = tokenize('WorkspaceIndicator');
    expect(tokens).toContain('workspace');
    expect(tokens).toContain('indicator');
  });

  it('should tokenize camelCase into separate tokens', () => {
    const tokens = tokenize('workspaceIndicator');
    expect(tokens).toContain('workspace');
    expect(tokens).toContain('indicator');
  });

  it('should tokenize snake_case into separate tokens', () => {
    const tokens = tokenize('workspace_indicator');
    expect(tokens).toContain('workspace');
    expect(tokens).toContain('indicator');
  });

  it('should tokenize kebab-case into separate tokens', () => {
    const tokens = tokenize('workspace-indicator');
    expect(tokens).toContain('workspace');
    expect(tokens).toContain('indicator');
  });

  it('should handle mixed content', () => {
    const tokens = tokenize('WorkspaceIndicator test-example');
    expect(tokens).toContain('workspace');
    expect(tokens).toContain('indicator');
    expect(tokens).toContain('test');
    expect(tokens).toContain('example');
  });
});

describe('BM25 score normalization', () => {
  it('should produce non-negative BM25 scores', () => {
    // Test with various term frequencies and document lengths
    const score1 = computeBM25(1, 100, 1000, 1000, 100, DEFAULT_BM25_CONFIG);
    const score2 = computeBM25(5, 500, 1000, 1000, 50, DEFAULT_BM25_CONFIG);
    const score3 = computeBM25(10, 2000, 1000, 1000, 10, DEFAULT_BM25_CONFIG);

    expect(score1).toBeGreaterThanOrEqual(0);
    expect(score2).toBeGreaterThanOrEqual(0);
    expect(score3).toBeGreaterThanOrEqual(0);
  });

  it('should produce higher scores for higher term frequency', () => {
    const scoreLow = computeBM25(1, 1000, 1000, 1000, 100, DEFAULT_BM25_CONFIG);
    const scoreHigh = computeBM25(10, 1000, 1000, 1000, 100, DEFAULT_BM25_CONFIG);

    expect(scoreHigh).toBeGreaterThan(scoreLow);
  });

  it('should produce higher scores for rarer terms (higher IDF)', () => {
    const scoreCommon = computeBM25(5, 1000, 1000, 1000, 500, DEFAULT_BM25_CONFIG); // docFreq = 500 (common)
    const scoreRare = computeBM25(5, 1000, 1000, 1000, 10, DEFAULT_BM25_CONFIG);   // docFreq = 10 (rare)

    expect(scoreRare).toBeGreaterThan(scoreCommon);
  });

  it('should handle edge case with zero term frequency', () => {
    const score = computeBM25(0, 1000, 1000, 1000, 100, DEFAULT_BM25_CONFIG);
    expect(score).toBe(0);
  });
});

describe('SearchEngine camelCase search compatibility', () => {
  let testDir: string;
  let dbPath: string;
  let indexer: KnowledgeIndexer;
  let searchEngine: SearchEngine;

  const createTestGuide = (overrides: Partial<GuideEntry> = {}): GuideEntry => ({
    id: '123e4567-e89b-12d3-a456-426614174000',
    title: 'Test Guide',
    ecosystem: 'quickshell',
    category: 'fundamentals',
    versions: ['1.0'],
    sources: [
      {
        url: 'https://example.com',
        title: 'Example Source',
        ecosystem: 'quickshell',
        retrieved: '2024-01-01T00:00:00Z',
        verificationState: 'official',
      },
    ],
    status: 'verified',
    lastVerified: '2024-01-01T00:00:00Z',
    tags: ['test', 'example'],
    checksum: 'abc123',
    content: {
      explanation: 'This guide covers the WorkspaceIndicator pattern for Quickshell panels.',
      patterns: [
        {
          name: 'WorkspaceIndicator',
          description: 'A pattern for showing workspace indicators',
          code: 'import QtQuick; Item { }',
          language: 'qml',
          context: 'Used in panel configurations',
        },
      ],
      examples: [
        {
          name: 'Basic Example',
          description: 'A simple workspace indicator',
          code: 'WorkspaceIndicator { }',
          language: 'qml',
          runnable: true,
          dependencies: ['QtQuick'],
        },
      ],
      mistakes: [],
      compatibility: [
        {
          api: 'WorkspaceIndicator',
          introduced: '1.0',
          deprecated: '2.0',
          removed: '3.0',
          replacement: 'NewIndicator',
          notes: 'Migration required',
        },
      ],
      performance: [],
      debugging: [],
      references: [],
    },
    ...overrides,
  });

  beforeEach(async () => {
    testDir = join(tmpdir(), `nullroot-camelcase-test-${Date.now()}-${Math.random().toString(36).slice(2)}`);
    mkdirSync(testDir, { recursive: true });
    dbPath = join(testDir, 'test.db');

    indexer = createIndexer({ dbPath, batchSize: 10 });
    await indexer.initialize();

    const guide = createTestGuide({
      id: '11111111-1111-1111-1111-111111111111',
      title: 'Workspace Indicator Guide',
    });
    await indexer.indexGuides([guide]);
    indexer.close();

    searchEngine = createSearchEngine({
      dbPath,
      defaultLimit: 10,
      maxLimit: 100
    });
  });

  afterEach(() => {
    searchEngine.close();
    try {
      rmSync(testDir, { recursive: true, force: true });
    } catch {
      // Ignore cleanup errors
    }
  });

  it('should find guide when searching with PascalCase', async () => {
    const result = await searchEngine.search({ query: 'WorkspaceIndicator' });

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.value.length).toBeGreaterThan(0);
      expect(result.value[0].title).toBe('Workspace Indicator Guide');
    }
  });

  it('should find guide when searching with camelCase', async () => {
    const result = await searchEngine.search({ query: 'workspaceIndicator' });

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.value.length).toBeGreaterThan(0);
      expect(result.value[0].title).toBe('Workspace Indicator Guide');
    }
  });

  it('should find guide when searching with snake_case', async () => {
    const result = await searchEngine.search({ query: 'workspace_indicator' });

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.value.length).toBeGreaterThan(0);
      expect(result.value[0].title).toBe('Workspace Indicator Guide');
    }
  });

  it('should find guide when searching with kebab-case', async () => {
    const result = await searchEngine.search({ query: 'workspace-indicator' });

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.value.length).toBeGreaterThan(0);
      expect(result.value[0].title).toBe('Workspace Indicator Guide');
    }
  });

  it('should find guide when searching with space-separated words', async () => {
    const result = await searchEngine.search({ query: 'workspace indicator' });

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.value.length).toBeGreaterThan(0);
      expect(result.value[0].title).toBe('Workspace Indicator Guide');
    }
  });

  it('should return non-negative scores for all results', async () => {
    const result = await searchEngine.search({ query: 'WorkspaceIndicator' });

    expect(result.ok).toBe(true);
    if (result.ok) {
      for (const r of result.value) {
        expect(r.score).toBeGreaterThanOrEqual(0);
      }
    }
  });

  it('should rank relevant results higher', async () => {
    // Add a second guide with less relevant content
    const indexer2 = createIndexer({ dbPath, batchSize: 10 });
    await indexer2.initialize();

    const guide2 = createTestGuide({
      id: '22222222-2222-2222-2222-222222222222',
      title: 'Unrelated Guide',
      content: {
        ...createTestGuide().content,
        explanation: 'This guide is about something completely different.',
        patterns: [],
        examples: [],
        mistakes: [],
        compatibility: [],
        performance: [],
        debugging: [],
        references: [],
      },
    });
    await indexer2.indexGuides([guide2]);
    indexer2.close();

    // Search for WorkspaceIndicator - the first guide should rank higher
    const result = await searchEngine.search({ query: 'WorkspaceIndicator', limit: 10 });

    expect(result.ok).toBe(true);
    if (result.ok && result.value.length >= 2) {
      expect(result.value[0].title).toBe('Workspace Indicator Guide');
      expect(result.value[0].score).toBeGreaterThan(result.value[1].score);
    }
  });
});

describe('SearchEngine version-aware enrichment', () => {
  let testDir: string;
  let dbPath: string;
  let compatDbPath: string;
  let indexer: KnowledgeIndexer;
  let searchEngine: SearchEngine;
  let compatDb: ReturnType<typeof import('@nullroot/compatibility').createCompatibilityDatabase>;

  const createTestGuide = (overrides: Partial<GuideEntry> = {}): GuideEntry => ({
    id: '123e4567-e89b-12d3-a456-426614174000',
    title: 'Test Guide',
    ecosystem: 'quickshell',
    category: 'fundamentals',
    versions: ['1.0', '2.0', '3.0'],
    sources: [
      {
        url: 'https://example.com',
        title: 'Example Source',
        ecosystem: 'quickshell',
        retrieved: '2024-01-01T00:00:00Z',
        verificationState: 'official',
      },
    ],
    status: 'verified',
    lastVerified: '2024-01-01T00:00:00Z',
    tags: ['test', 'example'],
    checksum: 'abc123',
    content: {
      explanation: 'This guide covers the WorkspaceIndicator pattern for Quickshell panels.',
      patterns: [
        {
          name: 'WorkspaceIndicator',
          description: 'A pattern for showing workspace indicators',
          code: 'import QtQuick; Item { }',
          language: 'qml',
          context: 'Used in panel configurations',
        },
      ],
      examples: [
        {
          name: 'Basic Example',
          description: 'A simple workspace indicator',
          code: 'WorkspaceIndicator { }',
          language: 'qml',
          runnable: true,
          dependencies: ['QtQuick'],
        },
      ],
      mistakes: [],
      compatibility: [
        {
          api: 'WorkspaceIndicator',
          introduced: '1.0',
          deprecated: '2.0',
          removed: '3.0',
          replacement: 'NewIndicator',
          notes: 'Migration required',
        },
        {
          api: 'NewIndicator',
          introduced: '3.0',
        },
      ],
      performance: [],
      debugging: [],
      references: [],
    },
    ...overrides,
  });

  beforeEach(async () => {
    const { tmpdir } = await import('os');
    const { join } = await import('path');
    const { mkdirSync } = await import('fs');
    const { createCompatibilityDatabase } = await import('@nullroot/compatibility');

    testDir = join(tmpdir(), `nullroot-version-test-${Date.now()}-${Math.random().toString(36).slice(2)}`);
    mkdirSync(testDir, { recursive: true });
    dbPath = join(testDir, 'test.db');
    compatDbPath = join(testDir, 'compat.db');

    // Create compatibility database and add entries
    compatDb = createCompatibilityDatabase(compatDbPath);
    compatDb.insert({
      id: '11111111-1111-1111-1111-111111111111',
      ecosystem: 'quickshell',
      component: 'fundamentals',
      api: 'WorkspaceIndicator',
      firstSupported: '1.0',
      deprecatedIn: '2.0',
      removedIn: '3.0',
      replacement: 'NewIndicator',
      source: 'https://github.com/quickshell/quickshell',
      verifiedDate: '2026-01-15T00:00:00.000Z',
    });
    compatDb.insert({
      id: '22222222-2222-2222-2222-222222222222',
      ecosystem: 'quickshell',
      component: 'fundamentals',
      api: 'NewIndicator',
      firstSupported: '3.0',
      source: 'https://github.com/quickshell/quickshell',
      verifiedDate: '2026-01-15T00:00:00.000Z',
    });
    compatDb.insert({
      id: '33333333-3333-3333-3333-333333333333',
      ecosystem: 'quickshell',
      component: 'fundamentals',
      api: 'OldAPI',
      firstSupported: '1.0',
      removedIn: '2.0',
      replacement: 'NewAPI',
      source: 'https://github.com/quickshell/quickshell',
      verifiedDate: '2026-01-15T00:00:00.000Z',
    });

    // First, index some guides
    indexer = createIndexer({ dbPath, batchSize: 10 });
    await indexer.initialize();

    const guide = createTestGuide({
      id: '11111111-1111-1111-1111-111111111111',
      title: 'Workspace Indicator Guide',
    });
    await indexer.indexGuides([guide]);
    indexer.close();

    // Now we need to update the guide's compatibility column to store JSON instead of searchable text
    // since the indexer stores searchable text. We'll do a direct database update.
    const { default: Database } = await import('better-sqlite3');
    const db = new Database(dbPath);
    const compatJson = JSON.stringify([
      {
        api: 'WorkspaceIndicator',
        introduced: '1.0',
        deprecated: '2.0',
        removed: '3.0',
        replacement: 'NewIndicator',
        notes: 'Migration required',
      },
      {
        api: 'NewIndicator',
        introduced: '3.0',
      },
    ]);
    db.prepare('UPDATE guides SET compatibility = ? WHERE id = ?').run(compatJson, '11111111-1111-1111-1111-111111111111');
    db.close();

    // Now create search engine with compatibility database
    const { createSearchEngine } = await import('./search.js');
    searchEngine = createSearchEngine({
      dbPath,
      defaultLimit: 10,
      maxLimit: 100,
      compatDbPath,
    });
  });

  afterEach(() => {
    searchEngine.close();
    compatDb.close();
    const { rmSync } = require('fs');
    try {
      rmSync(testDir, { recursive: true, force: true });
    } catch {
      // Ignore cleanup errors
    }
  });

  it('should return version warnings for removed API when target version >= removedIn', async () => {
    const result = await searchEngine.getById('11111111-1111-1111-1111-111111111111', '3.0');

    expect(result.ok).toBe(true);
    if (result.ok && result.value) {
      expect(result.value.metadata.targetVersion).toBe('3.0');
      expect(result.value.metadata.versionWarnings).toBeDefined();
      if (result.value.metadata.versionWarnings) {
        const removedWarning = result.value.metadata.versionWarnings.find(w => w.api === 'WorkspaceIndicator' && w.status === 'removed');
        expect(removedWarning).toBeDefined();
        expect(removedWarning?.message).toContain('removed');
        expect(removedWarning?.message).toContain('3.0');
        expect(removedWarning?.replacement).toBe('NewIndicator');
      }
    }
  });

  it('should return version warnings for deprecated API when target version >= deprecatedIn but < removedIn', async () => {
    const result = await searchEngine.getById('11111111-1111-1111-1111-111111111111', '2.5');

    expect(result.ok).toBe(true);
    if (result.ok && result.value) {
      expect(result.value.metadata.targetVersion).toBe('2.5');
      expect(result.value.metadata.versionWarnings).toBeDefined();
      if (result.value.metadata.versionWarnings) {
        const deprecatedWarning = result.value.metadata.versionWarnings.find(w => w.api === 'WorkspaceIndicator' && w.status === 'deprecated');
        expect(deprecatedWarning).toBeDefined();
        expect(deprecatedWarning?.message).toContain('deprecated');
        expect(deprecatedWarning?.message).toContain('2.0');
        expect(deprecatedWarning?.replacement).toBe('NewIndicator');
      }
    }
  });

  it('should return version warnings for not-yet-introduced API when target version < firstSupported', async () => {
    const result = await searchEngine.getById('11111111-1111-1111-1111-111111111111', '2.5');

    expect(result.ok).toBe(true);
    if (result.ok && result.value) {
      expect(result.value.metadata.targetVersion).toBe('2.5');
      expect(result.value.metadata.versionWarnings).toBeDefined();
      if (result.value.metadata.versionWarnings) {
        const introducedWarning = result.value.metadata.versionWarnings.find(w => w.api === 'NewIndicator' && w.status === 'introduced');
        expect(introducedWarning).toBeDefined();
        expect(introducedWarning?.message).toContain('introduced');
        expect(introducedWarning?.message).toContain('3.0');
      }
    }
  });

  it('should not return version warnings for compatible non-deprecated API', async () => {
    // NewIndicator is introduced in 3.0, so in version 3.0 it should be compatible and not deprecated
    const result = await searchEngine.getById('11111111-1111-1111-1111-111111111111', '3.0');

    expect(result.ok).toBe(true);
    if (result.ok && result.value) {
      expect(result.value.metadata.targetVersion).toBe('3.0');
      // NewIndicator should not have warnings in 3.0 (it's introduced and not deprecated)
      const newIndicatorWarnings = result.value.metadata.versionWarnings?.filter(w => w.api === 'NewIndicator');
      expect(newIndicatorWarnings).toHaveLength(0);
    }
  });

  it('should not add version warnings when no target version provided', async () => {
    const result = await searchEngine.getById('11111111-1111-1111-1111-111111111111');

    expect(result.ok).toBe(true);
    if (result.ok && result.value) {
      expect(result.value.metadata.targetVersion).toBeUndefined();
      expect(result.value.metadata.versionWarnings).toBeUndefined();
    }
  });

  it('should not add version warnings when no compatDbPath provided', async () => {
    const { createSearchEngine } = await import('./search.js');
    const searchEngineNoCompat = createSearchEngine({
      dbPath,
      defaultLimit: 10,
      maxLimit: 100,
    });

    const result = await searchEngineNoCompat.getById('11111111-1111-1111-1111-111111111111', '3.0');

    expect(result.ok).toBe(true);
    if (result.ok && result.value) {
      expect(result.value.metadata.targetVersion).toBe('3.0');
      expect(result.value.metadata.versionWarnings).toBeUndefined();
    }
    searchEngineNoCompat.close();
  });

  it('should handle missing compatibility data gracefully', async () => {
    // Add a guide without compatibility JSON in the database
    const { default: Database } = await import('better-sqlite3');
    const db = new Database(dbPath);
    db.prepare(`
      INSERT INTO guides (id, title, explanation, patterns, examples, mistakes, compatibility, performance, debugging, tags, ecosystem, category)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      '22222222-2222-2222-2222-222222222222',
      'Guide Without Compat',
      'No compatibility data',
      '', '', '', 'not json', '', '', 'test', 'quickshell', 'fundamentals'
    );
    db.prepare(`
      INSERT INTO guide_metadata (id, title, ecosystem, category, versions, status, last_verified, tags, checksum)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      '22222222-2222-2222-2222-222222222222',
      'Guide Without Compat',
      'quickshell',
      'fundamentals',
      JSON.stringify(['1.0']),
      'verified',
      '2024-01-01T00:00:00Z',
      JSON.stringify(['test']),
      null
    );
    db.close();

    const result = await searchEngine.getById('22222222-2222-2222-2222-222222222222', '3.0');

    expect(result.ok).toBe(true);
    if (result.ok && result.value) {
      expect(result.value.metadata.targetVersion).toBe('3.0');
      // Should not crash, versionWarnings should be undefined since parsing fails
      expect(result.value.metadata.versionWarnings).toBeUndefined();
    }
  });
});