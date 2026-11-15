# ADR 0003: Zod for Runtime Schema Validation

## Status
Accepted

## Context
NRDG handles multiple data types that cross trust boundaries:
- Knowledge guide frontmatter (user-edited markdown files)
- Configuration files (user-edited JSON)
- MCP tool inputs (from AI agents)
- CLI arguments (from shell)
- Source manifests (from ingestion pipeline)
- Compatibility database entries

Requirements:
- TypeScript compile-time types + runtime validation
- Clear error messages for users/AI agents
- Composable, reusable schemas
- No `any` types in validated data paths
- Performance: validation should be fast

## Decision
Use **Zod** as the single schema validation library across all packages.

### Why Zod?

| Criterion | Zod | io-ts | Valibot | Joi | JSON Schema |
|-----------|-----|-------|---------|-----|-------------|
| TypeScript inference | ✅ First-class | ✅ Good | ✅ Good | ❌ Separate types | ❌ No inference |
| Bundle size | ~8KB | ~12KB | ~5KB | ~15KB | N/A |
| Performance | Fast | Medium | Fast | Slow | N/A |
| Error messages | Excellent | Good | Good | Excellent | N/A |
| Composability | ✅ `.extend()`, `.merge()` | ✅ | ✅ | ✅ | Limited |
| Discriminated unions | ✅ | ✅ | ✅ | ❌ | ✅ |
| Async refinement | ✅ | ✅ | ✅ | ✅ | ❌ |

### Usage Pattern

```typescript
// schemas.ts - Single source of truth
import { z } from 'zod';

export const GuideEntrySchema = z.object({
  id: z.string().uuid(),
  title: z.string().min(1).max(200),
  ecosystem: z.enum(['quickshell', 'hyprland', 'qt-qml', 'lua', 'wayland', 'linux-desktop']),
  category: z.string().min(1),
  versions: z.array(z.string()).min(1),
  sources: z.array(SourceReferenceSchema).min(1),
  status: z.enum(['verified', 'reviewed', 'community', 'unverified', 'deprecated']),
  lastVerified: z.string().datetime(),
  tags: z.array(z.string()).default([]),
  checksum: z.string().optional(),
});

// Type inferred automatically
export type GuideEntry = z.infer<typeof GuideEntrySchema>;

// Validation function with typed result
export function validateGuideEntry(data: unknown): Result<GuideEntry, ValidationError> {
  const result = GuideEntrySchema.safeParse(data);
  if (result.success) return { ok: true, value: result.data };
  return { ok: false, error: new ValidationError(...) };
}
```

### Cross-Package Schema Sharing

Schemas live in their owning package but types are re-exported from `@nullroot/core`:

```typescript
// packages/core/src/types.ts
export type GuideEntry = import('@nullroot/knowledge').GuideEntry;
// Or use z.infer directly from shared schema package
```

Actually, better: create a `@nullroot/schemas` package or put shared schemas in `@nullroot/core`. Current approach: core defines TypeScript interfaces, knowledge defines Zod schemas, both kept in sync.

### Validation at Boundaries

| Boundary | Validation |
|----------|------------|
| File → GuideEntry | `validateGuideEntry()` in loader |
| Config file → NRDGConfig | `validateConfig()` in config manager |
| MCP request → ToolInput | Zod schema in tool definition |
| CLI args → Command | Commander.js + Zod for complex args |
| Ingestion → SourceManifest | `createSourceManifest()` validates |
| Compat DB → CompatibilityEntry | Insert validates via schema |

### Error Handling

All validation errors convert to typed domain errors:

```typescript
export class ValidationError extends NullRootError {
  constructor(
    message: string,
    public readonly issues: Array<{ path: string; message: string }>
  ) {
    super(message, 'VALIDATION_ERROR', { issues });
  }
}
```

## Consequences

### Positive
- **Single source of truth**: Schema = Type + Validation
- **Excellent DX**: Autocomplete for valid fields, errors show exact path
- **Composable**: `.extend()`, `.pick()`, `.omit()`, `.merge()`, discriminated unions
- **Performance**: Compiled validators, minimal overhead
- **Ecosystem**: Works with React Hook Form, tRPC, Fastify, etc.

### Negative
- **Bundle size**: ~8KB (acceptable for CLI/server)
- **Learning curve**: Advanced features (refinements, transforms) take time
- **Not standard**: JSON Schema is more portable but less ergonomic

## Alternatives Considered

| Alternative | Evaluation |
|-------------|------------|
| **io-ts** | More FP-oriented, slower, less intuitive errors |
| **Valibot** | Smaller but newer, less mature ecosystem |
| **Joi** | No TS inference, larger bundle |
| **TypeBox** | JSON Schema focus, verbose |
| **Custom validation** | Reinventing wheel, error-prone |
| **TypeScript only** | No runtime validation, unsafe at boundaries |

## Implementation Guidelines

1. **Define schemas in owning package** (knowledge, compatibility, config)
2. **Export both schema and inferred type** (`export type T = z.infer<typeof Schema>`)
3. **Use `.safeParse()` never `.parse()`** (no exceptions)
4. **Convert to `Result<T, ValidationError>`** at package boundaries
5. **Co-locate validation functions** with schemas
6. **Document constraints in schema** (`.min()`, `.max()`, `.regex()`)
7. **Use `z.enum()` for finite sets** (ecosystem, status, severity)
8. **Prefer `z.string().datetime()` over regex** for ISO dates
9. **Use `.default()` for optional fields with sensible defaults**
10. **Avoid `.transform()` at boundaries** (keep input/output clear)