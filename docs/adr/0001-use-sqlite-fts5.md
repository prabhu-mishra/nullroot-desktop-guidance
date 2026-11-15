# ADR 0001: Use SQLite with FTS5 for Knowledge Storage and Search

## Status
Accepted

## Context
NRDG needs a local, offline-first storage solution for:
- Knowledge guides with rich metadata
- Full-text search across guide content
- Filtering by ecosystem, category, version, verification status
- Ranking results by relevance (BM25)
- Compatibility database with version ranges

Requirements:
- Zero external dependencies (no database server)
- ACID transactions for data integrity
- Full-text search with ranking
- Embeddable in Node.js application
- Cross-platform (Linux, macOS, Windows)
- Mature, well-tested technology

## Decision
Use **SQLite** with **FTS5 (Full-Text Search 5)** extension via `better-sqlite3` Node.js binding.

### Schema Design

```sql
-- Guides table with FTS5 virtual table
CREATE VIRTUAL TABLE guides USING fts5(
  id UNINDEXED,
  title,
  ecosystem UNINDEXED,
  category UNINDEXED,
  versions UNINDEXED,
  status UNINDEXED,
  last_verified UNINDEXED,
  tags UNINDEXED,
  content,
  tokenize = 'porter unicode61'
);

-- Metadata table for schema versioning and config
CREATE TABLE metadata (
  key TEXT PRIMARY KEY,
  value TEXT NOT NULL
);

-- Compatibility database
CREATE TABLE compatibility (
  id TEXT PRIMARY KEY,
  ecosystem TEXT NOT NULL,
  component TEXT NOT NULL,
  api TEXT NOT NULL,
  first_supported TEXT NOT NULL,
  deprecated_in TEXT,
  removed_in TEXT,
  replacement TEXT,
  source TEXT NOT NULL,
  verified_date TEXT NOT NULL,
  notes TEXT
);

CREATE INDEX idx_compat_ecosystem ON compatibility(ecosystem);
CREATE INDEX idx_compat_component ON compatibility(component);
CREATE INDEX idx_compat_api ON compatibility(api);
```

### Search Implementation

```typescript
// FTS5 MATCH query with BM25 ranking
const results = db.prepare(`
  SELECT rowid, rank, id, title, ecosystem, category
  FROM guides
  WHERE guides MATCH ?
  ORDER BY rank
  LIMIT ?
`).all(query, limit);
```

BM25 parameters: `k1=1.2`, `b=0.75` (configurable)

## Consequences

### Positive
- **Zero external dependencies**: SQLite is embedded, no server needed
- **FTS5 built-in**: Porter stemming, Unicode support, BM25 ranking
- **ACID transactions**: Safe concurrent access, crash recovery
- **Single file**: Easy backup, copy, distribution
- **Performance**: Sub-millisecond searches on 10k+ documents
- **Portability**: Works on all Node.js supported platforms
- **TypeScript support**: `better-sqlite3` has excellent types

### Negative
- **No horizontal scaling**: Single-node only (acceptable for offline-first)
- **Write concurrency**: Single writer (WAL mode mitigates)
- **Schema migrations**: Manual migration system needed
- **Binary size**: `better-sqlite3` adds ~2MB native binary

## Alternatives Considered

| Alternative | Evaluation |
|-------------|------------|
| **PostgreSQL + pg_trgm** | Requires server, overkill for local tool |
| **Meilisearch/Typesense** | External service, not offline-first |
| **Lunr.js / FlexSearch** | Pure JS, slower on large datasets, no persistence |
| **SQLite without FTS5** | No full-text search, would need custom indexing |
| **LevelDB/RocksDB** | No built-in FTS, more complex |
| **JSON files + custom index** | No ACID, manual index management, slow search |

## Implementation Notes

- Use WAL mode (`PRAGMA journal_mode = WAL`) for better concurrency
- Prepare statements for all queries (security + performance)
- Run `OPTIMIZE` periodically for FTS5 performance
- Batch inserts with transactions for ingestion performance
- Store `rowid` as guide ID for fast lookups