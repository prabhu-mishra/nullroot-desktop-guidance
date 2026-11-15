# Phase 1 Implementation Plan

## Overview

**Goal**: Implement core functionality to make NRDG usable for basic knowledge search, environment detection, and project inspection.

**Duration**: 4-6 weeks
**Team**: 6 agents (as defined in CLAUDE.md)

## Acceptance Criteria (Definition of Done)

Phase 1 is complete when ALL of the following are met:

1. **CLI works end-to-end**: `nrdg init` → `nrdg detect` → `nrdg search` → `nrdg retrieve` → `nrdg inspect` → `nrdg audit`
2. **Knowledge base searchable**: 50+ guides across 3+ ecosystems indexed and searchable
3. **Environment detection accurate**: Detects Hyprland, Quickshell, Qt, Lua on Arch Linux
4. **Project inspection functional**: Identifies Quickshell/Hyprland/QML/Lua projects
5. **Basic diagnostics work**: qmllint, luacheck integration producing structured diagnostics
6. **Tests passing**: >80% coverage on core packages, all integration tests green
7. **Documentation complete**: All public APIs documented, CLI help comprehensive

## Work Breakdown

### P0 - Critical Path (Must Have)

| ID | Task | Owner | Dependencies | Acceptance Criteria |
|----|------|-------|--------------|---------------------|
| 1.1 | Implement knowledge loader with frontmatter parsing | Agent 2 | - | Loads all guides from `knowledge/` dir, validates schema |
| 1.2 | Build SQLite FTS5 indexer with BM25 | Agent 4 | 1.1 | `nrdg index` creates searchable index, `nrdg search` returns ranked results |
| 1.3 | Implement CLI commands: init, detect, search, retrieve | Agent 5 | 1.1, 1.2 | All commands work with JSON/table output, proper exit codes |
| 1.4 | Implement environment detection | Agent 5 | - | Detects distro, kernel, Hyprland, Quickshell, Qt, Lua, tools |
| 1.5 | Implement project inspector (quickshell, hyprland, qml, lua) | Agent 4 | 1.4 | `nrdg inspect` identifies project type, lists files, deps |
| 1.6 | Integrate qmllint for QML diagnostics | Agent 4 | 1.5 | `nrdg audit` runs qmllint, outputs structured diagnostics |
| 1.7 | Integrate luacheck for Lua diagnostics | Agent 4 | 1.5 | `nrdg audit` runs luacheck, outputs structured diagnostics |
| 1.8 | Write 20+ Quickshell guides | Agent 1 | - | Guides cover fundamentals, components, services, IPC |
| 1.9 | Write 15+ Hyprland guides | Agent 1 | - | Guides cover config, rules, animations, IPC |
| 1.10 | Write 10+ Qt/QML guides | Agent 1 | - | Guides cover properties, signals, models, lifecycle |
| 1.11 | Unit tests for all core packages | Agent 6 | All | >80% coverage, CI green |
| 1.12 | Integration tests for CLI workflows | Agent 6 | 1.3 | End-to-end tests pass |

### P1 - High Priority (Should Have)

| ID | Task | Owner | Dependencies | Acceptance Criteria |
|----|------|-------|--------------|---------------------|
| 1.13 | Implement compatibility database | Agent 3 | - | `nrdg compatibility` checks API versions |
| 1.14 | Write 10+ Lua guides | Agent 1 | - | Guides cover syntax, tables, modules |
| 1.15 | Implement Hyprland config parser for analyzer | Agent 4 | 1.5 | Parses hyprland.conf, extracts rules/binds |
| 1.16 | Add qmlformat integration | Agent 4 | 1.6 | `nrdg audit --fix` formats QML files |
| 1.17 | Implement source registry CLI | Agent 2 | 1.1 | `nrdg sources list/add/remove` works |
| 1.18 | Add cache/incremental indexing | Agent 4 | 1.2 | `nrdg index` only re-indexes changed files |
| 1.19 | Implement config manager with file watch | Agent 3 | - | Config changes hot-reload |
| 1.20 | Add CLI autocomplete (bash/zsh/fish) | Agent 5 | 1.3 | Tab completion works |

### P2 - Nice to Have (Phase 1 Stretch)

| ID | Task | Owner | Dependencies | Acceptance Criteria |
|----|------|-------|--------------|---------------------|
| 1.21 | Basic semantic search (optional) | Agent 4 | 1.2 | Local embeddings improve search relevance |
| 1.22 | Wayland/Linux-desktop guides | Agent 1 | - | 5+ guides each |
| 1.23 | Performance benchmarks | Agent 6 | 1.2 | Search <50ms, index <10s for 500 guides |
| 1.24 | MCP server basic tools | Agent 5 | 1.3 | `search_guidance`, `retrieve_guide` work via MCP |

## Detailed Task Specifications

### 1.1 Knowledge Loader

**File**: `packages/knowledge/src/loader.ts`

**Requirements**:
- Recursively scan `knowledge/` directory
- Parse YAML frontmatter (--- delimited)
- Validate against `GuideEntrySchema`
- Return `Result<GuideEntry[], ValidationError[]>`
- Support filtering by ecosystem/category
- Compute content checksum for change detection

**Tests**:
- Load valid guide → success
- Load guide with missing frontmatter → validation error
- Load guide with invalid UUID → validation error
- Load all guides from quickshell/ → correct count
- Checksum changes when content modified

### 1.2 SQLite FTS5 Indexer

**Files**: 
- `packages/retrieval/src/fts5.ts`
- `packages/retrieval/src/indexer.ts`
- `packages/retrieval/src/bm25.ts`

**Requirements**:
- Create virtual table `guides_fts` with columns: id, title, ecosystem, category, versions, status, tags, content
- Tokenizer: `porter unicode61`
- Batch insert with transactions (100 docs/batch)
- BM25 ranking via FTS5 `rank` column
- Support filters: ecosystem, category, version, status (post-query)
- Incremental update: track file mtime/checksum
- Rebuild command: drop + recreate
- Statistics: doc count, index size, avg doc length

**Tests**:
- Index 100 guides → search returns results
- BM25 ranking: exact matches score higher
- Filter by ecosystem works
- Incremental update only processes changed
- Rebuild produces same results

### 1.3 CLI Commands

**File**: `apps/cli/src/cli.ts` (Commander.js)

**Commands**:

```bash
nrdg init [--force] [--data-dir] [--ecosystems]
nrdg detect [--json]
nrdg search <query> [-e|--ecosystem] [-c|--category] [-v|--version] [-s|--status] [-l|--limit] [-o|--offset] [--json]
nrdg retrieve <id> [--format markdown|json] [--json]
nrdg inspect [path] [--deep] [--ecosystem] [--json]
nrdg audit [path] [--fix] [--severity] [--json]
nrdg index [--ecosystem] [--rebuild] [--stats] [--json]
nrdg sources <list|add|remove|verify|update> [--json]
nrdg doctor [--fix] [--json]
```

**Requirements**:
- Global `--json` flag for all commands
- Proper exit codes (0=success, 1=error, 2=usage, 3=config, 4=not found, 5=search, 6=compat, 7=analyzer)
- Colored table output by default
- Help text for all commands/options
- Config file loading via `@nullroot/config`

### 1.4 Environment Detection

**File**: `packages/analyzers/src/detection.ts` (new)

**Detection Logic**:
```typescript
interface DetectionResult {
  distribution: { name, version, id } | null;
  kernel: string;
  desktopSession: string | null;
  hyprland: { version, instanceSignature } | null;
  quickshell: { version } | null;
  qt: { version, path } | null;
  lua: { version, path } | null;
  tools: { qmllint, qmlformat, qmlimportscanner, luac, luacheck };
  configPaths: { hyprland, quickshell };
}
```

**Implementation**:
- `/etc/os-release` for distro
- `uname -r` for kernel
- `$XDG_CURRENT_DESKTOP`, `$DESKTOP_SESSION` for session
- `hyprctl version` for Hyprland
- `quickshell --version` for Quickshell
- `qmake6 -v` or `qt6ct` for Qt
- `lua -v` for Lua
- `which` for tools
- Standard config paths for Hyprland/Quickshell

**Error Handling**: Missing commands → warning in output, not failure

### 1.5 Project Inspector

**File**: `packages/analyzers/src/inspector.ts` (new)

**Logic**:
1. Detect project type by file patterns:
   - `shell.qml` + `QuickShell` import → quickshell
   - `hyprland.conf` → hyprland
   - `*.qml` → qml
   - `*.lua` → lua
2. Walk directory (max depth 10, exclude node_modules/.git)
3. For each file: detect type, size, parse imports/exports
4. Detect dependencies from package.json, CMakeLists.txt, etc.
5. Run quick syntax check (if tools available)

**Output**: `ProjectInfo` type from `@nullroot/core`

### 1.6 QML Diagnostics

**File**: `packages/analyzers/src/qml.ts`

**Integration**:
```bash
qmllint --format json /path/to/project
```

**Parsing**:
- Extract: file, line, column, message, severity
- Map to `Diagnostic` type
- Add explanation/fix from knowledge base
- Categorize: unresolved import, type error, binding loop, etc.

**Tests**:
- Valid QML → no diagnostics
- Missing import → error with location
- Binding loop → warning with explanation
- Type mismatch → error with fix suggestion

### 1.7 Lua Diagnostics

**File**: `packages/analyzers/src/lua.ts`

**Integration**:
```bash
luacheck --codes --ranges --formatter=plain /path/to/project
```

**Parsing**:
- Extract: file, line, column, code, message
- Map to `Diagnostic` type
- Add context from Lua guide

### 1.8-1.10 Guide Writing

**Agent 1 Responsibility**: Research and write guides

**Process per guide**:
1. Identify topic from category matrix
2. Research official source
3. Write guide with all required sections
4. Validate with `validateGuideEntry()`
5. Set status: `verified` (if tested), `reviewed` (if peer-reviewed)
6. Commit with message: `docs(knowledge): add quickshell/<category>/<topic>`

**Quality Bar**:
- All 8 content sections present
- At least 1 working code example
- At least 1 official reference
- No unverified claims presented as fact
- Frontmatter complete and valid

### 1.11 Unit Tests

**Coverage Targets**:
| Package | Target |
|---------|--------|
| @nullroot/core | 90% |
| @nullroot/knowledge | 85% |
| @nullroot/retrieval | 85% |
| @nullroot/compatibility | 80% |
| @nullroot/analyzers | 75% |
| @nullroot/integrations | 70% |
| @nullroot/config | 80% |
| @nullroot/shared | 95% |

**Test Patterns**:
- Pure functions: direct unit tests
- Classes: test public methods, mock dependencies
- Async: test success + error paths
- Validation: test valid + invalid inputs

### 1.12 Integration Tests

**File**: `tests/integration/cli.test.ts`

**Scenarios**:
```typescript
// Full workflow test
test('init -> detect -> search -> retrieve -> inspect -> audit', async () => {
  await cli('init');
  const detect = await cli('detect', { json: true });
  const search = await cli('search "workspace"', { json: true });
  const retrieve = await cli(`retrieve ${search.results[0].id}`, { json: true });
  const inspect = await cli('inspect ./test-project', { json: true });
  const audit = await cli('audit ./test-project', { json: true });
  // Assertions...
});
```

**Test Fixtures**: `tests/fixtures/` with sample projects

## Milestones

| Milestone | Target Date | Deliverables |
|-----------|-------------|--------------|
| M1: Foundation | Week 1 | Knowledge loader, FTS5 indexer, basic CLI |
| M2: Detection | Week 2 | Environment detection, project inspector |
| M3: Diagnostics | Week 3 | QML/Lua diagnostics, audit command |
| M4: Knowledge | Week 4 | 45+ guides written and indexed |
| M5: Polish | Week 5 | Tests, docs, CI, bug fixes |
| M6: Release | Week 6 | Phase 1 complete, tag v0.1.0 |

## Risk Mitigation

| Risk | Likelihood | Impact | Mitigation |
|------|------------|--------|------------|
| FTS5 performance on large KB | Medium | High | Benchmark early, optimize tokenizer, consider partitioning |
| qmllint output format changes | Low | Medium | Pin qmllint version, test in CI |
| Guide writing bottleneck | High | High | Parallelize across agents, use templates |
| CLI UX complexity | Medium | Medium | User testing, simplify commands |
| Dependency conflicts (better-sqlite3) | Low | High | Test on target platforms early |

## Resource Allocation

| Agent | Primary Focus | Secondary |
|-------|---------------|-----------|
| Agent 1 (Research) | Guide writing (1.8-1.10) | Source verification |
| Agent 2 (Knowledge) | Loader, registry, validator (1.1, 1.17) | Schema evolution |
| Agent 3 (Core) | Config, compatibility (1.13, 1.19) | Storage, events |
| Agent 4 (Retrieval) | FTS5, indexer, search, analyzers (1.2, 1.5-1.7, 1.15-1.16) | BM25 tuning |
| Agent 5 (CLI) | Commands, detection, MCP (1.3, 1.4, 1.20, 1.24) | UX polish |
| Agent 6 (Quality) | Tests, CI, benchmarks (1.11, 1.12, 1.23) | Coverage, automation |

## Success Metrics

| Metric | Target |
|--------|--------|
| `nrdg search` latency (p95) | < 100ms |
| `nrdg index` time (500 guides) | < 10s |
| `nrdg detect` time | < 2s |
| `nrdg audit` time (100 files) | < 5s |
| Guide validation pass rate | 100% |
| CLI command success rate | 100% (valid input) |
| Test coverage (core packages) | > 80% |
| CI build time | < 5 min |

## Go/No-Go for Phase 2

Phase 2 starts only if:
- [ ] All P0 tasks complete with passing tests
- [ ] 50+ guides indexed and searchable
- [ ] `nrdg` CLI works reliably on clean Arch Linux install
- [ ] No critical bugs open
- [ ] Documentation for all public APIs complete
- [ ] Team lead approves

## Notes

- Tasks can be parallelized within dependency constraints
- Agent 1 (Research) feeds guides continuously; others don't wait
- Weekly sync to adjust priorities
- Stretch goals (P2) only if P0/P1 on track