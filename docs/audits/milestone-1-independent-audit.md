# Milestone 1 Independent Audit Report

**Date**: 2026-11-15  
**Repository**: `/home/roronoa/Projects/nullroot-desktop-guidance/.claude/worktrees/fix-typescript-build`  
**Auditor**: Independent Agent (Read-Only)

---

## Executive Summary

The Milestone 1 vertical slice implementation has **significant gaps** against the 10 acceptance criteria. While the core infrastructure (schemas, loader, indexer, search, CLI) is implemented and unit tests pass, the vertical slice is incomplete:

- **Critical**: The required "Workspace Indicator" guide (`workspace-indicator.md`) does not exist
- **Critical**: No integration test file at `tests/integration/vertical-slice.test.ts`
- **Major**: Search for "workspace indicator" fails to retrieve relevant guides
- **Major**: BM25 scoring produces negative scores (bug)
- **Minor**: Frontmatter validation generates warnings

**Overall**: 3 PASS, 3 PARTIAL, 4 FAIL

---

## Acceptance Criteria Verification

| # | Criterion | Status | Evidence |
|---|-----------|--------|----------|
| 1 | Guide exists: `knowledge/quickshell/fundamentals/workspace-indicator.md` with valid frontmatter | **FAIL** | File does not exist. Only `getting-started.md` and `architecture-and-components.md` exist in `knowledge/quickshell/fundamentals/` |
| 2 | Frontmatter validates: `validateGuideEntry()` returns `ok: true` with zero warnings | **PARTIAL** | Validation passes (`ok: true`) but `KnowledgeValidator` generates 4 warnings: missing checksum, lastVerified > 6 months, no examples, no references |
| 3 | Registry loads guide: `KnowledgeLoader.loadGuide(id)` returns `ok: true` with complete `GuideEntry` | **PASS** | Verified with both `getting-started.md` (ID: `a1b2c3d4-e5f6-7890-abcd-ef1234567890`) and `architecture-and-components.md` (ID: `11111111-1111-1111-1111-111111111111`). Returns complete `GuideEntry` with all content sections parsed |
| 4 | Indexer indexes guide: `KnowledgeIndexer.indexGuide(guide)` returns `ok: true`, FTS5 row exists | **PASS** | Successfully indexed 6 guides. SQLite FTS5 table `guides` contains rows with correct IDs and titles. `guide_metadata` table populated |
| 5 | Search retrieves guide: `SearchEngine.search({query: "workspace indicator"})` returns the guide with score > 0 | **FAIL** | Search for "workspace indicator" returns Hyprland guide (irrelevant). Quickshell guides mentioning `WorkspaceIndicator` component not retrieved. FTS5 tokenizer doesn't match `WorkspaceIndicator` (camelCase) to "workspace indicator" (spaced) |
| 6 | CLI displays guide: `nrdg retrieve <id> --json` outputs complete guide with provenance | **PASS** | `nrdg retrieve <id> --json` returns guide with `id`, `title`, `ecosystem`, `category`, `snippet`, `score`, `metadata.versions`, `metadata.status`, `metadata.lastVerified`, `metadata.tags` |
| 7 | Claude Code skill works: Generated skill includes `search_guidance` tool that returns the guide | **PARTIAL** | Skill generated (`nrdg skills claude-code`) includes `search_guidance` and `retrieve_guide` tools, but skill instructions are generic ("Use the NullRoot knowledge base for Quickshell development") - no reference to specific guide content |
| 8 | Codex skill works: Generated skill prompt references the guide's ecosystem | **PARTIAL** | Skill generated (`nrdg skills codex`) mentions ecosystem ("quickshell") but prompt is generic ("You are an expert in Quickshell development. Use the NullRoot knowledge base for accurate guidance.") - no specific guide reference |
| 9 | Unit tests pass: All new code covered, `pnpm test` exits 0 | **PASS** | All 58 unit tests pass across packages: shared (16), knowledge (17), retrieval (25). No tests for core, config, compatibility, analyzers, integrations, cli, mcp-server |
| 10 | Integration test passes: `tests/integration/vertical-slice.test.ts` runs full pipeline | **FAIL** | File does not exist. No `tests/integration/` directory. Retrieval package tests test indexer+search pipeline but not full end-to-end (loader → indexer → search → CLI) |

---

## Verified Commands and Results

### Build & Test
```bash
$ pnpm build          # ✓ Zero TypeScript errors
$ pnpm test           # ✓ 58 tests pass (shared: 16, knowledge: 17, retrieval: 25)
```

### CLI Commands
```bash
$ nrdg init --json                           # ✓ Creates config at ~/.config/nullroot-desktop-guidance/config.json
$ nrdg detect --json                         # ✓ Returns environment detection stub
$ nrdg skills claude-code                    # ✓ Outputs 5 skills (quickshell, hyprland, qt-qml, lua, desktop-debugging)
$ nrdg skills codex                          # ✓ Outputs 5 skills with prompts
$ nrdg skills mcp                            # ✓ Lists 6 MCP tools
$ nrdg search "quickshell" --json            # ✓ Returns 2 Quickshell guides with positive scores
$ nrdg search "architecture" --json          # ⚠ Returns guides but with NEGATIVE scores (bug)
$ nrdg search "workspace indicator" --json   # ✗ Returns irrelevant Hyprland guide
$ nrdg retrieve "11111111-1111-1111-1111-111111111111" --json  # ✓ Returns architecture guide with provenance
$ nrdg retrieve "a1b2c3d4-e5f6-7890-abcd-ef1234567890" --json   # ✓ Returns getting-started guide with provenance
```

### Direct API Verification
```javascript
// KnowledgeLoader.loadGuide() - PASS
const loader = createKnowledgeLoader({ guidesRoot: './knowledge', validate: true });
const result = await loader.loadGuide('./knowledge/quickshell/fundamentals/getting-started.md');
// Returns ok: true with complete GuideEntry

// validateGuideEntry() - PASS (with warnings)
validateGuideEntry(guide); // Returns { success: true, data: GuideEntry }

// KnowledgeIndexer.indexGuide() - PASS
const indexer = createIndexer({ dbPath: './data/guides.db' });
await indexer.initialize();
await indexer.indexGuide(guide); // Returns ok: true

// SearchEngine.search() - PARTIAL
await searchEngine.search({ query: 'workspace indicator' });
// Returns 1 result (Hyprland guide), score > 0 but WRONG guide

// SearchEngine.getById() - PASS
await searchEngine.getById('11111111-1111-1111-1111-111111111111');
// Returns guide with provenance metadata
```

---

## Bugs and Architectural Weaknesses

### Critical Bugs

1. **BM25 Scoring Produces Negative Scores** (`packages/retrieval/src/search.ts:81-117`)
   - The `computeScore()` method combines FTS5 rank (lower=better) with BM25 (higher=better) using a weighted formula that can produce negative values
   - Observed: Search for "architecture" returns score `-7.15`
   - Root cause: FTS5 rank can be large negative, and the inversion `1 / (1 + rank)` doesn't properly normalize

2. **FTS5 Tokenizer Doesn't Match CamelCase to Spaced Queries**
   - `WorkspaceIndicator` (in guide content) ≠ `workspace indicator` (query)
   - Porter + unicode61 tokenizer doesn't split camelCase
   - Workaround: Guides must include both forms in content/tags

3. **Missing Required Guide File**
   - `knowledge/quickshell/fundamentals/workspace-indicator.md` does not exist
   - This is the primary vertical slice deliverable per the implementation plan

### Architectural Weaknesses

1. **No Integration Test Infrastructure**
   - No `tests/integration/` directory
   - No end-to-end test running loader → indexer → search → CLI
   - Package tests are isolated unit tests only

2. **Configuration Path Mismatch**
   - CLI defaults to `~/.config/nullroot-desktop-guidance/data/guides.db`
   - Project data directory is `apps/cli/data/guides.db`
   - Requires manual `dataDir` config override to work correctly

3. **Skill Generation is Generic**
   - Claude Code and Codex skills don't reference specific guide content
   - No dynamic skill generation based on indexed guides
   - Skills are static templates

4. **Validator Warnings Not Actionable**
   - `KnowledgeValidator` generates warnings but `validateGuideEntry()` (Zod safeParse) still returns success
   - No clear distinction between "valid but needs improvement" vs "invalid"

5. **Resource Cleanup Gaps**
   - `KnowledgeIndexer.close()` and `SearchEngine.close()` exist but not consistently used
   - No automatic cleanup on process exit
   - MCP server keeps global `searchEngine` instance without cleanup

6. **Offline Functionality Unverified**
   - No tests verifying fully offline operation
   - `SourceReference` schema requires URL but no local-only source type
   - `retrieved` field requires ISO datetime but no offline timestamp handling

### Error Handling Issues

1. **Missing Required Field Errors Not User-Friendly**
   - `loader.ts:131-138` returns generic "Missing required field" without listing all missing fields at once

2. **Database Errors Not Wrapped**
   - SQLite errors (e.g., "directory does not exist") bubble up without context

3. **CLI Error Messages Inconsistent**
   - Some commands use `ora` spinner, others don't
   - JSON output on error not standardized

---

## Missing Tests

| Area | Missing Tests |
|------|---------------|
| **Integration** | Full pipeline test (loader → indexer → search → CLI retrieve) |
| **Integration** | Multi-guide indexing and search |
| **Integration** | Filter combinations (ecosystem + category + status) |
| **Integration** | Pagination (limit/offset) |
| **Integration** | CLI command error handling |
| **Integration** | MCP server tool execution |
| **Unit** | `packages/core` - no tests |
| **Unit** | `packages/config` - no tests |
| **Unit** | `packages/compatibility` - no tests |
| **Unit** | `packages/analyzers` - no tests |
| **Unit** | `packages/integrations` - no tests |
| **Unit** | `apps/cli` - no tests |
| **Unit** | `apps/mcp-server` - no tests |
| **Edge Cases** | Concurrent indexer/search access |
| **Edge Cases** | Large guide content (>1MB) |
| **Edge Cases** | Unicode/special characters in queries |
| **Edge Cases** | Database corruption recovery |
| **Edge Cases** | Schema validation edge cases |

---

## Security and Reliability Concerns

1. **No Input Sanitization on CLI Commands**
   - Query strings passed directly to FTS5 MATCH without escaping
   - Potential for FTS5 injection (though SQLite FTS5 MATCH syntax is limited)

2. **Database Path Traversal**
   - `config.dataDir` user-controlled, joined with `guides.db` - could allow arbitrary file write if not validated

3. **No Rate Limiting on MCP Server**
   - `search_guidance` and `retrieve_guide` tools have no rate limits
   - Could be abused for DoS

4. **Checksum Validation Not Enforced**
   - `GuideEntry.checksum` optional, not verified on load
   - No integrity checking of indexed content

5. **Hardcoded Test UUIDs in Production Data**
   - `architecture-and-components.md` uses `11111111-1111-1111-1111-111111111111`
   - Conflicts with test fixtures using same UUID

6. **No Database Migration Strategy**
   - Schema changes would break existing databases
   - No version tracking in database

---

## Recommended Fixes (Ranked by Severity)

### P0 - Critical (Block Milestone 2)

1. **Create `workspace-indicator.md` guide** at `knowledge/quickshell/fundamentals/workspace-indicator.md` with valid frontmatter and content about WorkspaceIndicator component
2. **Fix BM25 scoring** in `packages/retrieval/src/search.ts:81-117` - ensure scores are always positive
3. **Add integration test** at `tests/integration/vertical-slice.test.ts` running full pipeline
4. **Fix FTS5 tokenizer** or add content preprocessing to handle camelCase → spaced matching

### P1 - High (Before Milestone 2)

5. **Add `dataDir` to default config** or auto-detect project data directory
6. **Implement camelCase splitting** in search query or indexer (e.g., `WorkspaceIndicator` → `workspace indicator`)
7. **Add unit tests** for core, config, compatibility, analyzers, integrations, cli, mcp-server
8. **Fix validator warnings** - either make them actionable or suppress for valid guides

### P2 - Medium

9. **Enhance skill generation** to reference specific guides/ecosystems dynamically
10. **Add resource cleanup** - automatic DB close on process exit, context managers
11. **Standardize CLI error output** - consistent JSON format for errors
12. **Add input validation/sanitization** for search queries and CLI arguments

### P3 - Low

13. **Add database migration framework**
14. **Implement checksum verification** on guide load
15. **Add offline source type** to `SourceReference` schema
16. **Add rate limiting** to MCP server tools
17. **Replace hardcoded UUIDs** in guides with proper UUIDv4

---

## Conclusion

The Milestone 1 vertical slice **does not meet acceptance criteria**. The core infrastructure is solid (build passes, unit tests pass, loader/indexer/search/CLI work), but the primary deliverable (Workspace Indicator guide) is missing, the integration test doesn't exist, and the search functionality has critical bugs preventing the "workspace indicator" query from working.

**Recommendation**: Do not proceed to Milestone 2 until P0 fixes are complete and verified.