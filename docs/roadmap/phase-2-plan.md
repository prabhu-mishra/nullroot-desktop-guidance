# Phase 2: Core Pipeline Hardening & Analyzer Foundation

**Status**: Planning  
**Target Duration**: 4-5 weeks  
**Dependencies**: Phase 1 (Milestone 1) complete - vertical slice validated

---

## Executive Summary

Phase 2 transforms the single-guide vertical slice into a production-ready knowledge platform supporting all 6 ecosystems with robust search, incremental indexing, project analyzers, and a complete MCP integration. The primary goal is delivering **end-to-end reliability** for AI agents using NRDG as their technical knowledge base.

---

## Milestone 2 Acceptance Criteria (from Phase 1 Plan)

| # | Criterion | Verification |
|---|-----------|--------------|
| 1 | **Multi-guide indexing** | `nrdg index` indexes 5+ guides across 2+ ecosystems |
| 2 | **Filtering works** | `nrdg search` with `--ecosystem`, `--category`, `--status` filters |
| 3 | **Incremental indexing** | Re-indexing unchanged guides is no-op (mtime/checksum) |
| 4 | **Error handling** | Invalid frontmatter → clear error, not crash |
| 5 | **MCP tools complete** | All 6 tools implemented (stubbed for non-retrieval) |
| 6 | **Tests per package** | Each package has unit tests, integration test for pipeline |

---

## Additional Phase 2 Features

Beyond the Milestone 2 criteria, Phase 2 delivers these foundational capabilities:

### 1. Project Analyzers (5 Ecosystems)
- **Hyprland/Hyprlang**: Config discovery, syntax validation, rule/binding checks
- **Quickshell/QML**: QML project discovery, import resolution, qmllint/qmlformat/qmlimportscanner integration
- **Qt6/QML**: Compatibility checking for Qt6 APIs, deprecation tracking
- **Lua**: luac/luacheck syntax checking, module analysis
- **Wayland/Linux Desktop**: D-Bus, systemd, PipeWire, NetworkManager detection

### 2. Compatibility Database
- Structured API compatibility data for all 6 ecosystems
- Version-aware guidance retrieval (filter guides by target version)
- Migration path suggestions for deprecated/removed APIs

### 3. Diagnostic Reporting
- Structured diagnostics with severity, location, explanation, fix
- qmllint/qmlformat/luacheck integration with parsed output
- Read-only guarantee (no writes without `--fix`)

### 4. Automated Evaluation Framework
- Benchmark tasks for agent effectiveness measurement
- CI integration for regression detection
- Reproducible evaluation runs

---

## Architecture Decisions for Phase 2

### ADR-0004: Incremental Indexing Strategy (NEW)
**Decision**: Use file mtime + content checksum for incremental indexing
- Store `checksum` in `guide_metadata` table
- On re-index: compare mtime first (fast), then checksum (definitive)
- Skip indexing if both match
- See `docs/adr/0004-incremental-indexing.md`

### ADR-0005: Analyzer Plugin Architecture (NEW)
**Decision**: Analyzers implement common `Analyzer` interface, registered via `@nullroot/analyzers`
- Each analyzer independently runnable
- Tool integration (qmllint, luacheck) is best-effort with graceful degradation
- Results normalized to `Diagnostic[]` format
- See `docs/adr/0005-analyzer-plugin-architecture.md`

### ADR-0006: Compatibility Database Versioning (NEW)
**Decision**: Compatibility entries track `firstSupported`, `deprecatedIn`, `removedIn`, `replacement`
- Semantic version comparison using `@nullroot/shared` utilities
- Queries support ecosystem/component/api/version filters
- Data sourced from official release notes + manual curation
- See `docs/adr/0006-compatibility-database-versioning.md`

### ADR-0007: Version-Aware Retrieval (NEW)
**Decision**: Filter search results by `versions` array in guide metadata
- Add `versions` filter to `SearchOptions` and MCP `search_guidance`
- Guides declare applicable versions in frontmatter
- Compatibility checker provides version-specific guidance
- See `docs/adr/0007-version-aware-retrieval.md`

---

## Package-Level Implementation Plan

### 1. @nullroot/knowledge - Enhanced Loading & Validation

**Current State**: Loader parses frontmatter + content, validator checks schema + warnings  
**Phase 2 Additions**:

| Feature | Description | Files |
|---------|-------------|-------|
| **Incremental load support** | Loader returns file mtime/checksum for indexer comparison | `loader.ts` |
| **Enhanced error context** | Validation errors include file path, line numbers | `validator.ts`, `schemas.ts` |
| **Multi-ecosystem loading** | `loadAllGuides()` works across all 6 ecosystems | `loader.ts` |
| **Guide discovery** | Find guides by ID, ecosystem, category | `loader.ts`, `registry.ts` |

**API Changes**:
```typescript
// loader.ts - new method
async loadGuideWithMetadata(filePath: string): Promise<Result<{ entry: GuideEntry; mtime: number; checksum: string }, Error>>

// validator.ts - enhanced error format
interface ValidationError {
  path: string;
  message: string;
  line?: number;      // NEW
  column?: number;    // NEW
  filePath?: string;  // NEW
}
```

---

### 2. @nullroot/retrieval - Incremental Indexing & Filtering

**Current State**: FTS5 + BM25 search, batch indexing, filtering by ecosystem/category/status/versions  
**Phase 2 Additions**:

| Feature | Description | Files |
|---------|-------------|-------|
| **Incremental indexing** | `indexGuidesIncremental(guides, existingChecksums)` | `indexer.ts` |
| **Checksum tracking** | Store/checksum in `guide_metadata` | `indexer.ts` |
| **Enhanced filtering** | Support all filter combinations, pagination | `search.ts` |
| **Search statistics** | Result counts, timing, index health | `search.ts`, `indexer.ts` |

**API Changes**:
```typescript
// indexer.ts - new methods
async indexGuidesIncremental(guides: GuideEntry[], existingChecksums: Map<string, string>): Promise<Result<{ indexed: number; skipped: number }, Error>>
async getExistingChecksums(): Promise<Map<string, string>>

// search.ts - enhanced
interface SearchOptions {
  // ... existing
  versions?: string[];        // Already supported
  status?: VerificationStatus[]; // Already supported
  // NEW: better filter combination handling
}
```

---

### 3. @nullroot/compatibility - Full Database & Checker

**Current State**: Schema + database + checker skeleton (no version comparison logic)  
**Phase 2 Additions**:

| Feature | Description | Files |
|---------|-------------|-------|
| **Version comparison** | Semver-aware `satisfiesVersion()` for compatibility | `checker.ts` |
| **Batch queries** | `checkMultiple()` with detailed results | `checker.ts` |
| **Seed data** | 50+ compatibility entries across ecosystems | `database.ts` (separate seed script) |
| **Migration suggestions** | Return replacement API + migration notes | `checker.ts` |

**API Changes**:
```typescript
// checker.ts - enhanced
check(ecosystem, component, api, version): Result<CompatibilityResult, Error>
checkMultiple(checks): Result<CompatibilityResult[], Error>

// NEW: Version-aware query
queryCompatibleAPIs(ecosystem: Ecosystem, version: string): CompatibilityEntry[]
```

**Seed Data Priority**:
1. Quickshell: Shell, Layer, WorkspaceIndicator, WindowTitle, SystemTray, Power, Hyprland services (15 APIs)
2. Hyprland: windowrulev2, animations, plugins, IPC, monitors, keybindings (12 APIs)
3. Qt/QML: Properties, Signals, Models, Lifecycle, QtQuick controls (10 APIs)
4. Lua: Coroutines, metatables, modules, stdlib (8 APIs)
5. Wayland: Core protocols, layer-shell, xdg-shell (5 APIs)
6. Linux Desktop: D-Bus, systemd, UPower, PipeWire, NetworkManager (8 APIs)

---

### 4. @nullroot/analyzers - Full Implementation

**Current State**: Interface + 4 stub analyzers (quickshell, hyprland, qml, lua)  
**Phase 2 Additions**:

| Analyzer | Capabilities | Tools |
|----------|--------------|-------|
| **QuickshellAnalyzer** | QML project discovery, import resolution, component structure | qmllint, qmlformat, qmlimportscanner |
| **HyprlandAnalyzer** | Config discovery, syntax validation, rule/binding checks, IPC validation | hyprctl (read-only) |
| **QMLAnalyzer** | qmllint/qmlformat/qmlimportscanner diagnostics parsing | qmllint, qmlformat, qmlimportscanner |
| **LuaAnalyzer** | luac syntax check, luacheck linting, module analysis | luac, luacheck |

**Implementation Approach**:
```typescript
// Each analyzer implements:
interface Analyzer {
  name: string;
  analyze(path: string): Promise<AnalyzerResult>;
  supports(ecosystem: Ecosystem): boolean;
}

// AnalyzerResult includes:
interface AnalyzerResult {
  project: ProjectInfo;
  diagnostics: Diagnostic[];
  metadata: Record<string, unknown>;
}

// Diagnostics normalized from tool output:
interface Diagnostic {
  severity: 'error' | 'warning' | 'info' | 'hint';
  code: string;           // e.g., "QML_UNRESOLVED_IMPORT"
  message: string;
  location: DiagnosticLocation;
  explanation?: string;
  fix?: string;
  references?: Reference[];
}
```

**Tool Integration Strategy**:
- Use `execa` for subprocess calls (already in deps via Commander.js)
- Parse tool output (JSON where available, regex fallback)
- Graceful degradation: missing tool → warning, not error
- Timeout: 30s per tool
- Read-only: never write files

---

### 5. @nullroot/integrations - Complete MCP & Skills

**Current State**: MCP tool definitions (6 tools), 2 implemented (search, retrieve); 4 stubbed  
**Phase 2 Additions**:

| Tool | Implementation | Dependencies |
|------|----------------|--------------|
| `search_guidance` | ✅ Done | retrieval |
| `retrieve_guide` | ✅ Done | retrieval |
| `detect_environment` | Full implementation | analyzers (detection) |
| `inspect_project` | Full implementation | analyzers |
| `run_diagnostics` | Full implementation | analyzers |
| `check_compatibility` | Full implementation | compatibility |

**Claude Code Skills**:
- Generate skills for all 6 ecosystems (not just quickshell)
- Include tool declarations matching MCP tools
- Derive skill content from knowledge base (not hardcoded)

**Codex Skills**:
- Prompt generation referencing ecosystem-specific guides
- Include diagnostic workflows

---

### 6. apps/cli - Full Command Implementation

**Current State**: search, retrieve, init, detect, skills implemented; inspect, audit, compatibility, sources, index, eval, doctor, mcp as placeholders  
**Phase 2 Additions**:

| Command | Implementation | Output |
|---------|----------------|--------|
| `nrdg index` | Incremental indexing with stats | JSON: indexed, skipped, duration, per-ecosystem stats |
| `nrdg inspect` | Project analysis via analyzers | JSON: ProjectInfo + diagnostics |
| `nrdg audit` | Run diagnostics (qmllint, luacheck, etc.) | JSON: summary + diagnostics |
| `nrdg compatibility` | API compatibility check | JSON: CompatibilityResult |
| `nrdg sources` | Source registry CRUD | JSON: source list/manifest |
| `nrdg eval` | Run evaluation benchmarks | JSON: results + summary |
| `nrdg doctor` | Health checks | JSON: checks array |
| `nrdg mcp` | Start MCP server (stdio) | No JSON (stdio transport) |

---

### 7. apps/mcp-server - Complete Tool Handlers

**Current State**: search_guidance, retrieve_guide implemented; 4 tools return "not implemented"  
**Phase 2 Additions**: Full implementation of all 6 tools using same logic as CLI

---

## Cross-Package Dependencies & Implementation Sequence

```
Week 1: Foundation & Knowledge Pipeline Hardening
├── @nullroot/knowledge: Incremental load support, enhanced validation
├── @nullroot/retrieval: Incremental indexing, enhanced filtering
├── @nullroot/core: Version comparison utilities (if needed)
└── tests: Integration test for incremental indexing

Week 2: Compatibility Database & Version-Aware Retrieval
├── @nullroot/compatibility: Version comparison, seed data, checker
├── @nullroot/retrieval: Version filtering in search
├── @nullroot/knowledge: Version metadata in guides
└── tests: Compatibility checker tests

Week 3: Analyzers Implementation (Parallel)
├── @nullroot/analyzers: QuickshellAnalyzer + QMLAnalyzer (shared QML tools)
├── @nullroot/analyzers: HyprlandAnalyzer
├── @nullroot/analyzers: LuaAnalyzer
├── @nullroot/analyzers: Wayland/Linux detection (in core detection)
└── tests: Analyzer unit tests with fixture projects

Week 4: CLI & MCP Completion
├── apps/cli: index, inspect, audit, compatibility, sources, eval, doctor, mcp
├── apps/mcp-server: detect_environment, inspect_project, run_diagnostics, check_compatibility
├── @nullroot/integrations: Complete skill generation for all ecosystems
└── tests: CLI integration tests, MCP tool tests

Week 5: Evaluation Framework & Polish
├── Evaluation infrastructure: graders, fixtures, runner
├── CI integration: nightly eval runs
├── Documentation updates
├── End-to-end integration tests
└── Performance benchmarking
```

---

## Test Strategy

### Unit Tests (Per Package)
| Package | Target Coverage | Key Test Areas |
|---------|----------------|----------------|
| `@nullroot/knowledge` | >90% | Loader parsing, validation, incremental metadata |
| `@nullroot/retrieval` | >90% | Incremental indexing, filtering, BM25 scoring |
| `@nullroot/compatibility` | >85% | Version comparison, checker, database queries |
| `@nullroot/analyzers` | >80% | Each analyzer with fixture projects, diagnostic parsing |
| `@nullroot/integrations` | >80% | Skill generation, MCP tool schemas |
| `@nullroot/config` | >90% | Config load/save/merge/validation |
| `@nullroot/core` | >95% | Types, errors, storage, events, version utils |

### Integration Tests
1. **Full Pipeline Test**: Guide → Load → Validate → Index → Search → Retrieve (existing vertical slice, expanded)
2. **Incremental Indexing Test**: Index → Modify guide → Re-index → Verify only changed indexed
3. **Analyzer Test**: Fixture projects → Analyze → Verify diagnostics match expected
4. **MCP Test**: All 6 tools via MCP protocol → Verify responses match CLI
5. **CLI Test**: All commands → Verify JSON output matches contracts
6. **Compatibility Test**: Query DB → Verify version-aware results

### Evaluation Tests (New)
- Run benchmark tasks in CI (nightly)
- Compare agent performance with/without NRDG
- Track regression metrics

---

## Risk Assessment

| Risk | Likelihood | Impact | Mitigation |
|------|------------|--------|------------|
| **Tool availability** (qmllint, luacheck not installed) | High | Medium | Graceful degradation - warn, don't fail; document required tools |
| **Incremental indexing complexity** | Medium | High | Start simple (mtime + checksum), optimize later; comprehensive tests |
| **Compatibility data maintenance** | Medium | Medium | Automated seed from release notes + manual review; version in repo |
| **Analyzer performance** | Medium | Low | Timeout per tool (30s); async parallel execution; caching |
| **MCP stdio transport issues** | Low | High | Test with actual Claude Code; follow MCP SDK patterns |
| **Cross-ecosystem type conflicts** | Low | Medium | Strict package boundaries; shared types only in core |

---

## Success Metrics (Phase 2 Completion)

- [ ] `nrdg index` processes 5+ guides across 2+ ecosystems in <10s
- [ ] `nrdg search` with all filter combinations returns correct results in <100ms
- [ ] Re-indexing 100 guides with 1 change takes <1s (vs 10s full rebuild)
- [ ] All 6 MCP tools return valid responses matching CLI output
- [ ] Each analyzer produces structured diagnostics for fixture projects
- [ ] Compatibility checker correctly identifies 50+ APIs across versions
- [ ] Unit test coverage >85% for all new code
- [ ] Integration tests pass in CI
- [ ] Evaluation framework runs benchmark tasks automatically

---

## Out of Scope for Phase 2

| Item | Deferred To |
|------|-------------|
| Semantic search (embeddings) | Phase 3 |
| Auto-fix for diagnostics (`--fix`) | Phase 3 |
| Real-time file watching | Phase 3 |
| Multi-project workspaces | Phase 3 |
| Web UI / dashboard | Phase 3 |
| Cloud synchronization | Never (offline-first) |
| Plugin system for external analyzers | Phase 4 |