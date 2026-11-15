# NullRoot Desktop Guidance - Architecture Overview

## System Purpose

NullRoot Desktop Guidance (NRDG) is an offline-first developer intelligence platform that provides AI coding agents with reliable, version-aware technical knowledge and development tools for building Linux desktop environments and applications.

## Supported Ecosystems

1. **Quickshell** - QtQuick/QML-based desktop shell
2. **Hyprland** - Dynamic tiling Wayland compositor
3. **Qt6/QML** - Cross-platform application framework
4. **Lua** - Lightweight scripting language
5. **Wayland** - Display server protocol
6. **Linux Desktop** - D-Bus, systemd, PipeWire, NetworkManager, etc.

## High-Level Architecture

```
┌─────────────────────────────────────────────────────────────────────┐
│                         NRDG Platform                               │
├─────────────────────────────────────────────────────────────────────┤
│                                                                     │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐  ┌───────────┐  │
│  │   @nullroot │  │  @nullroot  │  │  @nullroot  │  │ @nullroot │  │
│  │    /core    │  │ /knowledge  │  │ /retrieval  │  │/compatibility│ │
│  │             │  │             │  │             │  │           │  │
│  │ - Types     │  │ - Schemas   │  │ - BM25      │  │ - DB      │  │
│  │ - Errors    │  │ - Registry  │  │ - FTS5      │  │ - Checker │  │
│  │ - Storage   │  │ - Loader    │  │ - Indexer   │  │ - Models  │  │
│  │ - Config    │  │ - Validator │  │ - Search    │  │           │  │
│  │ - Events    │  │             │  │             │  │           │  │
│  └──────┬──────┘  └──────┬──────┘  └──────┬──────┘  └─────┬─────┘  │
│         │                │                │               │        │
│         └────────────────┼────────────────┼───────────────┘        │
│                          ▼                                           │
│  ┌─────────────────────────────────────────────────────────────┐   │
│  │              @nullroot/shared (utilities)                   │   │
│  │  Result, Versioning, Paths, Checksums, Timing, Cloning     │   │
│  └─────────────────────────────────────────────────────────────┘   │
│                                                                     │
├─────────────────────────────────────────────────────────────────────┤
│                         Application Layer                          │
│  ┌─────────────────┐  ┌─────────────────┐  ┌──────────────────┐   │
│  │  @nullroot/analyzers    │  @nullroot/integrations  │  @nullroot/config    │   │
│  │  - quickshell           │  - claude-code           │  - Manager           │   │
│  │  - hyprland             │  - codex                 │  - Schema            │   │
│  │  - qml                  │  - mcp                   │                      │   │
│  │  - lua                  │                          │                      │   │
│  └─────────────────┘  └─────────────────┘  └──────────────────┘   │
│                                                                     │
├─────────────────────────────────────────────────────────────────────┤
│                         Entry Points                               │
│  ┌─────────────────┐  ┌─────────────────┐                         │
│  │   apps/cli      │  │ apps/mcp-server │                         │
│  │   (nrdg)        │  │ (MCP stdio)     │                         │
│  │   Commander.js  │  │ @modelcontext-  │                         │
│  │                 │  │ protocol/sdk    │                         │
│  └─────────────────┘  └─────────────────┘                         │
│                                                                     │
└─────────────────────────────────────────────────────────────────────┘
```

## Package Responsibilities

### @nullroot/core
**Foundation layer** - Shared types, error handling, storage abstraction, configuration, event system
- **Exports**: `Ecosystem`, `Category`, `VerificationStatus`, `GuideEntry`, `SearchResult`, `EnvironmentInfo`, `ProjectInfo`, `Diagnostic`, `CompatibilityResult`
- **Error classes**: `NullRootError`, `ConfigurationError`, `KnowledgeNotFoundError`, `SourceNotFoundError`, `IndexBuildError`, `SearchError`, `CompatibilityError`, `AnalyzerError`, `DetectionError`, `ValidationError`, `StorageError`, `IntegrationError`, `MCPError`
- **Storage**: SQLite abstraction with migrations, WAL mode, metadata table
- **Config**: Zod schema validation, default config, merge utilities
- **Events**: Typed event emitter for cross-package communication

### @nullroot/knowledge
**Knowledge engine** - Metadata schemas, source registry, guide loading, validation
- **Schemas**: Zod schemas for `GuideEntry`, `SourceReference`, `SearchOptions`, `SearchResult`
- **Registry**: Source manifest management with checksums
- **Loader**: Frontmatter parsing, guide discovery across ecosystems
- **Validator**: Guide validation with warnings for quality issues

### @nullroot/retrieval
**Search engine** - BM25 ranking, SQLite FTS5, hybrid search
- **BM25**: Configurable k1/b parameters, tokenization
- **FTS5**: Virtual table creation, insert/search/delete/optimize
- **Indexer**: Batch indexing, rebuild capability, statistics
- **Search**: Query with ecosystem/category/version filters, suggestions

### @nullroot/compatibility
**Version compatibility** - Structured database, API checking
- **Models**: `CompatibilityEntry` with firstSupported/deprecatedIn/removedIn/replacement
- **Database**: SQLite with indexes on ecosystem/component/api
- **Checker**: Single and batch compatibility queries with version comparison

### @nullroot/analyzers
**Project analysis** - Ecosystem-specific analyzers
- **QuickshellAnalyzer**: QML project discovery, qmllint/qmlformat/qmlimportscanner integration
- **HyprlandAnalyzer**: Config discovery, syntax validation, rule/binding checks
- **QMLAnalyzer**: qmllint/qmlformat/qmlimportscanner diagnostics parsing
- **LuaAnalyzer**: luac/luacheck syntax checking, module analysis

### @nullroot/integrations
**AI agent integration** - Skill generation for Claude Code, Codex, MCP
- **Claude Code**: Skill frontmatter generation with tool declarations
- **Codex**: Skill prompt generation
- **MCP**: Tool definitions for `search_guidance`, `retrieve_guide`, `detect_environment`, `inspect_project`, `run_diagnostics`, `check_compatibility`

### @nullroot/config
**Configuration management** - File-based config with validation
- **Manager**: Load/save/get/set with dot-notation paths
- **Schema**: Zod-validated config file format

### @nullroot/shared
**Utilities** - Result type, version comparison, path manipulation, checksums, timing

## Data Flow

```
Knowledge Ingestion:
┌─────────────┐    ┌──────────────┐    ┌─────────────┐    ┌──────────────┐    ┌────────────┐
│   Sources   │───▶│  Ingestion   │───▶│  Validation │───▶│   Registry   │───▶│  Indexing  │
│ (official,  │    │  (frontmatter│    │  (Zod +     │    │  (manifests, │    │ (FTS5 +    │
│  community) │    │   parsing)   │    │   warnings) │    │  checksums)  │    │  BM25)     │
└─────────────┘    └──────────────┘    └─────────────┘    └──────────────┘    └────────────┘
                                                                                  │
                                                                                  ▼
User Query ──────────────────────────────────────────────────────────────▶ Search
    │                                                                         │
    │    ┌──────────────┐    ┌─────────────┐    ┌──────────────┐            │
    └───▶│  Search API  │───▶│  FTS5 Query │───▶│  BM25 Rank   │────────────┘
         │ (filters,    │    │  (MATCH)    │    │  + Filters   │
         │  pagination) │    └─────────────┘    └──────────────┘
         └──────────────┘              │
                                       ▼
                              ┌──────────────┐
                              │   Results    │
                              │ (snippets,   │
                              │  scores,     │
                              │  metadata)   │
                              └──────────────┘

Agent Integration:
┌──────────┐    ┌──────────────┐    ┌─────────────┐    ┌──────────────┐
│  Agent   │───▶│  MCP Server  │───▶│  Retrieval  │───▶│  Knowledge   │
│ (Claude, │    │  (tools)     │    │  Engine     │    │  Base        │
│  Codex)  │    └──────────────┘    └─────────────┘    └──────────────┘
    │
    │    ┌──────────────┐    ┌─────────────┐
    └───▶│  Skills      │───▶│  Project    │
         │ (prompts,    │    │  Analyzers  │
         │  tools)      │    └─────────────┘
         └──────────────┘
```

## Dependency Boundaries

```
Allowed dependencies (directed edges):
@nullroot/shared ◀── all packages
@nullroot/core ◀── @nullroot/knowledge, @nullroot/retrieval, @nullroot/compatibility, @nullroot/analyzers, @nullroot/integrations, @nullroot/config, apps/cli, apps/mcp-server
@nullroot/knowledge ◀── @nullroot/retrieval, @nullroot/integrations, @nullroot/analyzers
@nullroot/retrieval ◀── @nullroot/integrations, apps/cli, apps/mcp-server
@nullroot/compatibility ◀── @nullroot/integrations, apps/cli, apps/mcp-server
@nullroot/analyzers ◀── @nullroot/integrations, apps/cli
@nullroot/integrations ◀── apps/cli, apps/mcp-server
@nullroot/config ◀── all packages (for reading config)

Forbidden:
- Circular dependencies
- Apps depending on each other
- Packages depending on apps
- Direct filesystem access in core packages (use storage abstraction)
```

## Offline-First Design Principles

1. **No mandatory network calls** - All core functionality works without internet
2. **Local SQLite database** - Embedded, no external database server
3. **Optional semantic retrieval** - Local embedding providers only (ONNX, Transformers.js, llama.cpp)
4. **Cached knowledge** - Guides stored locally after ingestion
5. **Graceful degradation** - Missing tools produce warnings, not errors

## Security Model

1. **Read-only project scanning** - No file modification by default
2. **Explicit approval** - System-changing operations require confirmation
3. **No telemetry** - No automatic data collection
4. **No arbitrary execution** - Project scripts never executed
5. **Secret redaction** - Sensitive data filtered from diagnostics
6. **Directory boundaries** - Respects project root, no traversal above
7. **Input validation** - All external input validated with Zod

## Extension Points

1. **New analyzers** - Implement `Analyzer` interface
2. **New ecosystems** - Add to `Ecosystem` type, create categories, schemas
3. **Custom retrieval** - Extend `SearchEngine` with semantic providers
4. **MCP tools** - Add tool definitions in `@nullroot/integrations/src/mcp.ts`
5. **CLI commands** - Add Commander.js commands in `apps/cli/src/cli.ts`