# Phase 2 Milestones - Detailed Breakdown

## Milestone 2.1: Knowledge Pipeline Hardening (Week 1)

**Objective**: Make the indexing pipeline robust for multi-guide, multi-ecosystem workloads with incremental updates.

### Deliverables

| ID | Task | Owner | Acceptance Criteria |
|----|------|-------|---------------------|
| 2.1.1 | Enhance `KnowledgeLoader` with file metadata | Agent 2 | `loadGuideWithMetadata()` returns mtime + checksum |
| 2.1.2 | Improve validation error context | Agent 2 | Errors include file path, line, column |
| 2.1.3 | Implement incremental indexing in `KnowledgeIndexer` | Agent 4 | `indexGuidesIncremental()` skips unchanged guides |
| 2.1.4 | Add checksum tracking to `guide_metadata` | Agent 4 | Schema migration adds `checksum` column |
| 2.1.5 | Enhance search filtering combinations | Agent 4 | All filter combos work: ecosystem + category + status + versions |
| 2.1.6 | Add index statistics API | Agent 4 | `getStats()` returns per-ecosystem breakdown |
| 2.1.7 | Unit tests for incremental indexing | Agent 6 | >90% coverage on new indexer methods |
| 2.1.8 | Integration test: full incremental pipeline | Agent 6 | Load → Index → Modify → Re-index → Verify only 1 indexed |

### Technical Details

**Incremental Indexing Algorithm**:
```typescript
// In KnowledgeIndexer
async indexGuidesIncremental(guides: GuideEntry[], existingChecksums: Map<string, string>): Promise<Result<{ indexed: number; skipped: number }, Error>> {
  const toIndex: GuideEntry[] = [];
  let skipped = 0;
  
  for (const guide of guides) {
    const existingChecksum = existingChecksums.get(guide.id);
    // Quick mtime check first (if we have file path)
    // Then definitive checksum comparison
    if (existingChecksum === guide.checksum) {
      skipped++;
    } else {
      toIndex.push(guide);
    }
  }
  
  if (toIndex.length > 0) {
    await this.indexGuides(toIndex);
  }
  
  return { ok: true, value: { indexed: toIndex.length, skipped } };
}
```

**Database Migration**:
```sql
-- Add checksum column to guide_metadata
ALTER TABLE guide_metadata ADD COLUMN checksum TEXT;

-- Create index for faster checksum lookups
CREATE INDEX IF NOT EXISTS idx_guide_checksum ON guide_metadata(checksum);
```

---

## Milestone 2.2: Compatibility Database & Version-Aware Retrieval (Week 2)

**Objective**: Build a functional compatibility database with version-aware search and migration guidance.

### Deliverables

| ID | Task | Owner | Acceptance Criteria |
|----|------|-------|---------------------|
| 2.2.1 | Implement semver comparison in checker | Agent 3 | `satisfiesVersion()` handles ^, ~, >=, <=, >, <, = |
| 2.2.2 | Enhance `checkCompatibility` with version logic | Agent 3 | Returns correct compatible/incompatible with version info |
| 2.2.3 | Seed compatibility database (50+ entries) | Agent 3 | Covers all 6 ecosystems, priority APIs |
| 2.2.4 | Add version filtering to search | Agent 4 | `SearchOptions.versions` filters guides by applicable versions |
| 2.2.5 | Version-aware guide retrieval | Agent 2 | Guides declare versions in frontmatter; search respects target version |
| 2.2.6 | MCP `check_compatibility` tool | Agent 5 | Full implementation with version-aware results |
| 2.2.7 | CLI `compatibility` command | Agent 5 | `nrdg compatibility <api> -v <version>` works |
| 2.2.8 | Unit tests for compatibility checker | Agent 6 | >85% coverage, version edge cases tested |

### Compatibility Entry Schema

```typescript
// packages/compatibility/src/models.ts (enhanced)
interface CompatibilityEntry {
  id: string;
  ecosystem: Ecosystem;
  component: string;      // e.g., "WorkspaceIndicator", "windowrulev2"
  api: string;            // e.g., "model", "workspaces", "rule"
  firstSupported: string; // Semver: "1.0"
  deprecatedIn?: string;  // Semver: "1.2"
  removedIn?: string;     // Semver: "2.0"
  replacement?: string;   // e.g., "WorkspaceIndicator.workspaces"
  source: string;         // URL to official docs
  verifiedDate: string;   // ISO date
  notes?: string;         // Migration guidance
}
```

### Version-Aware Search Flow

```
User Query: "workspace indicator" + version="1.1"
    │
    ▼
SearchEngine.search({ query, versions: ["1.1"] })
    │
    ├── FTS5 MATCH on content
    │
    ├── Filter by ecosystem/category (post-FTS5)
    │
    ├── Filter by versions: guide.versions.includes("1.1")
    │
    ├── BM25 scoring
    │
    └── Return results with compatibility metadata
```

---

## Milestone 2.3: Project Analyzers (Week 3)

**Objective**: Implement read-only project analysis for all 5 target ecosystems with structured diagnostics.

### Analyzer Implementation Priority

| Priority | Analyzer | Ecosystem | Tools | Complexity |
|----------|----------|-----------|-------|------------|
| P0 | QuickshellAnalyzer | quickshell | qmllint, qmlformat, qmlimportscanner | High |
| P0 | QMLAnalyzer | qt-qml | qmllint, qmlformat, qmlimportscanner | High (shared with Quickshell) |
| P1 | HyprlandAnalyzer | hyprland | hyprctl (read-only), config parsing | Medium |
| P1 | LuaAnalyzer | lua | luac, luacheck | Medium |
| P2 | Wayland/Linux Detection | wayland, linux-desktop | System commands, D-Bus introspection | Low |

### Deliverables

| ID | Task | Owner | Acceptance Criteria |
|----|------|-------|---------------------|
| 2.3.1 | QuickshellAnalyzer: QML project discovery | Agent 4 | Finds shell.qml, modules/, widgets/, services/ |
| 2.3.2 | QuickshellAnalyzer: qmllint integration | Agent 4 | Parses qmllint JSON output → Diagnostics |
| 2.3.3 | QuickshellAnalyzer: qmlformat integration | Agent 4 | Detects formatting issues |
| 2.3.4 | QuickshellAnalyzer: qmlimportscanner integration | Agent 4 | Resolves imports, detects missing modules |
| 2.3.4 | QMLAnalyzer: Shared QML tool integration | Agent 4 | Reuses Quickshell QML tool logic |
| 2.3.5 | HyprlandAnalyzer: Config discovery | Agent 4 | Finds hyprland.conf, includes/ |
| 2.3.6 | HyprlandAnalyzer: Syntax validation | Agent 4 | Parses hyprlang, validates rules/bindings |
| 2.3.7 | HyprlandAnalyzer: IPC validation | Agent 4 | Checks hyprctl commands work |
| 2.3.8 | LuaAnalyzer: luac syntax checking | Agent 4 | Runs luac, parses errors |
| 2.3.9 | LuaAnalyzer: luacheck linting | Agent 4 | Runs luacheck, parses warnings |
| 2.3.10 | Wayland/Linux environment detection | Agent 3 | Detects D-Bus, systemd, PipeWire, NetworkManager |
| 2.3.11 | Analyzer fixture projects | Agent 6 | Test projects for each ecosystem in tests/fixtures/ |
| 2.3.12 | Unit tests for all analyzers | Agent 6 | >80% coverage, fixture-based |

### Diagnostic Normalization

All analyzers output normalized `Diagnostic[]`:

```typescript
interface Diagnostic {
  severity: 'error' | 'warning' | 'info' | 'hint';
  code: string;           // Standardized: "QML_UNRESOLVED_IMPORT", "HYPRLANG_SYNTAX_ERROR"
  message: string;        // Human-readable
  location: {
    file: string;
    line?: number;
    column?: number;
    endLine?: number;
    endColumn?: number;
  };
  explanation?: string;   // Why this matters
  fix?: string;           // Suggested fix (for --fix future)
  references?: Reference[]; // Links to relevant guides
}
```

### Tool Output Parsing

| Tool | Output Format | Parsing Strategy |
|------|---------------|------------------|
| qmllint | JSON (`--json`) | Native JSON parse |
| qmlformat | Text diff | Regex for line/column |
| qmlimportscanner | JSON | Native JSON parse |
| luac | Text (stderr) | Regex for line:col: message |
| luacheck | JSON (`--formatter=json`) | Native JSON parse |
| hyprctl | JSON (`-j`) | Native JSON parse |

---

## Milestone 2.4: CLI & MCP Completion (Week 4)

**Objective**: Complete all CLI commands and MCP tool handlers for full end-to-end functionality.

### CLI Commands

| Command | Implementation | Key Features |
|---------|----------------|--------------|
| `nrdg index` | Incremental indexing | `--ecosystem`, `--rebuild`, `--stats`, JSON output |
| `nrdg inspect` | Project analysis | `--deep`, `--ecosystem`, JSON: ProjectInfo |
| `nrdg audit` | Diagnostics | `--fix` (placeholder), `--severity`, JSON: summary + diagnostics |
| `nrdg compatibility` | API check | `-v/--version`, `-e/--ecosystem`, `-c/--component`, JSON |
| `nrdg sources` | Source registry | `list`, `add`, `remove`, `verify`, `update` |
| `nrdg eval` | Benchmarks | `--task`, `--agent`, `--iterations`, `--output` |
| `nrdg doctor` | Health checks | `--fix`, JSON: checks array |
| `nrdg mcp` | MCP server | `--stdio` (default), `-p/--port`, `-h/--host` |

### MCP Tool Handlers

| Tool | Handler Implementation |
|------|------------------------|
| `detect_environment` | Use analyzer detection logic |
| `inspect_project` | Call Quickshell/Hyprland/QML/Lua analyzers |
| `run_diagnostics` | Run analyzers with diagnostic collection |
| `check_compatibility` | Use CompatibilityChecker |

### Skill Generation

| Target | Ecosystems | Content Source |
|--------|------------|----------------|
| Claude Code | All 6 | Knowledge base (guides per ecosystem) |
| Codex | All 6 | Knowledge base + diagnostic workflows |

---

## Milestone 2.5: Evaluation Framework & Polish (Week 5)

**Objective**: Establish automated evaluation for agent effectiveness and polish for production readiness.

### Evaluation Infrastructure

| Component | Description |
|-----------|-------------|
| `evals/tasks/` | Task specifications (7 tasks from methodology) |
| `evals/fixtures/` | Golden solutions for each task |
| `evals/graders/` | Automated graders (TypeScript) |
| `evals/runner.ts` | Evaluation orchestrator |
| `evals/reports/` | Results storage |

### Benchmark Tasks (from methodology)

1. **Build Quickshell Popup** - Popup menu with shell commands
2. **Create Workspace Indicator** - Hyprland IPC + WorkspaceIndicator
3. **Diagnose Unresolved QML Import** - qmllint integration
4. **Validate Hyprland Configuration** - Config parsing + deprecation detection
5. **Analyze Lua Module** - luacheck + metatable analysis
6. **Detect Unsupported API** - Compatibility database query
7. **Diagnose System Integration** - UPower/D-Bus diagnosis

### CI Integration

```yaml
# .github/workflows/eval.yml
name: Nightly Evaluation
on:
  schedule:
    - cron: '0 2 * * *'  # 2 AM daily
  workflow_dispatch:

jobs:
  evaluate:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: pnpm/action-setup@v4
      - run: pnpm install
      - run: pnpm build
      - run: nrdg eval --agent claude --iterations 3 --output evals/reports/
      - run: nrdg eval --agent codex --iterations 3 --output evals/reports/
      - uses: actions/upload-artifact@v4
        with:
          name: eval-results
          path: evals/reports/
```

### Polish Items

- [ ] Error message consistency across packages
- [ ] CLI help text completeness
- [ ] MCP tool description accuracy
- [ ] Documentation: README, CLI reference, MCP guide
- [ ] Performance: index 1000 guides <30s, search <50ms
- [ ] Memory: CLI <100MB, MCP server <50MB

---

## Dependency Graph (Milestone Level)

```
Milestone 2.1 (Pipeline Hardening)
    │
    ├──▶ Milestone 2.2 (Compatibility + Version-Aware)
    │         │
    │         ├──▶ Milestone 2.4 (CLI/MCP uses compatibility)
    │         │
    │         └──▶ Milestone 2.5 (Evaluation uses compatibility)
    │
    ├──▶ Milestone 2.3 (Analyzers)
    │         │
    │         ├──▶ Milestone 2.4 (CLI inspect/audit uses analyzers)
    │         │
    │         └──▶ Milestone 2.5 (Evaluation uses analyzers)
    │
    └──▶ Milestone 2.4 (CLI/MCP)
              │
              └──▶ Milestone 2.5 (Evaluation runs via CLI)
```

---

## Go/No-Go Criteria for Phase 2 Completion

Phase 2 is complete ONLY if:

- [ ] All 5 milestones deliverables met
- [ ] `pnpm test` passes with >85% coverage on new code
- [ ] `pnpm typecheck` passes (no TypeScript errors)
- [ ] `pnpm lint` passes
- [ ] Integration test: full pipeline with 10+ guides across 3+ ecosystems
- [ ] All 6 MCP tools work with real queries
- [ ] CLI commands produce valid JSON matching contracts
- [ ] Evaluation framework runs at least 2 benchmark tasks
- [ ] No critical bugs in analyzer diagnostics
- [ ] Team lead approval

---

## Resource Allocation (Agent Mapping)

| Agent | Milestones | Packages Owned |
|-------|------------|----------------|
| Agent 2 (Knowledge) | 2.1, 2.2 | `@nullroot/knowledge` |
| Agent 3 (Core/Config/Compat) | 2.2, 2.3.10 | `@nullroot/core`, `@nullroot/config`, `@nullroot/compatibility` |
| Agent 4 (Retrieval/Analyzers) | 2.1, 2.3 | `@nullroot/retrieval`, `@nullroot/analyzers` |
| Agent 5 (CLI/Integrations) | 2.2, 2.4 | `@nullroot/integrations`, `apps/cli`, `apps/mcp-server` |
| Agent 6 (Quality) | All | `tests/`, CI, fixtures |

---

## Timeline Summary

| Week | Milestone | Key Deliverable |
|------|-----------|-----------------|
| 1 | 2.1 | Incremental indexing, robust search |
| 2 | 2.2 | Compatibility DB + version-aware search |
| 3 | 2.3 | 5 working analyzers with diagnostics |
| 4 | 2.4 | Complete CLI + MCP + Skills |
| 5 | 2.5 | Evaluation framework + polish |

**Total**: 5 weeks for Phase 2 completion