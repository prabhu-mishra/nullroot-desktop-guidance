/**
 * MCP (Model Context Protocol) integration
 */

export const MCP_TOOLS = [
  {
    name: 'search_guidance',
    description: 'Search the knowledge base for guidance',
    inputSchema: {
      type: 'object',
      properties: {
        query: { type: 'string', description: 'Search query' },
        ecosystems: { type: 'array', items: { type: 'string' }, description: 'Filter by ecosystem' },
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
    inputSchema: { type: 'object', properties: {} },
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

export function getMCPTools() {
  return MCP_TOOLS;
}