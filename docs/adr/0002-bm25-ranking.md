# ADR 0002: BM25 Ranking for Keyword Search

## Status
Accepted

## Context
NRDG's search engine needs to rank results by relevance for keyword queries across technical documentation. The ranking algorithm must:
- Work offline with no external APIs
- Handle technical terminology (API names, function names, config keys)
- Support filtering by ecosystem, category, version
- Be fast enough for interactive use (<100ms)
- Produce intuitive rankings for developers

## Decision
Use **BM25 (Best Matching 25)** as the primary ranking algorithm, implemented via SQLite FTS5's built-in `rank` function with custom BM25 parameters.

### BM25 Formula

```
score(D, Q) = Σ IDF(qi) * (f(qi, D) * (k1 + 1)) / (f(qi, D) + k1 * (1 - b + b * |D| / avgdl))

Where:
- D = document, Q = query terms qi
- f(qi, D) = term frequency of qi in D
- |D| = document length (term count)
- avgdl = average document length
- k1 = term frequency saturation (default 1.2)
- b = length normalization (default 0.75)
- IDF(qi) = log((N - n(qi) + 0.5) / (n(qi) + 0.5) + 1)
  - N = total documents
  - n(qi) = documents containing qi
```

### FTS5 Integration

SQLite FTS5 provides `bm25()` function with configurable parameters:

```sql
-- Create table with custom BM25
CREATE VIRTUAL TABLE guides USING fts5(
  title, content,
  tokenize = 'porter unicode61',
  rank = 'bm25(1.2, 0.75)'
);

-- Query with ranking
SELECT rowid, bm25(guides) as rank, title, ecosystem
FROM guides
WHERE guides MATCH ?
ORDER BY rank
LIMIT 10;
```

### Parameter Tuning

| Parameter | Value | Rationale |
|-----------|-------|-----------|
| `k1` | 1.2 | Standard default; controls TF saturation. Lower = quicker saturation |
| `b` | 0.75 | Standard default; controls length normalization. 0 = no normalization, 1 = full |

For technical documentation:
- `k1=1.2` works well for exact API matches
- `b=0.75` balances short snippets vs long guides

### Tokenization

Use `porter unicode61` tokenizer:
- **Porter stemming**: Reduces "configuring" → "configur", "indexes" → "index"
- **Unicode61**: Unicode 6.1 word boundaries, handles non-ASCII

Alternative considered: `trigram` for exact substring matching, but:
- Larger index size
- No stemming benefit for technical terms
- Overkill for our use case

## Consequences

### Positive
- **Proven algorithm**: Industry standard for decades (used by Lucene, PostgreSQL, SQLite)
- **No external deps**: Built into FTS5
- **Fast**: C implementation, sub-millisecond ranking
- **Configurable**: Parameters tunable per ecosystem
- **Explainable**: Scores have clear mathematical basis

### Negative
- **No semantic understanding**: "window" ≠ "workspace" even if related
- **Stemming artifacts**: "config" stems to "configur", may match unrelated terms
- **Query expansion not built-in**: Synonyms/aliases need manual handling

## Alternatives Considered

| Alternative | Evaluation |
|-------------|------------|
| **TF-IDF** | Simpler but no length normalization, worse for varied doc lengths |
| **Vector Space Model** | Requires embeddings, not offline-first |
| **Custom scoring** | Reinventing wheel, hard to tune |
| **Learning to Rank** | Needs training data, overkill |
| **Semantic search only** | Requires embeddings, optional enhancement not replacement |

## Hybrid Approach (Future)

For Phase 2+, combine BM25 with optional semantic embeddings:

```
final_score = α * normalized_bm25 + (1 - α) * cosine_similarity(embedding_query, embedding_doc)
```

Where `α = 0.7` (keyword-heavy for technical docs).

Semantic provider interface:
```typescript
interface SemanticProvider {
  embed(text: string): Promise<Float32Array>;
  name: string;
  dimension: number;
}
```

Supported providers (all local):
- **ONNX Runtime** + `sentence-transformers` models
- **Transformers.js** (WebAssembly, no native deps)
- **llama.cpp** + embedding models
- **Custom** (pluggable interface)

## Implementation Notes

- FTS5 `rank` column returns pre-computed BM25 score
- Lower rank = better match (FTS5 convention)
- Use `ORDER BY rank ASC` for best results first
- Pagination via `LIMIT/OFFSET` on ranked results
- Filter by ecosystem/category/version in application layer (post-FTS5)