# Phase 1 Implementation Plan (Revised)

## Overview

**Goal**: Deliver a working end-to-end vertical slice: one high-quality Quickshell guide → frontmatter validation → knowledge registry → FTS5 indexing → BM25 retrieval → CLI display → agent skill integration.

**Duration**: 3-4 weeks
**Scope**: 8 packages + 2 applications (not 10 packages)

## Six Supported Ecosystems (Preserved)

1. **Quickshell** - QtQuick/QML desktop shell
2. **Hyprland / Hyprlang** - Dynamic tiling Wayland compositor
3. **Qt6 / QML** - Cross-platform application framework
4. **Lua** - Lightweight scripting language
5. **Wayland** - Display server protocol
6. **Linux Desktop** - D-Bus, systemd, PipeWire, NetworkManager, MPRIS, BlueZ, Portals

---

## Milestone 1: End-to-End Vertical Slice (Week 1-2)

**Primary Objective**: One Quickshell guide flows through the entire pipeline.

### Acceptance Criteria (All Must Pass)

| # | Criterion | Verification |
|---|-----------|--------------|
| 1 | **Guide exists** | `knowledge/quickshell/fundamentals/workspace-indicator.md` with valid frontmatter |
| 2 | **Frontmatter validates** | `validateGuideEntry()` returns `ok: true` with zero warnings |
| 3 | **Registry loads guide** | `KnowledgeLoader.loadGuide(id)` returns `ok: true` with complete `GuideEntry` |
| 4 | **Indexer indexes guide** | `KnowledgeIndexer.indexGuide(guide)` returns `ok: true`, FTS5 row exists |
| 5 | **Search retrieves guide** | `SearchEngine.search({query: "workspace indicator"})` returns the guide with score > 0 |
| 6 | **CLI displays guide** | `nrdg retrieve <id> --json` outputs complete guide with provenance (sources, status, lastVerified) |
| 7 | **Claude Code skill works** | Generated skill includes `search_guidance` tool that returns the guide |
| 8 | **Codex skill works** | Generated skill prompt references the guide's ecosystem |
| 9 | **Unit tests pass** | All new code covered, `pnpm test` exits 0 |
| 10 | **Integration test passes** | `tests/integration/vertical-slice.test.ts` runs full pipeline |

### Vertical Slice Scope

**In Scope**:
- Single guide: "Workspace Indicator" (fundamentals)
- Packages: core, knowledge, retrieval, integrations, shared
- Apps: cli, mcp-server (tools: search_guidance, retrieve_guide)
- Skills: claude-code/quickshell, codex/quickshell

**Out of Scope**:
- Other guides
- Hyprland/Qt/Lua/Wayland/Linux-Desktop analyzers
- Compatibility database
- Environment detection
- Diagnostics (qmllint, luacheck)
- Semantic search
- Source registry CLI

---

## Milestone 2: Core Pipeline Hardening (Week 2-3)

**Objective**: Make the pipeline robust for multiple guides and ecosystems.

### Acceptance Criteria

| # | Criterion | Verification |
|---|-----------|--------------|
| 1 | **Multi-guide indexing** | `nrdg index` indexes 5+ guides across 2+ ecosystems |
| 2 | **Filtering works** | `nrdg search` with `--ecosystem`, `--category`, `--status` filters |
| 3 | **Incremental indexing** | Re-indexing unchanged guides is no-op (mtime/checksum) |
| 4 | **Error handling** | Invalid frontmatter → clear error, not crash |
| 5 | **MCP tools complete** | All 6 tools implemented (stubbed for non-retrieval) |
| 6 | **Tests per package** | Each package has unit tests, integration test for pipeline |

---

## Milestone 3: Analyzer & Diagnostics Foundation (Week 3-4)

**Objective**: Read-only project inspection with qmllint/luacheck diagnostics.

### Acceptance Criteria

| # | Criterion | Verification |
|---|-----------|--------------|
| 1 | **Project inspector** | `nrdg inspect` identifies quickshell/hyprland/qml/lua projects |
| 2 | **QML diagnostics** | `nrdg audit` runs qmllint, outputs structured diagnostics |
| 3 | **Lua diagnostics** | `nrdg audit` runs luacheck, outputs structured diagnostics |
| 3 | **Read-only guarantee** | No file writes without explicit `--fix` flag |
| 4 | **Compatibility stub** | `nrdg compatibility` returns not-implemented for missing data |

---

## Agent Ownership Matrix (No Overlapping File Ownership)

| Agent | Primary Package(s) | Files Owned | Milestone 1 Tasks |
|-------|-------------------|-------------|-------------------|
| **Agent 1 (Research)** | Content only | `knowledge/quickshell/fundamentals/workspace-indicator.md` | Write single vertical-slice guide |
| **Agent 2 (Knowledge)** | `@nullroot/knowledge` | `packages/knowledge/src/{schemas,registry,loader,validator}.ts` | 1.2, 1.3, 1.4, 1.5 |
| **Agent 3 (Core)** | `@nullroot/core`, `@nullroot/config` | `packages/core/src/{types,errors,storage,config,events}.ts`, `packages/config/src/{schema,manager}.ts` | 1.1 (types for guide), 1.6 (config for CLI) |
| **Agent 4 (Retrieval)** | `@nullroot/retrieval` | `packages/retrieval/src/{bm25,fts5,indexer,search}.ts` | 1.4, 1.5 |
| **Agent 5 (CLI/Integrations)** | `@nullroot/integrations`, `apps/cli`, `apps/mcp-server` | `packages/integrations/src/{claude-code,codex,mcp}.ts`, `apps/cli/src/cli.ts`, `apps/mcp-server/src/index.ts` | 1.6, 1.7, 1.8 |
| **Agent 6 (Quality)** | `tests/`, CI | `tests/integration/vertical-slice.test.ts`, `.github/workflows/ci.yml`, all `vitest.config.ts` | 1.9, 1.10 |

**No Shared File Ownership**: Each file modified by exactly one agent.

---

## Dependency Graph (Milestone 1)

```
┌─────────────────────────────────────────────────────────────────────────┐
│                        MILESTONE 1 DEPENDENCIES                         │
└─────────────────────────────────────────────────────────────────────────┘

Agent 1 (Research)          Agent 3 (Core)          Agent 2 (Knowledge)
     │                            │                        │
     │  1. Guide content          │  1. GuideEntry type    │
     ▼                            │  (Ecosystem, etc.)     │
┌─────────────────────────────────┘                        │
│                     ┌────────────────────────────────────┘
│                     ▼
│            ┌─────────────────┐
│            │  @nullroot/core │◄──── Agent 3
│            │  (types,        │
│            │   shared utils) │
│            └────────┬────────┘
│                     │
│         ┌───────────┼───────────┐
│         ▼           ▼           ▼
│  ┌─────────────┐ ┌──────────┐ ┌────────────┐
│  │ @nullroot/  │ │@nullroot/│ │ @nullroot/ │
│  │ knowledge   │ │ retrieval│ │ integrations│
│  │ (Agent 2)   │ │(Agent 4) │ │(Agent 5)   │
│  └──────┬──────┘ └────┬─────┘ └─────┬──────┘
│         │             │             │
│         │    1.4      │    1.5      │ 1.6,1.7
│         │  (loads)    │  (indexes)  │ (skills)
│         ▼             ▼             ▼
│  ┌─────────────────────────────────────────┐
│  │           apps/cli (Agent 5)            │
│  │  nrdg retrieve <id> --json              │
│  └─────────────────────────────────────────┘
```

### Critical Path (Sequential)

```
Agent 1: Write guide
    ▼
Agent 3: GuideEntry type in core (if not exists)
    ▼
Agent 2: Loader validates guide
    ▼
Agent 4: Indexer indexes guide
    ▼
Agent 4: Search retrieves guide
    ▼
Agent 5: CLI displays guide
    ▼
Agent 5: MCP tools return guide
    ▼
Agent 6: Integration test passes
```

---

## Revised Task Breakdown (Milestone 1 Only)

### P0 - Critical Path (Sequential, Must Complete in Order)

| ID | Task | Agent | Depends On | Acceptance Criteria |
|----|------|-------|------------|---------------------|
| 1.1 | Define `GuideEntry` and related types in `@nullroot/core` | Agent 3 | - | `packages/core/src/types.ts` exports all types, Zod schemas in knowledge |
| 1.2 | Write "Workspace Indicator" guide with valid frontmatter | Agent 1 | 1.1 | `knowledge/quickshell/fundamentals/workspace-indicator.md` passes `validateGuideEntry()` |
| 1.3 | Implement `KnowledgeLoader` with frontmatter parsing | Agent 2 | 1.1 | `loadGuide(id)` returns validated `GuideEntry` |
| 1.4 | Implement `SourceRegistry` and register guide source | Agent 2 | 1.3 | Source manifest created, guide ID registered |
| 1.5 | Implement `FTS5Index` with BM25 ranking | Agent 4 | 1.1 | Virtual table created, `insert()` and `search()` work |
| 1.6 | Implement `KnowledgeIndexer` batch/insert | Agent 4 | 1.3, 1.5 | `indexGuide(guide)` stores in FTS5 |
| 1.7 | Implement `SearchEngine` with filters | Agent 4 | 1.5 | `search({query, ecosystems[]})` returns ranked results |
| 1.8 | Implement CLI `retrieve` and `search` commands | Agent 5 | 1.3, 1.7 | `nrdg retrieve <id> --json` and `nrdg search "..." --json` work |
| 1.9 | Implement MCP `search_guidance` and `retrieve_guide` tools | Agent 5 | 1.7 | MCP tools return same data as CLI |
| 1.10 | Generate Claude Code & Codex skills for Quickshell | Agent 5 | 1.2 | Skill files reference guide ecosystem |
| 1.11 | Write vertical-slice integration test | Agent 6 | 1.8, 1.9 | `pnpm test` runs full pipeline test |
| 1.12 | Run all unit tests, verify coverage | Agent 6 | 1.3-1.10 | `pnpm test` exits 0, coverage >80% for touched packages |

### P1 - Parallelizable (After Dependencies Met)

| ID | Task | Agent | Depends On | Acceptance Criteria |
|----|------|-------|------------|---------------------|
| 1.13 | CLI `init` command (minimal config) | Agent 5 | 1.1 | Creates config dir, enables ecosystems |
| 1.14 | CLI `detect` command (read-only) | Agent 5 | 1.1 | Detects Hyprland/Quickshell/Qt/Lua versions |
| 1.15 | Error handling for invalid guide IDs | Agent 2, 5 | 1.3, 1.8 | Clear error messages, proper exit codes |

---

## Test Strategy (Run After Each Milestone)

### Milestone 1 Test Gate
```bash
# Must pass before Milestone 2 begins
pnpm test                          # All unit tests
pnpm test -- vertical-slice       # Integration test
pnpm typecheck                     # No TypeScript errors
pnpm lint                          # No lint errors
```

### Integration Test Specification
```typescript
// tests/integration/vertical-slice.test.ts
import { describe, it, expect } from 'vitest';
import { KnowledgeLoader } from '@nullroot/knowledge';
import { KnowledgeIndexer } from '@nullroot/retrieval';
import { SearchEngine } from '@nullroot/retrieval';
import { validateGuideEntry } from '@nullroot/knowledge';

describe('Vertical Slice: Workspace Indicator Guide', () => {
  const GUIDE_ID = 'workspace-indicator-guide-uuid';
  
  it('1. Guide frontmatter validates', async () => {
    const result = validateGuideEntry(guideContent);
    expect(result.success).toBe(true);
    expect(result.data.status).toBe('verified');
  });
  
  it('2. Loader loads guide from filesystem', async () => {
    const loader = new KnowledgeLoader({ knowledgeRoot: './knowledge' });
    const result = await loader.loadGuide(GUIDE_ID);
    expect(result.ok).toBe(true);
    expect(result.value.id).toBe(GUIDE_ID);
  });
  
  it('3. Indexer indexes guide', async () => {
    const indexer = new KnowledgeIndexer({ dbPath: ':memory:' });
    await indexer.initialize();
    const result = await indexer.indexGuide(guide);
    expect(result.ok).toBe(true);
  });
  
  it('4. Search retrieves guide with BM25 score', async () => {
    const search = new SearchEngine({ dbPath: ':memory:' });
    const results = await search.search({ query: 'workspace indicator' });
    expect(results.ok).toBe(true);
    expect(results.value.length).toBeGreaterThan(0);
    expect(results.value[0].score).toBeGreaterThan(0);
  });
  
  it('5. CLI retrieve outputs JSON with provenance', async () => {
    const output = await runCLI(`retrieve ${GUIDE_ID} --json`);
    const data = JSON.parse(output);
    expect(data.sources).toBeDefined();
    expect(data.status).toBe('verified');
    expect(data.lastVerified).toBeDefined();
  });
});
```

---

## Explicit Out-of-Scope for Phase 1

| Item | Deferred To |
|------|-------------|
| 45+ guides | Phase 2 (after pipeline validated) |
| Hyprland/Qt/Lua/Wayland/Linux-Desktop analyzers | Phase 2-3 |
| Compatibility database | Phase 2 |
| Environment detection (full) | Phase 2 |
| qmllint/luacheck diagnostics | Phase 2 |
| Source registry CLI | Phase 2 |
| Semantic search | Phase 3 (if benchmark justifies) |
| Incremental indexing optimization | Phase 2 |
| Config file watching | Phase 2 |
| CLI autocomplete | Phase 2 |

---

## Go/No-Go for Milestone 2

Milestone 2 starts ONLY if:
- [ ] All P0 tasks (1.1-1.12) complete
- [ ] Vertical slice integration test passes
- [ ] `pnpm test` passes with >80% coverage on core, knowledge, retrieval, integrations
- [ ] No critical bugs in pipeline
- [ ] Team lead approves

---

## Notes

- **Single vertical slice first**: Validates architecture before scaling
- **Guide writing last in critical path**: Architecture validates with real content
- **No overlapping ownership**: Each file has exactly one agent
- **Tests after each milestone**: Not just at the end
- **Read-only by default**: Detection/diagnostics never write without `--fix`
- **Semantic search deferred**: No provider selection until evidence justifies