# NullRoot Desktop Guidance

**Offline-first developer intelligence platform for Linux desktop development**

NullRoot Desktop Guidance (NRDG) provides AI coding agents with reliable, version-aware technical knowledge and development tools for building Linux desktop environments and applications.

## Supported Ecosystems

- **Quickshell** - QtQuick/QML-based desktop shell
- **Hyprland** - Dynamic tiling Wayland compositor
- **Qt6 / QML** - Cross-platform application framework
- **Lua** - Lightweight scripting language
- **Wayland** - Display server protocol
- **Linux Desktop** - D-Bus, systemd, PipeWire, NetworkManager, and more

## AI Integrations

- **Claude Code** - Dedicated skills for each ecosystem
- **OpenAI Codex CLI** - Compatible skill packages
- **MCP Server** - Optional Model Context Protocol server

## Architecture

```
nullroot-desktop-guidance/
├── apps/
│   ├── cli/           # nrdg command-line interface
│   └── mcp-server/    # Optional MCP server
├── packages/
│   ├── core/          # Shared TypeScript architecture
│   ├── knowledge/     # Knowledge engine and metadata
│   ├── retrieval/     # BM25, SQLite FTS5, semantic search
│   ├── compatibility/ # Version compatibility database
│   ├── analyzers/     # Project analyzers (QML, Hyprland, Lua)
│   ├── integrations/  # AI agent integrations
│   ├── config/        # Configuration management
│   └── shared/        # Shared utilities
├── skills/
│   ├── claude-code/   # Claude Code skills
│   └── codex/         # Codex CLI skills
├── knowledge/         # Structured knowledge base
├── sources/           # Source manifests and ingestion
├── schemas/           # Zod validation schemas
├── evals/             # Evaluation framework
└── tests/             # Unit and integration tests
```

## Quick Start

```bash
# Install dependencies
pnpm install

# Build all packages
pnpm build

# Run tests
pnpm test

# Use the CLI
pnpm cli --help
```

## CLI Commands

| Command | Description |
|---------|-------------|
| `nrdg init` | Initialize project configuration |
| `nrdg detect` | Detect development environment |
| `nrdg search` | Search knowledge base |
| `nrdg retrieve` | Retrieve specific guide |
| `nrdg inspect` | Inspect project structure |
| `nrdg audit` | Run project diagnostics |
| `nrdg compatibility` | Check API compatibility |
| `nrdg sources` | Manage knowledge sources |
| `nrdg index` | Build search index |
| `nrdg eval` | Run evaluation benchmarks |
| `nrdg doctor` | Health check |
| `nrdg mcp` | Start MCP server |

## Development

### Prerequisites

- Node.js >= 22.0.0
- pnpm >= 9.15.0
- SQLite3 (for retrieval engine)

### Package Structure

Each package follows this structure:

```
packages/<name>/
├── src/
│   ├── index.ts          # Public exports
│   └── ...
├── tests/
├── package.json
├── tsconfig.json
└── vitest.config.ts
```

### Running Tests

```bash
# All tests
pnpm test

# Specific package
pnpm --filter @nullroot/core test

# Watch mode
pnpm --filter @nullroot/core test:watch
```

## Knowledge Engine

Every guide includes structured metadata:

- Unique ID
- Title and ecosystem
- Category and tags
- Supported versions
- Official source references
- Verification status
- Last verified date
- Content checksum

Verification statuses: `verified`, `reviewed`, `community`, `unverified`, `deprecated`

## Retrieval Engine

- **Offline-first**: SQLite FTS5 + BM25 ranking
- **Filters**: Ecosystem, version, category
- **Optional**: Local semantic embeddings
- **Hybrid**: Keyword + semantic ranking
- **Deduplication**: Source attribution

## License

MIT License - see [LICENSE](LICENSE) for details.

Third-party content and dependencies subject to their respective licenses.

## Contributing

See [CONTRIBUTING.md](CONTRIBUTING.md) for development guidelines.

## Project Status

**Phase 0**: Research and Architecture (In Progress)

See [CHANGELOG.md](CHANGELOG.md) for version history.