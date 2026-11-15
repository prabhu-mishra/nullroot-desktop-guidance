/**
 * @nullroot/mcp-server - NRDG Model Context Protocol server
 */

import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
  ErrorCode,
  McpError,
} from '@modelcontextprotocol/sdk/types.js';
import { dirname, join } from 'path';
import { createSearchEngine, SearchEngine } from '@nullroot/retrieval';
import { createConfigManager } from '@nullroot/config';
import { getConfigPath } from '@nullroot/core';
import type { SearchResult, Ecosystem, Category } from '@nullroot/core';

// Global search engine instance
let searchEngine: SearchEngine | null = null;

/**
 * Initialize the search engine with configuration
 */
async function initializeSearchEngine(): Promise<SearchEngine> {
  if (searchEngine) {
    return searchEngine;
  }

  const configPath = getConfigPath();
  const configManager = createConfigManager(undefined, configPath);
  await configManager.load();
  const config = configManager.getConfig();

  const dataDir = config.dataDir ?? join(dirname(configPath), 'data');
  const dbPath = join(dataDir, 'guides.db');

  searchEngine = createSearchEngine({
    dbPath,
    defaultLimit: config.retrieval.defaultLimit,
    maxLimit: config.retrieval.maxLimit,
  });

  return searchEngine;
}

/**
 * Format search results for MCP response
 */
function formatSearchResults(results: SearchResult[]): string {
  if (!results || results.length === 0) {
    return 'No results found.';
  }

  return results.map((r: SearchResult, i: number) => [
    `**${i + 1}. ${r.title}**`,
    `   ID: ${r.id}`,
    `   Ecosystem: ${r.ecosystem}`,
    `   Category: ${r.category}`,
    `   Score: ${r.score.toFixed(2)}`,
    `   Status: ${r.metadata.status}`,
    `   Tags: ${r.metadata.tags.join(', ')}`,
    `   Snippet: ${r.snippet}`,
    '',
  ].join('\n')).join('\n');
}

/**
 * Format a single guide for MCP response
 */
function formatGuide(guide: SearchResult | null): string {
  if (!guide) {
    return 'Guide not found.';
  }

  return [
    `**${guide.title}**`,
    '',
    `ID: ${guide.id}`,
    `Ecosystem: ${guide.ecosystem}`,
    `Category: ${guide.category}`,
    `Status: ${guide.metadata.status}`,
    `Last Verified: ${guide.metadata.lastVerified}`,
    `Versions: ${guide.metadata.versions.join(', ')}`,
    `Tags: ${guide.metadata.tags.join(', ')}`,
    '',
    '## Content',
    guide.snippet,
  ].join('\n');
}

// Tool definitions
const TOOLS = [
  {
    name: 'search_guidance',
    description: 'Search the knowledge base for guidance',
    inputSchema: {
      type: 'object',
      properties: {
        query: { type: 'string', description: 'Search query' },
        ecosystems: { type: 'array', items: { type: 'string' }, description: 'Filter by ecosystem (quickshell, hyprland, qt-qml, lua, wayland, linux-desktop)' },
        categories: { type: 'array', items: { type: 'string' }, description: 'Filter by category' },
        limit: { type: 'number', description: 'Maximum results', default: 10 },
      },
      required: ['query'],
    },
  },
  {
    name: 'retrieve_guide',
    description: 'Retrieve a specific guide by ID',
    inputSchema: {
      type: 'object',
      properties: {
        id: { type: 'string', description: 'Guide ID' },
      },
      required: ['id'],
    },
  },
  {
    name: 'detect_environment',
    description: 'Detect the development environment',
    inputSchema: {
      type: 'object',
      properties: {},
    },
  },
  {
    name: 'inspect_project',
    description: 'Inspect a project structure',
    inputSchema: {
      type: 'object',
      properties: {
        path: { type: 'string', description: 'Project path' },
      },
      required: ['path'],
    },
  },
  {
    name: 'run_diagnostics',
    description: 'Run diagnostics on a project',
    inputSchema: {
      type: 'object',
      properties: {
        path: { type: 'string', description: 'Project path' },
      },
      required: ['path'],
    },
  },
  {
    name: 'check_compatibility',
    description: 'Check API compatibility',
    inputSchema: {
      type: 'object',
      properties: {
        api: { type: 'string', description: 'API identifier' },
        version: { type: 'string', description: 'Target version' },
      },
      required: ['api'],
    },
  },
];

const server = new Server(
  {
    name: 'nullroot-desktop-guidance',
    version: '0.0.0',
  },
  {
    capabilities: {
      tools: {},
    },
  }
);

server.setRequestHandler(ListToolsRequestSchema, async () => {
  return { tools: TOOLS };
});

server.setRequestHandler(CallToolRequestSchema, async (request) => {
  const { name, arguments: args } = request.params;
  const a = args as Record<string, unknown> | undefined;

  try {
    switch (name) {
      case 'search_guidance': {
        const engine = await initializeSearchEngine();
        const result = await engine.search({
          query: (a?.['query'] as string) ?? '',
          ecosystems: a?.['ecosystems'] as Ecosystem[] | undefined,
          categories: a?.['categories'] as Category[] | undefined,
          limit: a?.['limit'] as number | undefined,
        });

        if (!result.ok) {
          throw new McpError(ErrorCode.InternalError, result.error.message);
        }

        return {
          content: [{ type: 'text', text: formatSearchResults(result.value) }],
        };
      }

      case 'retrieve_guide': {
        const engine = await initializeSearchEngine();
        const result = await engine.getById((a?.['id'] as string) ?? '');

        if (!result.ok) {
          throw new McpError(ErrorCode.InternalError, result.error.message);
        }

        if (!result.value) {
          throw new McpError(ErrorCode.InvalidParams, `Guide not found: ${a?.['id']}`);
        }

        return {
          content: [{ type: 'text', text: formatGuide(result.value) }],
        };
      }

      case 'detect_environment': {
        // Basic environment detection
        const detectionResult = {
          timestamp: new Date().toISOString(),
          os: process.platform,
          nodeVersion: process.version,
          hyprland: null,
          quickshell: null,
          qt: null,
          lua: null,
          tools: {
            qmllint: false,
            qmlformat: false,
            luacheck: false,
          },
          configPaths: {
            hyprland: null,
            quickshell: null,
          },
        };

        return {
          content: [{ type: 'text', text: JSON.stringify(detectionResult, null, 2) }],
        };
      }

      case 'inspect_project': {
        // Placeholder for project inspection
        return {
          content: [{ type: 'text', text: `Project inspection for ${a?.['path']} - Not yet implemented` }],
        };
      }

      case 'run_diagnostics': {
        // Placeholder for diagnostics
        return {
          content: [{ type: 'text', text: `Diagnostics for ${a?.['path']} - Not yet implemented` }],
        };
      }

      case 'check_compatibility': {
        // Placeholder for compatibility check
        return {
          content: [{ type: 'text', text: `Compatibility check for ${a?.['api']}@${a?.['version']} - Not yet implemented` }],
        };
      }

      default:
        throw new McpError(ErrorCode.MethodNotFound, `Unknown tool: ${name}`);
    }
  } catch (error) {
    if (error instanceof McpError) {
      throw error;
    }
    throw new McpError(ErrorCode.InternalError, `Tool execution failed: ${error instanceof Error ? error.message : String(error)}`);
  }
});

async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error('NRDG MCP Server running on stdio');
}

main().catch((error) => {
  console.error('MCP Server error:', error);
  process.exit(1);
});