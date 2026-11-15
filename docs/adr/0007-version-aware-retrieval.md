# ADR 0007: Version-Aware Guidance Retrieval

## Status
Accepted

## Context
NRDG guides are versioned - each guide declares which software versions it applies to via the `versions` field in frontmatter. When developers work with a specific version (e.g., Hyprland 0.40), they need guidance that:
- Is applicable to their version
- Doesn't recommend APIs that don't exist yet
- Warns about deprecated/removed APIs in their version

Currently, search returns all matching guides regardless of version. We need version-aware filtering at both search and retrieval time.

## Decision
Implement **version-aware retrieval** with three layers:

### Layer 1: Guide Metadata (Source of Truth)
Guides declare applicable versions in frontmatter:
```yaml
---
id: "uuid"
title: "Workspace Indicator Guide"
ecosystem: "quickshell"
category: "fundamentals"
versions: ["1.0", "1.1", "1.2"]  # Guide applies to these versions
---
```

### Layer 2: Search Filtering
Extend `SearchOptions` and MCP `search_guidance` with `versions` filter:
```typescript
// packages/core/src/types.ts (existing, enhanced)
export interface SearchOptions {
  query: string;
  ecosystems?: Ecosystem[];
  categories?: Category[];
  versions?: string[];        // NEW: Filter guides by target version
  status?: VerificationStatus[];
  limit?: number;
  offset?: number;
}
```

**Filter Logic**: Guide matches if ANY of its `versions` matches ANY of the query `versions`:
```typescript
// In SearchEngine.search()
if (options.versions && options.versions.length > 0) {
  const guideVersions = JSON.parse(metadata.versions);
  const hasMatchingVersion = options.versions.some(v => guideVersions.includes(v));
  if (!hasMatchingVersion) continue; // Skip this result
}
```

### Layer 3: Version-Aware Content Enrichment
When retrieving a guide for a specific version, enrich with:
- Compatibility warnings for deprecated/removed APIs in that version
- Version-specific notes from guide's `compatibility` section
- Migration suggestions from compatibility database

```typescript
// packages/retrieval/src/search.ts - enhanced getById
async getById(
  id: string, 
  targetVersion?: string  // NEW: optional version context
): Promise<Result<SearchResult | null, Error>> {
  const result = await this.getByIdInternal(id);
  if (!result.ok || !result.value || !targetVersion) {
    return result;
  }
  
  // Enrich with version-specific info
  const enriched = await this.enrichWithVersionInfo(result.value, targetVersion);
  return { ok: true, value: enriched };
}

private async enrichWithVersionInfo(
  guide: SearchResult, 
  targetVersion: string
): Promise<SearchResult> {
  // Query compatibility DB for guide's APIs at targetVersion
  // Add warnings to snippet/metadata
  // Return enhanced result
}
```

### Database Schema (No Changes Needed)
The `guide_metadata` table already stores `versions` as JSON:
```sql
CREATE TABLE guide_metadata (
  ...
  versions TEXT NOT NULL,  -- JSON array: '["1.0", "1.1", "1.2"]'
  ...
);
```

### API Integration Points

#### 1. SearchEngine (Retrieval Package)
```typescript
// packages/retrieval/src/search.ts
interface SearchOptions {
  // ... existing
  versions?: string[];
}

// Filter applied post-FTS5, pre-ranking
```

#### 2. KnowledgeIndexer (Indexing)
```typescript
// packages/retrieval/src/indexer.ts - stores versions in metadata
private storeMetadata(guide: GuideEntry): void {
  this.db.prepare(`
    INSERT OR REPLACE INTO guide_metadata
    (id, title, ecosystem, category, versions, status, last_verified, tags, checksum)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(
    guide.id,
    guide.title,
    guide.ecosystem,
    guide.category,
    JSON.stringify(guide.versions),  // Store as JSON
    guide.status,
    guide.lastVerified,
    JSON.stringify(guide.tags),
    guide.checksum ?? null
  );
}
```

#### 3. CLI Commands
```bash
# Search with version filter
nrdg search "workspace" --version 1.1 --ecosystem quickshell

# Retrieve with version context
nrdg retrieve <id> --version 1.1
```

#### 4. MCP Tools
```typescript
// packages/integrations/src/mcp.ts
{
  name: 'search_guidance',
  inputSchema: {
    properties: {
      // ... existing
      versions: { 
        type: 'array', 
        items: { type: 'string' },
        description: 'Filter by target version(s)' 
      }
    }
  }
},
{
  name: 'retrieve_guide',
  inputSchema: {
    properties: {
      id: { type: 'string', format: 'uuid' },
      version: { type: 'string', description: 'Target version for compatibility context' }
    },
    required: ['id']
  }
}
```

### Version Resolution Strategy

When user doesn't specify version, attempt auto-detection:

```typescript
// In CLI/MCP handlers
async function resolveTargetVersion(
  explicitVersion?: string,
  ecosystem?: Ecosystem
): Promise<string | undefined> {
  if (explicitVersion) return explicitVersion;
  
  // Try environment detection
  const env = await detectEnvironment();
  switch (ecosystem) {
    case 'quickshell': return env.quickshell?.version;
    case 'hyprland': return env.hyprland?.version;
    case 'qt-qml': return env.qt?.version;
    case 'lua': return env.lua?.version;
    default: return undefined;
  }
}
```

### Compatibility Enrichment Details

When `targetVersion` provided to `retrieve_guide`:

1. **Extract APIs from guide**: Parse `guide.content.compatibility` array
2. **Query compatibility DB**: For each API, check compatibility at `targetVersion`
3. **Generate warnings**: For deprecated/removed APIs, add to result
4. **Enhance output**: Include in `metadata.warnings` or similar field

```typescript
interface VersionAwareGuide extends SearchResult {
  metadata: SearchResult['metadata'] & {
    versionWarnings?: Array<{
      api: string;
      status: 'deprecated' | 'removed' | 'introduced';
      message: string;
      replacement?: string;
    }>;
    targetVersion?: string;
  };
}
```

### Example Flow

**User**: Working on Quickshell 1.1 project, searches for "workspace indicator"

1. `nrdg search "workspace indicator" --version 1.1 --ecosystem quickshell`
2. SearchEngine:
   - FTS5 MATCH "workspace indicator"
   - Filter: `ecosystem = 'quickshell'`
   - Filter: `versions` array contains "1.1"
   - Returns matching guides
3. User selects guide, runs `nrdg retrieve <id> --version 1.1`
4. Retrieval:
   - Loads guide
   - Checks guide's compatibility notes against 1.1
   - Adds warnings: "WorkspaceIndicator.model deprecated in 1.2, use .workspaces"
   - Returns enriched guide

### Edge Cases

| Scenario | Behavior |
|----------|----------|
| Guide has no versions | Treated as compatible with all versions (legacy) |
| Target version not in guide versions | Guide excluded from search results |
| Multiple versions in query | OR logic: matches if ANY version matches |
| Version format mismatch | Normalize both sides (strip 'v', pad segments) |
| Compatibility DB missing entry | No warning generated (silent) |

## Consequences

### Positive
- **Precise guidance**: Developers get version-relevant info
- **Prevents errors**: Warns about deprecated/removed APIs
- **Backward compatible**: Existing guides without versions still work
- **Agent-friendly**: MCP tools expose version filtering
- **Single source**: Guide frontmatter = version metadata

### Negative
- **Maintenance**: Guide versions must be kept accurate
- **Complexity**: Version comparison logic in multiple places
- **False negatives**: Overly strict version matching could hide relevant guides

## Alternatives Considered

| Alternative | Evaluation |
|-------------|------------|
| **Per-version guide copies** | Duplicates content; maintenance nightmare |
| **Version in guide ID** | `guide-v1.0`, `guide-v1.1`; breaks ID stability |
| **External version index** | Adds complexity; not needed for current scale |
| **Client-side filtering only** | Wastes bandwidth; search returns irrelevant results |

## Implementation Notes

1. **Version normalization**: Create `normalizeVersion(v: string): string` in `@nullroot/shared`
   - Strip leading 'v': `v1.2.0` → `1.2.0`
   - Pad segments: `1.2` → `1.2.0`
   - Handle date-based: `0.45` → `0.45.0`

2. **Search performance**: Version filter applied after FTS5 but before BM25 scoring
   - Minimal overhead (JSON parse + array includes)
   - Index on `guide_metadata.versions` not needed (JSON column)

3. **Testing**: 
   - Guides with multiple versions
   - Queries with multiple target versions
   - Edge case: version "1.0" matches guide with "1.0.0"
   - Auto-detection fallback

4. **Migration**: Existing guides without `versions` field → treat as compatible with all