/**
 * @nullroot/cli - NRDG command-line interface
 */

import { Command } from 'commander';
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import chalk from 'chalk';
import { table } from 'table';
import ora from 'ora';
import { createSearchEngine, SearchEngine } from '@nullroot/retrieval';
import { createConfigManager } from '@nullroot/config';
import { getConfigPath, defaultConfig } from '@nullroot/core';
import type { SearchResult, Ecosystem } from '@nullroot/core';
import { generateClaudeCodeSkills, generateCodexSkills, getMCPTools } from '@nullroot/integrations';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const packageJson = JSON.parse(readFileSync(join(__dirname, '../package.json'), 'utf-8'));
const version = packageJson.version;

const program = new Command();

program
  .name('nrdg')
  .description('NullRoot Desktop Guidance - Offline-first developer intelligence platform')
  .version(version)
  .option('-c, --config <path>', 'Configuration file path')
  .option('--json', 'Output as JSON')
  .option('--no-color', 'Disable colored output');

// Helper functions
function getConfigPathFromOptions(options: { config?: string }): string {
  return options.config ?? getConfigPath();
}

function formatSearchResults(results: SearchResult[], options: { json?: boolean; color?: boolean }): string {
  if (options.json) {
    return JSON.stringify(results, null, 2);
  }

  if (results.length === 0) {
    return options.color ? chalk.yellow('No results found') : 'No results found';
  }

  const rows = [
    ['#', 'Title', 'Ecosystem', 'Category', 'Score', 'Tags'],
    ...results.map((r, i) => [
      String(i + 1),
      r.title,
      r.ecosystem,
      r.category,
      r.score.toFixed(2),
      r.metadata.tags.slice(0, 3).join(', ') + (r.metadata.tags.length > 3 ? '...' : ''),
    ]),
  ];

  return table(rows, {
    columns: {
      0: { alignment: 'right' },
      4: { alignment: 'right' },
    },
  });
}

async function handleSearch(query: string, options: {
  ecosystem?: string;
  limit?: string;
  json?: boolean;
  color?: boolean;
  config?: string;
}, command: Command): Promise<void> {
  // Get global options from parent program
  const globalOptions = command.parent?.opts() ?? {};
  const mergedOptions = { ...globalOptions, ...options };
  const configPath = getConfigPathFromOptions(mergedOptions);
  const configManager = createConfigManager(undefined, configPath);
  await configManager.load();
  const config = configManager.getConfig();

  const dataDir = config.dataDir ?? join(dirname(configPath), 'data');
  const dbPath = join(dataDir, 'guides.db');

  const searchEngine = createSearchEngine({
    dbPath,
    defaultLimit: config.retrieval.defaultLimit,
    maxLimit: config.retrieval.maxLimit,
  });

  const searchOptions: {
    query: string;
    ecosystems?: Ecosystem[];
    limit?: number;
  } = { query };

  if (options.ecosystem) {
    searchOptions.ecosystems = [options.ecosystem as Ecosystem];
  }

  if (options.limit) {
    searchOptions.limit = parseInt(options.limit, 10);
  }

  const spinner = ora('Searching...').start();
  const result = await searchEngine.search(searchOptions);
  spinner.stop();

  searchEngine.close();

  if (!result.ok) {
    console.error(mergedOptions.color ? chalk.red(`Error: ${result.error.message}`) : `Error: ${result.error.message}`);
    process.exit(1);
  }

  console.log(formatSearchResults(result.value, { json: mergedOptions.json, color: mergedOptions.color }));
}

async function handleRetrieve(id: string, options: {
  json?: boolean;
  color?: boolean;
  config?: string;
}, command: Command): Promise<void> {
  const globalOptions = command.parent?.opts() ?? {};
  const mergedOptions = { ...globalOptions, ...options };
  const configPath = getConfigPathFromOptions(mergedOptions);
  const configManager = createConfigManager(undefined, configPath);
  await configManager.load();
  const config = configManager.getConfig();

  const dataDir = config.dataDir ?? join(dirname(configPath), 'data');
  const dbPath = join(dataDir, 'guides.db');

  const searchEngine: SearchEngine = createSearchEngine({
    dbPath,
    defaultLimit: config.retrieval.defaultLimit,
    maxLimit: config.retrieval.maxLimit,
  });

  const spinner = ora('Retrieving guide...').start();
  const result = await searchEngine.getById(id);
  spinner.stop();

  searchEngine.close();

  if (!result.ok) {
    console.error(mergedOptions.color ? chalk.red(`Error: ${result.error.message}`) : `Error: ${result.error.message}`);
    process.exit(1);
  }

  const found = result.value;

  if (!found) {
    console.error(mergedOptions.color ? chalk.red(`Guide not found: ${id}`) : `Guide not found: ${id}`);
    process.exit(1);
  }

  if (mergedOptions.json) {
    console.log(JSON.stringify(found, null, 2));
  } else {
    const output = [
      chalk.bold(found.title),
      '',
      `ID: ${found.id}`,
      `Ecosystem: ${found.ecosystem}`,
      `Category: ${found.category}`,
      `Score: ${found.score.toFixed(2)}`,
      `Status: ${found.metadata.status}`,
      `Last Verified: ${found.metadata.lastVerified}`,
      `Versions: ${found.metadata.versions.join(', ')}`,
      `Tags: ${found.metadata.tags.join(', ')}`,
      '',
      'Snippet:',
      found.snippet,
    ].join('\n');
    console.log(output);
  }
}

async function handleInit(options: {
  json?: boolean;
  color?: boolean;
  config?: string;
}, command: Command): Promise<void> {
  const globalOptions = command.parent?.opts() ?? {};
  const mergedOptions = { ...globalOptions, ...options };
  const configPath = mergedOptions.config ?? getConfigPath();

  const configManager = createConfigManager(undefined, configPath);
  const result = await configManager.save();

  if (!result.ok) {
    console.error(mergedOptions.color ? chalk.red(`Error: ${result.error.message}`) : `Error: ${result.error.message}`);
    process.exit(1);
  }

  if (mergedOptions.json) {
    console.log(JSON.stringify({ configPath, config: defaultConfig }, null, 2));
  } else {
    console.log(mergedOptions.color
      ? chalk.green(`Configuration initialized at ${configPath}`)
      : `Configuration initialized at ${configPath}`);
  }
}

async function handleDetect(options: {
  json?: boolean;
  color?: boolean;
  config?: string;
}, command: Command): Promise<void> {
  const globalOptions = command.parent?.opts() ?? {};
  const mergedOptions = { ...globalOptions, ...options };
  // This is a placeholder for environment detection
  // In a real implementation, this would detect Hyprland, Quickshell, Qt, etc.
  const detectionResult = {
    timestamp: new Date().toISOString(),
    os: process.platform,
    nodeVersion: process.version,
    // These would be populated by actual detection logic
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

  if (mergedOptions.json) {
    console.log(JSON.stringify(detectionResult, null, 2));
  } else {
    console.log(mergedOptions.color ? chalk.bold('Environment Detection') : 'Environment Detection');
    console.log('');
    console.log(`OS: ${detectionResult.os}`);
    console.log(`Node: ${detectionResult.nodeVersion}`);
    console.log('');
    console.log(mergedOptions.color ? chalk.yellow('Note: Full environment detection not yet implemented') : 'Note: Full environment detection not yet implemented');
  }
}

async function handleSkills(type: string, options: {
  output?: string;
  json?: boolean;
  color?: boolean;
}, command: Command): Promise<void> {
  const globalOptions = command.parent?.opts() ?? {};
  const mergedOptions = { ...globalOptions, ...options };

  let outputContent: string;

  switch (type) {
    case 'claude-code':
      outputContent = generateClaudeCodeSkills();
      break;
    case 'codex':
      outputContent = generateCodexSkills();
      break;
    case 'mcp':
      outputContent = mergedOptions.json
        ? JSON.stringify(getMCPTools(), null, 2)
        : getMCPTools().map(t => `${t.name}: ${t.description}`).join('\n');
      break;
    default:
      console.error(mergedOptions.color ? chalk.red(`Unknown skill type: ${type}`) : `Unknown skill type: ${type}`);
      process.exit(1);
  }

  if (mergedOptions.json && type !== 'mcp') {
    // For claude-code and codex, wrap in JSON if requested
    console.log(JSON.stringify({ type, skills: outputContent }, null, 2));
  } else {
    console.log(outputContent);
  }

  if (options.output) {
    const fs = await import('fs');
    fs.writeFileSync(options.output, outputContent);
    console.error(mergedOptions.color ? chalk.green(`Skills written to ${options.output}`) : `Skills written to ${options.output}`);
  }
}

// Search command
program
  .command('search <query>')
  .description('Search knowledge base')
  .option('-e, --ecosystem <ecosystem>', 'Filter by ecosystem (quickshell, hyprland, qt-qml, lua, wayland, linux-desktop)')
  .option('-l, --limit <number>', 'Limit results', '10')
  .action(handleSearch);

// Retrieve command
program
  .command('retrieve <id>')
  .description('Retrieve specific guide by ID')
  .action(handleRetrieve);

// Init command
program
  .command('init')
  .description('Initialize project configuration')
  .action(handleInit);

// Detect command
program
  .command('detect')
  .description('Detect development environment')
  .action(handleDetect);

// Skills command
program
  .command('skills <type>')
  .description('Generate agent skills/workflows (claude-code, codex, mcp)')
  .option('-o, --output <path>', 'Write output to file')
  .action(handleSkills);

// Placeholder commands for future implementation
program
  .command('inspect [path]')
  .description('Inspect project structure')
  .action(() => {
    console.log('inspect command - TODO');
  });

program
  .command('audit [path]')
  .description('Run project diagnostics')
  .action(() => {
    console.log('audit command - TODO');
  });

program
  .command('compatibility <api>')
  .description('Check API compatibility')
  .option('-v, --version <version>', 'Target version')
  .action(() => {
    console.log('compatibility command - TODO');
  });

program
  .command('sources')
  .description('Manage knowledge sources')
  .action(() => {
    console.log('sources command - TODO');
  });

program
  .command('index')
  .description('Build search index')
  .action(() => {
    console.log('index command - TODO');
  });

program
  .command('eval')
  .description('Run evaluation benchmarks')
  .action(() => {
    console.log('eval command - TODO');
  });

program
  .command('doctor')
  .description('Health check')
  .action(() => {
    console.log('doctor command - TODO');
  });

program
  .command('mcp')
  .description('Start MCP server')
  .option('-p, --port <number>', 'Port number', '3000')
  .action(() => {
    console.log('mcp command - TODO');
  });

program.parse();