# ADR 0004: Incremental Indexing Strategy

## Status
Accepted

## Context
NRDG's knowledge indexer must support re-indexing efficiently. With 100+ guides across 6 ecosystems, full rebuilds on every change would be too slow for interactive use. We need an incremental indexing strategy that:
- Detects unchanged guides quickly
- Avoids re-processing valid content
- Maintains index consistency
- Works offline with local filesystem

## Decision
Use **file mtime + content checksum** for incremental indexing with a two-tier approach:

### Tier 1: Mtime Check (Fast Path)
- Store file `mtime` in `guide_metadata` table alongside `checksum`
- On re-index: `stat()` each guide file, compare mtime
- If mtime unchanged → skip (assume content unchanged)
- Cost: ~1 syscall per file, sub-millisecond

### Tier 2: Checksum Verification (Definitive)
- If mtime changed OR no mtime stored → compute SHA-256 checksum
- Compare with stored `checksum` in `guide_metadata`
- If checksum matches → skip (file was touched but content same)
- If checksum differs → re-index guide
- Cost: Read file + hash, ~1-5ms per file

### Database Schema Changes
```sql
-- Add to guide_metadata table
ALTER TABLE guide_metadata ADD COLUMN checksum TEXT;
ALTER TABLE guide_metadata ADD COLUMN mtime INTEGER; -- Unix epoch ms

-- Index for fast lookup
CREATE INDEX IF NOT EXISTS idx_guide_checksum ON guide_metadata(checksum);
CREATE INDEX IF NOT EXISTS idx_guide_mtime ON guide_metadata(mtime);
```

### Indexer API
```typescript
// New method on KnowledgeIndexer
async indexGuidesIncremental(
  guides: GuideEntry[],
  options?: { force?: boolean }  // force = full rebuild
): Promise<Result<{ indexed: number; skipped: number; errors: number }, Error>>;

// Helper to get existing metadata
async getExistingMetadata(): Promise<Map<string, { checksum: string; mtime: number }>>;
```

### Loader Integration
```typescript
// KnowledgeLoader returns metadata for incremental decisions
interface LoadedGuide {
  entry: GuideEntry;
  filePath: string;
  mtime: number;
  checksum: string;
}

async loadGuideWithMetadata(filePath: string): Promise<Result<LoadedGuide, Error>>;
```

### Edge Cases Handled
| Scenario | Behavior |
|----------|----------|
| File deleted | Guide removed from index (via rebuild or explicit delete) |
| File moved | Treated as new guide (different path = different ID) |
| Mtime preserved, content changed | Checksum catches it (Tier 2) |
| Checksum collision (SHA-256) | Astronomically unlikely; accept risk |
| Clock skew | Mtime may be unreliable; checksum is definitive |
| Concurrent indexers | SQLite WAL mode handles; last writer wins |

## Consequences

### Positive
- **Fast re-index**: Typical case (few changed files) completes in <1s
- **Simple implementation**: Two-tier check is easy to understand and debug
- **No external deps**: Uses Node.js `fs.stat` + Web Crypto API
- **Reliable**: Checksum is cryptographic guarantee of content identity

### Negative
- **Initial scan**: Must compute checksum for all guides on first index
- **Storage overhead**: ~64 bytes per guide for checksum + mtime
- **Mtime limitations**: Network filesystems may have coarse mtime granularity

## Alternatives Considered

| Alternative | Evaluation |
|-------------|------------|
| **Content hash only** | Simpler but reads every file every time; slower for large repos |
| **Git status** | Requires git; not all knowledge dirs are git repos; complex |
| **File size + mtime** | False positives (same size, different content); unreliable |
| **Database triggers** | SQLite doesn't support FS triggers; overcomplicated |
| **Watchman/fsnotify** | Adds native dependency; overkill for CLI tool |

## Implementation Notes

1. **Migration**: Add columns with `NULL` default; backfill on first `indexGuidesIncremental()` call
2. **Backward compatibility**: If checksum/mtime missing, treat as "needs indexing"
3. **Force rebuild**: `--rebuild` flag clears metadata and re-indexes all
4. **Statistics**: Report `indexed`, `skipped`, `errors` in CLI output
5. **Testing**: Verify with fixture projects: add guide, modify guide, delete guide, touch guide