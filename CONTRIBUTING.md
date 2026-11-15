# Contributing to NullRoot Desktop Guidance

Thank you for contributing to NullRoot Desktop Guidance! This document outlines the development workflow, coding standards, and contribution process.

## Development Workflow

### Branching Strategy

- `main` - Stable releases only
- `develop` - Integration branch for features
- `feature/<name>` - Feature branches from `develop`
- `fix/<name>` - Bug fix branches from `develop`
- `release/<version>` - Release preparation branches

### Commit Messages

Follow [Conventional Commits](https://www.conventionalcommits.org/):

```
<type>(<scope>): <description>

[optional body]

[optional footer]
```

Types:
- `feat` - New feature
- `fix` - Bug fix
- `docs` - Documentation only
- `refactor` - Code restructuring
- `test` - Adding tests
- `chore` - Maintenance tasks

Examples:
```
feat(cli): add search command with BM25 ranking
fix(retrieval): handle empty query in FTS5 index
docs(knowledge): update Quickshell guide metadata schema
```

### Pull Requests

1. Create feature branch from `develop`
2. Implement changes with tests
3. Run full test suite: `pnpm test`
4. Run type checking: `pnpm typecheck`
5. Run linting: `pnpm lint`
6. Open PR against `develop`
7. Require review from team lead
8. Squash and merge after approval

## Coding Standards

### TypeScript

- Strict mode enabled (`strict: true`)
- No `any` types without justification
- Use `type` over `interface` for unions/intersections
- Prefer `const` assertions for literal types
- Use Zod schemas for runtime validation
- Document public APIs with JSDoc

### File Organization

```
src/
├── index.ts              # Public exports only
├── <domain>/
│   ├── index.ts          # Domain exports
│   ├── types.ts          # Domain types
│   ├── schemas.ts        # Zod schemas
│   ├── <feature>.ts      # Implementation
│   └── <feature>.test.ts # Unit tests
```

### Naming Conventions

- Files: kebab-case (`search-engine.ts`)
- Classes: PascalCase (`SearchEngine`)
- Functions/Variables: camelCase (`buildIndex`)
- Types/Interfaces: PascalCase (`SearchResult`)
- Constants: UPPER_SNAKE_CASE (`MAX_RESULTS`)
- Private members: `#prefix` (ES2022 private fields)

### Error Handling

- Use `Result<T, E>` pattern for fallible operations
- Never throw for expected failures
- Include context in error messages
- Use custom error classes for domain errors

```typescript
class KnowledgeNotFoundError extends Error {
  constructor(public readonly id: string) {
    super(`Knowledge entry not found: ${id}`);
    this.name = 'KnowledgeNotFoundError';
  }
}
```

### Testing

- Unit tests co-located with source (`*.test.ts`)
- Integration tests in `tests/integration/`
- Use Vitest with `@vitest/coverage-v8`
- Mock external dependencies
- Test edge cases and error paths
- Minimum 80% coverage for core packages

## Package Development

### Creating a New Package

1. Create directory under `packages/<name>/`
2. Add `package.json` with `@nullroot/<name>` name
3. Add `tsconfig.json` extending root config
4. Add `vitest.config.ts` for testing
5. Implement in `src/`
6. Export from `src/index.ts`
7. Add to root `package.json` devDependencies if needed

### Package.json Template

```json
{
  "name": "@nullroot/<name>",
  "version": "0.0.0",
  "private": true,
  "main": "./dist/index.js",
  "types": "./dist/index.d.ts",
  "exports": {
    ".": {
      "types": "./dist/index.d.ts",
      "import": "./dist/index.js",
      "require": "./dist/index.js"
    }
  },
  "scripts": {
    "build": "tsc -b",
    "test": "vitest run",
    "test:watch": "vitest",
    "typecheck": "tsc --noEmit",
    "lint": "eslint src --ext .ts",
    "clean": "rm -rf dist"
  },
  "dependencies": {
    "@nullroot/shared": "workspace:*"
  },
  "devDependencies": {
    "typescript": "^5.7.0",
    "vitest": "^2.1.0",
    "@types/node": "^22.0.0"
  }
}
```

## Knowledge Contributions

### Adding New Guides

1. Determine ecosystem and category
2. Create markdown file in `knowledge/<ecosystem>/<category>/`
3. Include required frontmatter metadata
4. Follow guide content structure
5. Add source references
6. Set verification status honestly

### Guide Frontmatter

```yaml
---
id: "unique-guide-id"
title: "Guide Title"
ecosystem: "quickskills|hyprland|qt-qml|lua|wayland|linux-desktop"
category: "category-name"
versions: ["1.0", "2.0"]
sources:
  - url: "https://official.source"
    title: "Official Documentation"
    retrieved: "2026-01-15"
status: "verified|reviewed|community|unverified|deprecated"
lastVerified: "2026-01-15"
tags: ["tag1", "tag2"]
checksum: "sha256-hash"
---
```

### Guide Content Structure

1. Technical Explanation
2. Correct Implementation Patterns
3. Working Examples
4. Common Mistakes
5. API Compatibility Notes
6. Performance Considerations
7. Debugging Guidance
8. Official References

### Source Attribution

- Always reference official documentation
- Include retrieval date
- Note version applicability
- Respect upstream licenses
- Do not copy verbatim without permission

## Architecture Decisions

Document significant decisions in `docs/adr/`:

```
docs/adr/
├── 0001-use-sqlite-fts5.md
├── 0002-bm25-ranking.md
├── 0003-zod-validation.md
```

ADR Template:
```markdown
# ADR <number>: <Title>

## Status
Accepted | Proposed | Superseded

## Context
What problem are we solving?

## Decision
What did we decide?

## Consequences
What are the trade-offs?

## Alternatives Considered
What else was evaluated?
```

## Security

- No telemetry without explicit opt-in
- No automatic network requests
- Read-only project scanning by default
- Explicit approval for system changes
- Redact secrets from all output
- Validate all external input with Zod

## Release Process

1. Update version in `package.json` (root and packages)
2. Update `CHANGELOG.md`
3. Create release branch
4. Run full CI pipeline
5. Tag release: `git tag v<version>`
6. Merge to `main`
7. Publish to npm (when ready)

## Code Review Checklist

- [ ] Tests pass and coverage maintained
- [ ] Types are correct and strict
- [ ] No `any` without justification
- [ ] Error handling follows patterns
- [ ] Documentation updated
- [ ] No breaking changes without ADR
- [ ] Security considerations addressed
- [ ] Performance impact assessed

## Getting Help

- Check existing issues and discussions
- Review architecture documents
- Ask in team discussions
- Reference official upstream docs

---

By contributing, you agree to license your contributions under the MIT License.