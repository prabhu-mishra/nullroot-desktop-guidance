# Package Responsibilities

## Overview

This document defines the explicit responsibilities, ownership, and boundaries for each package in the NRDG monorepo.

## Package Catalog

| Package | Scope | Owner | Stability |
|---------|-------|-------|-----------|
| `@nullroot/core` | Foundation types, errors, storage, config, events | Team Lead | Stable |
| `@nullroot/knowledge` | Knowledge schemas, registry, loader, validator | Agent 2 | Stable |
| `@nullroot/retrieval` | BM25, FTS5, indexer, search engine | Agent 4 | Stable |
| `@nullroot/compatibility` | Compatibility DB, models, checker | Agent 3 | Stable |
| `@nullroot/analyzers` | Project analyzers (quickshell, hyprland, qml, lua) | Agent 4 | Evolving |
| `@nullroot/integrations` | AI agent integrations (Claude, Codex, MCP) | Agent 5 | Evolving |
| `@nullroot/config` | Configuration management | Agent 3 | Stable |
| `@nullroot/shared` | Shared utilities | Team Lead | Stable |

---

## @nullroot/core

### Responsibilities
- **Type Definitions**: All cross-package types (`Ecosystem`, `Category`, `GuideEntry`, `SearchResult`, `EnvironmentInfo`, `ProjectInfo`, `Diagnostic`, `CompatibilityResult`)
- **Error Hierarchy**: Domain-specific error classes with codes and context
- **Storage Abstraction**: SQLite wrapper with migrations, WAL mode, metadata table
- **Configuration Schema**: Zod schema for NRDG config, validation, defaults, merging
- **Event System**: Typed event emitter for cross-package communication

### Public API
```typescript
// Types
export type { Ecosystem, Category, VerificationStatus, GuideEntry, SearchResult, SearchOptions, DiagnosticSeverity, Diagnostic, EnvironmentInfo, ProjectInfo, ProjectFile, ProjectDependency, CompatibilityResult };

// Errors
export { NullRootError, ConfigurationError, KnowledgeNotFoundError, SourceNotFoundError, IndexBuildError, SearchError, CompatibilityError, AnalyzerError, DetectionError, ValidationError, StorageError, IntegrationError, MCPError, isNullRootError, getErrorCode, getErrorContext };

// Storage
export { Storage, createStorage, type StorageConfig, type Migration };

// Config
export { NRDGConfigSchema, type NRDGConfig, defaultConfig, validateConfig, mergeConfig, getConfigPath };

// Events
export { EventEmitter, globalEvents, type EventName, type EventMap };
```

### Ownership Rules
- **Only Team Lead** modifies type definitions
- **All packages** depend on core types
- **No external dependencies** except `zod`, `better-sqlite3`, `@nullroot/shared`

---

## @nullroot/knowledge

### Responsibilities
- **Schemas**: Zod schemas for `GuideEntry`, `SourceReference`, `SearchOptions`, `SearchResult`, content structures
- **Registry**: Source manifest registration, lookup by ecosystem
- **Loader**: Filesystem scanning, frontmatter parsing, guide validation
- **Validator**: Guide validation with warnings for quality issues

### Public API
```typescript
// Schemas
export { GuideEntrySchema, SourceReferenceSchema, SearchOptionsSchema, SearchResultSchema, validateGuideEntry, validateSearchOptions, validateSourceReference };
export type { GuideEntry, SourceReference, SearchOptions, SearchResult, ImplementationPattern, CodeExample, CommonMistake, CompatibilityNote, PerformanceConsideration, DebuggingGuidance, Reference, GuideContent };

// Registry
export { SourceRegistry, sourceRegistry, createSourceManifest, type SourceManifest };

// Loader
export { KnowledgeLoader, createLoader, type LoaderConfig };

// Validator
export { KnowledgeValidator, knowledgeValidator, type ValidationResult };
```

### Ownership Rules
- **Agent 2** owns all knowledge engine code
- **Agent 1 (Research)** provides guides but doesn't modify loader/validator
- **@nullroot/retrieval** depends on knowledge for GuideEntry type

---

## @nullroot/retrieval

### Responsibilities
- **BM25**: Pure BM25 implementation with configurable parameters
- **FTS5**: SQLite FTS5 virtual table management
- **Indexer**: Batch indexing, incremental updates, rebuild, statistics
- **Search**: Query execution with filters, ranking, pagination, suggestions

### Public API
```typescript
// BM25
export { computeBM25, tokenize, DEFAULT_BM25_CONFIG, type BM25Config };

// FTS5
export { FTS5Index, createFTS5Index, type FTS5Config };

// Indexer
export { KnowledgeIndexer, createIndexer, type IndexerConfig };

// Search
export { SearchEngine, createSearchEngine, type SearchEngineConfig };
```

### Ownership Rules
- **Agent 4** owns retrieval engine
- **No direct filesystem access** - uses storage abstraction from core
- **@nullroot/integrations**, **apps/cli**, **apps/mcp-server** depend on search

---

## @nullroot/compatibility

### Responsibilities
- **Models**: Compatibility entry schema with version tracking
- **Database**: SQLite schema, indexes, CRUD operations
- **Checker**: Version comparison logic, single/batch queries

### Public API
```typescript
// Models
export { CompatibilityEntrySchema, CompatibilityQuerySchema, type CompatibilityEntry, type CompatibilityQuery };

// Database
export { CompatibilityDatabase, createCompatibilityDatabase };

// Checker
export { CompatibilityChecker, createCompatibilityChecker };
```

### Ownership Rules
- **Agent 3** owns compatibility engine
- **Version comparison** uses `@nullroot/shared` utilities
- **@nullroot/integrations**, **apps/cli**, **apps/mcp-server** depend on checker

---

## @nullroot/analyzers

### Responsibilities
- **Analyzer Interface**: Common `Analyzer` interface for all ecosystems
- **QuickshellAnalyzer**: QML project discovery, import resolution, qmllint/qmlformat/qmlimportscanner integration
- **HyprlandAnalyzer**: Config discovery, syntax validation, rule/binding checks
- **QMLAnalyzer**: qmllint/qmlformat/qmlimportscanner diagnostics parsing
- **LuaAnalyzer**: luac/luacheck syntax checking, module analysis

### Public API
```typescript
// Types
export { type Analyzer, type AnalyzerResult, type AnalyzerConfig };

// Analyzers
export { QuickshellAnalyzer, quickshellAnalyzer };
export { HyprlandAnalyzer, hyprlandAnalyzer };
export { QMLAnalyzer, qmlAnalyzer };
export { LuaAnalyzer, luaAnalyzer };
```

### Ownership Rules
- **Agent 4** owns all analyzers
- **Each analyzer** is independently runnable
- **Tools integration** (qmllint, luacheck) is best-effort with graceful degradation
- **@nullroot/integrations**, **apps/cli** depend on analyzers

---

## @nullroot/integrations

### Responsibilities
- **Claude Code Skills**: Skill generation with frontmatter and tool declarations
- **Codex Skills**: Prompt generation for Codex CLI
- **MCP Tools**: Tool definitions for MCP server

### Public API
```typescript
// Claude Code
export { CLAUDE_CODE_SKILLS, generateClaudeCodeSkills, type ClaudeCodeSkill };

// Codex
export { CODEX_SKILLS, generateCodexSkills, type CodexSkill };

// MCP
export { MCP_TOOLS, getMCPTools };
```

### Ownership Rules
- **Agent 5** owns all integrations
- **Skill content** derived from knowledge base (not hardcoded)
- **MCP tool schemas** match CLI command contracts

---

## @nullroot/config

### Responsibilities
- **Schema**: Config file format with versioning
- **Manager**: Load/save/get/set with dot-notation paths

### Public API
```typescript
export { NRDGConfigSchema, type NRDGConfig, defaultConfig } from '@nullroot/core';
export { ConfigFileSchema, type ConfigFile };
export { ConfigManager, createConfigManager };
```

### Ownership Rules
- **Agent 3** owns config management
- **Schema** defined in core, re-exported here
- **All packages** can use config manager

---

## @nullroot/shared

### Responsibilities
- **Result Type**: `Result<T, E>` with `ok`/`err` constructors and helpers
- **Version Comparison**: Semver parsing, comparison, range satisfaction
- **Path Utilities**: Normalize, join, slugify
- **String Utilities**: Truncate, pick, omit, deepClone
- **Checksum**: SHA-256 computation
- **Timing**: Sync/async performance measurement

### Public API
```typescript
// Result
export type { Result };
export { ok, err, isOk, isErr, tryAsync };

// Version
export { compareVersions, satisfiesVersion };

// Path
export { normalizePath, joinPaths };

// String
export { slugify, truncate };

// Object
export { pick, omit, deepClone };

// Crypto
export { computeChecksum };

// Timing
export { measureTime, measureTimeAsync };
```

### Ownership Rules
- **Team Lead** owns shared utilities
- **Zero dependencies** (stdlib only)
- **All packages** depend on shared
- **No types from other packages** imported here

---

## Dependency Graph

```
@nullroot/shared
    ▲
    │
@nullroot/core ◄──────────────────────────────────────┐
    ▲                                                │
    │                                                │
┌───┴───┐                    ┌───────────────────────┤
│       │                    │                       │
@nullroot/knowledge    @nullroot/config           │
    ▲                    ▲                        │
    │                    │                        │
┌───┴───┐         ┌──────┴──────┐                │
│       │         │             │                │
@nullroot/retrieval @nullroot/compatibility       │
    ▲                    ▲                        │
    │                    │                        │
┌───┴────────────────────┴────────────────────────┤
│                                               │
@nullroot/analyzers                               │
    ▲                                           │
    │                                           │
┌───┴───────────────────────────────────────────┤
│                                               │
@nullroot/integrations                          │
    ▲                                           │
    │                                           │
┌───┴───────────────────────────────────────────┤
│                                               │
apps/cli ◄──────────────────────────────────────┤
apps/mcp-server ◄───────────────────────────────┘
```

## Interface Contracts

### Package Boundaries
1. **No circular dependencies** - Enforced by TypeScript project references
2. **Public API only** - Internal implementation hidden in `src/` not exported
3. **Version coupling** - All packages versioned together in monorepo
4. **Breaking changes** - Require ADR and major version bump

### Testing Boundaries
- **Unit tests** test package in isolation (mock dependencies)
- **Integration tests** test cross-package workflows (in `tests/integration/`)
- **Contract tests** verify public API stability

### Documentation Requirements
Each package must maintain:
- `README.md` with purpose and usage
- `CHANGELOG.md` for package-level changes
- JSDoc for all public exports
- Example usage in docs