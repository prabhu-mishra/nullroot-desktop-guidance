/**
 * Tests for KnowledgeLoader
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { KnowledgeLoader, createKnowledgeLoader } from './loader.js';
import { join } from 'path';
import { tmpdir } from 'os';
import { mkdirSync, writeFileSync, rmSync } from 'fs';

describe('KnowledgeLoader', () => {
  let testDir: string;
  let loader: KnowledgeLoader;

  beforeEach(() => {
    // Create a temporary directory for test files
    testDir = join(tmpdir(), `nullroot-test-${Date.now()}-${Math.random().toString(36).slice(2)}`);
    mkdirSync(testDir, { recursive: true });

    // Create ecosystem directories
    const ecosystems = ['quickshell', 'hyprland', 'qt-qml', 'lua', 'wayland', 'linux-desktop'];
    for (const eco of ecosystems) {
      mkdirSync(join(testDir, eco), { recursive: true });
    }

    loader = createKnowledgeLoader({
      guidesRoot: testDir,
      validate: true,
    });
  });

  afterEach(() => {
    // Clean up test directory
    try {
      rmSync(testDir, { recursive: true, force: true });
    } catch {
      // Ignore cleanup errors
    }
  });

  describe('parseGuide', () => {
    it('should parse a valid guide with YAML frontmatter', () => {
      const validGuide = `---
id: "123e4567-e89b-12d3-a456-426614174000"
title: "Test Guide"
ecosystem: "quickshell"
category: "fundamentals"
versions: ["1.0", "1.1"]
sources:
  - url: "https://example.com"
    title: "Example Source"
    ecosystem: "quickshell"
    retrieved: "2024-01-01T00:00:00Z"
    verificationState: "official"
status: "verified"
lastVerified: "2024-01-01T00:00:00Z"
tags: ["test", "example"]
---

# Explanation

This is a test guide.

## Patterns

### Pattern 1
Context: Some context
\`\`\`qml
import QtQuick
Rectangle { }
\`\`\`

## Examples

### Example 1
Runnable: true
Dependencies: dep1, dep2
\`\`\`qml
import QtQuick
Item { }
\`\`\`

## Mistakes

### Mistake 1
Problem: Something went wrong
Solution: Fix it this way
Severity: error

## Compatibility

### API Name
Introduced: 1.0
Deprecated: 2.0
Removed: 3.0
Replacement: NewAPI
Notes: Use NewAPI instead

## Performance

### Area 1
Impact: high
Description: This affects performance
Mitigation: Do this instead

## Debugging

### Symptom 1
Cause: Root cause
Diagnosis: How to diagnose
Resolution: How to fix
Tools: tool1, tool2

## References

- [Official Doc](https://example.com) (official)
`;

      const guidePath = join(testDir, 'quickshell', 'test-guide.md');
      writeFileSync(guidePath, validGuide);

      const result = loader.parseGuide(guidePath);

      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.value.frontmatter.id).toBe('123e4567-e89b-12d3-a456-426614174000');
        expect(result.value.frontmatter.title).toBe('Test Guide');
        expect(result.value.frontmatter.ecosystem).toBe('quickshell');
        expect(result.value.frontmatter.versions).toEqual(['1.0', '1.1']);
        expect(result.value.content).toContain('This is a test guide');
      }
    });

    it('should fail for file without frontmatter', () => {
      const invalidGuide = '# Just markdown\n\nNo frontmatter here.';

      const guidePath = join(testDir, 'quickshell', 'no-frontmatter.md');
      writeFileSync(guidePath, invalidGuide);

      const result = loader.parseGuide(guidePath);

      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.error.message).toContain('does not have YAML frontmatter');
      }
    });

    it('should fail for unclosed frontmatter delimiter', () => {
      const invalidGuide = `---
id: "123e4567-e89b-12d3-a456-426614174000"
title: "Test"
# Missing closing ---
`;

      const guidePath = join(testDir, 'quickshell', 'unclosed.md');
      writeFileSync(guidePath, invalidGuide);

      const result = loader.parseGuide(guidePath);

      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.error.message).toContain('unclosed frontmatter delimiter');
      }
    });

    it('should fail for invalid YAML in frontmatter', () => {
      const invalidGuide = `---
id: "123e4567-e89b-12d3-a456-426614174000"
title: "Test"
invalid yaml: [unclosed array
---
`;

      const guidePath = join(testDir, 'quickshell', 'invalid-yaml.md');
      writeFileSync(guidePath, invalidGuide);

      const result = loader.parseGuide(guidePath);

      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.error.message).toContain('Invalid YAML');
      }
    });

    it('should fail for non-object frontmatter', () => {
      const invalidGuide = `---
- item1
- item2
---
`;

      const guidePath = join(testDir, 'quickshell', 'non-object.md');
      writeFileSync(guidePath, invalidGuide);

      const result = loader.parseGuide(guidePath);

      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.error.message).toContain('must be a YAML object');
      }
    });
  });

  describe('loadGuide', () => {
    it('should load a valid guide entry', async () => {
      const validGuide = `---
id: "123e4567-e89b-12d3-a456-426614174000"
title: "Test Guide"
ecosystem: "quickshell"
category: "fundamentals"
versions: ["1.0"]
sources:
  - url: "https://example.com"
    title: "Example Source"
    ecosystem: "quickshell"
    retrieved: "2024-01-01T00:00:00Z"
    verificationState: "official"
status: "verified"
lastVerified: "2024-01-01T00:00:00Z"
tags: ["test"]
---

# Explanation

This is a test guide with explanation content.

## Patterns

### Pattern 1
\`\`\`qml
import QtQuick
Rectangle { }
\`\`\`

## Examples

### Example 1
\`\`\`qml
import QtQuick
Item { }
\`\`\`

## Mistakes

### Mistake 1
Problem: Something went wrong
Solution: Fix it this way
Severity: warning

## Compatibility

### API Name
Introduced: 1.0

## Performance

### Area 1
Impact: medium
Description: Performance note

## Debugging

### Symptom 1
Cause: Root cause
Diagnosis: How to diagnose
Resolution: How to fix

## References

- [Official Doc](https://example.com) (official)
`;

      const guidePath = join(testDir, 'quickshell', 'valid-guide.md');
      writeFileSync(guidePath, validGuide);

      const result = await loader.loadGuide(guidePath);

      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.value.id).toBe('123e4567-e89b-12d3-a456-426614174000');
        expect(result.value.title).toBe('Test Guide');
        expect(result.value.ecosystem).toBe('quickshell');
        expect(result.value.category).toBe('fundamentals');
        expect(result.value.versions).toEqual(['1.0']);
        expect(result.value.status).toBe('verified');
        expect(result.value.content.explanation).toContain('test guide');
        expect(result.value.content.patterns).toHaveLength(1);
        expect(result.value.content.examples).toHaveLength(1);
        expect(result.value.content.mistakes).toHaveLength(1);
        expect(result.value.content.compatibility).toHaveLength(1);
        expect(result.value.content.performance).toHaveLength(1);
        expect(result.value.content.debugging).toHaveLength(1);
        expect(result.value.content.references).toHaveLength(1);
        expect(result.value.checksum).toBeDefined();
      }
    });

    it('should fail for missing required fields', async () => {
      const invalidGuide = `---
id: "123e4567-e89b-12d3-a456-426614174000"
title: "Test Guide"
# Missing ecosystem, category, versions, sources, status, lastVerified
---
`;

      const guidePath = join(testDir, 'quickshell', 'missing-fields.md');
      writeFileSync(guidePath, invalidGuide);

      const result = await loader.loadGuide(guidePath);

      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.error.message).toContain('Missing required field');
      }
    });

    it('should fail validation for invalid schema', async () => {
      const invalidGuide = `---
id: "not-a-uuid"
title: "Test Guide"
ecosystem: "invalid-ecosystem"
category: "fundamentals"
versions: ["1.0"]
sources:
  - url: "not-a-url"
    title: "Example Source"
    ecosystem: "quickshell"
    retrieved: "2024-01-01T00:00:00Z"
    verificationState: "official"
status: "verified"
lastVerified: "2024-01-01T00:00:00Z"
---
`;

      const guidePath = join(testDir, 'quickshell', 'invalid-schema.md');
      writeFileSync(guidePath, invalidGuide);

      const result = await loader.loadGuide(guidePath);

      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.error.message).toContain('Validation failed');
      }
    });
  });

  describe('loadAllGuides', () => {
    it('should load all guides from all ecosystems', async () => {
      const guide1 = `---
id: "11111111-1111-1111-1111-111111111111"
title: "QuickShell Guide"
ecosystem: "quickshell"
category: "fundamentals"
versions: ["1.0"]
sources:
  - url: "https://example.com"
    title: "Source"
    ecosystem: "quickshell"
    retrieved: "2024-01-01T00:00:00Z"
    verificationState: "official"
status: "verified"
lastVerified: "2024-01-01T00:00:00Z"
---
# Explanation
Content
`;

      const guide2 = `---
id: "22222222-2222-2222-2222-222222222222"
title: "Hyprland Guide"
ecosystem: "hyprland"
category: "configuration"
versions: ["1.0"]
sources:
  - url: "https://example.com"
    title: "Source"
    ecosystem: "hyprland"
    retrieved: "2024-01-01T00:00:00Z"
    verificationState: "official"
status: "verified"
lastVerified: "2024-01-01T00:00:00Z"
---
# Explanation
Content
`;

      writeFileSync(join(testDir, 'quickshell', 'guide1.md'), guide1);
      writeFileSync(join(testDir, 'hyprland', 'guide2.md'), guide2);

      const result = await loader.loadAllGuides();

      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.value).toHaveLength(2);
        expect(result.value.map(g => g.ecosystem).sort()).toEqual(['hyprland', 'quickshell']);
      }
    });

    it('should skip invalid guides and continue loading valid ones', async () => {
      const validGuide = `---
id: "11111111-1111-1111-1111-111111111111"
title: "Valid Guide"
ecosystem: "quickshell"
category: "fundamentals"
versions: ["1.0"]
sources:
  - url: "https://example.com"
    title: "Source"
    ecosystem: "quickshell"
    retrieved: "2024-01-01T00:00:00Z"
    verificationState: "official"
status: "verified"
lastVerified: "2024-01-01T00:00:00Z"
---
# Explanation
Content
`;

      const invalidGuide = `# No frontmatter`;

      writeFileSync(join(testDir, 'quickshell', 'valid.md'), validGuide);
      writeFileSync(join(testDir, 'quickshell', 'invalid.md'), invalidGuide);

      const result = await loader.loadAllGuides();

      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.value).toHaveLength(1);
        expect(result.value[0].title).toBe('Valid Guide');
      }
    });
  });

  describe('parseContent', () => {
    it('should parse patterns with context', () => {
      const content = `
## Patterns

### My Pattern
Context: This is the context
\`\`\`qml
Item { }
\`\`\`
`;

      // Access private method via type assertion for testing
      const parsed = (loader as unknown as { parseContent: (content: string) => unknown }).parseContent(content);

      expect(parsed.patterns).toHaveLength(1);
      expect(parsed.patterns[0].name).toBe('My Pattern');
      expect(parsed.patterns[0].context).toBe('This is the context');
      expect(parsed.patterns[0].language).toBe('qml');
    });

    it('should parse examples with runnable and dependencies', () => {
      const content = `
## Examples

### My Example
Runnable: true
Dependencies: dep1, dep2
\`\`\`bash
echo hello
\`\`\`
`;

      const parsed = (loader as unknown as { parseContent: (content: string) => unknown }).parseContent(content);

      expect(parsed.examples).toHaveLength(1);
      expect(parsed.examples[0].name).toBe('My Example');
      expect(parsed.examples[0].runnable).toBe(true);
      expect(parsed.examples[0].dependencies).toEqual(['dep1', 'dep2']);
      expect(parsed.examples[0].language).toBe('bash');
    });

    it('should parse mistakes with severity', () => {
      const content = `
## Mistakes

### My Mistake
Problem: Something is wrong
Solution: Fix it
Severity: error
`;

      const parsed = (loader as unknown as { parseContent: (content: string) => unknown }).parseContent(content);

      expect(parsed.mistakes).toHaveLength(1);
      expect(parsed.mistakes[0].pattern).toBe('My Mistake');
      expect(parsed.mistakes[0].severity).toBe('error');
    });

    it('should parse compatibility notes', () => {
      const content = `
## Compatibility

### Some API
Introduced: 1.0
Deprecated: 2.0
Removed: 3.0
Replacement: NewAPI
Notes: Migration guide
`;

      const parsed = (loader as unknown as { parseContent: (content: string) => unknown }).parseContent(content);

      expect(parsed.compatibility).toHaveLength(1);
      expect(parsed.compatibility[0].api).toBe('Some API');
      expect(parsed.compatibility[0].introduced).toBe('1.0');
      expect(parsed.compatibility[0].deprecated).toBe('2.0');
      expect(parsed.compatibility[0].removed).toBe('3.0');
      expect(parsed.compatibility[0].replacement).toBe('NewAPI');
      expect(parsed.compatibility[0].notes).toBe('Migration guide');
    });

    it('should parse performance considerations', () => {
      const content = `
## Performance

### Rendering
Impact: high
Description: Slow rendering
Mitigation: Use caching
`;

      const parsed = (loader as unknown as { parseContent: (content: string) => unknown }).parseContent(content);

      expect(parsed.performance).toHaveLength(1);
      expect(parsed.performance[0].area).toBe('Rendering');
      expect(parsed.performance[0].impact).toBe('high');
      expect(parsed.performance[0].mitigation).toBe('Use caching');
    });

    it('should parse debugging guidance', () => {
      const content = `
## Debugging

### White Screen
Cause: Missing import
Diagnosis: Check console
Resolution: Add import
Tools: devtools, logger
`;

      const parsed = (loader as unknown as { parseContent: (content: string) => unknown }).parseContent(content);

      expect(parsed.debugging).toHaveLength(1);
      expect(parsed.debugging[0].symptom).toBe('White Screen');
      expect(parsed.debugging[0].tools).toEqual(['devtools', 'logger']);
    });

    it('should parse references', () => {
      const content = `
## References

- [Official Docs](https://official.example.com) (official)
- [Community Tutorial](https://community.example.com) (community)
`;

      const parsed = (loader as unknown as { parseContent: (content: string) => unknown }).parseContent(content);

      expect(parsed.references).toHaveLength(2);
      expect(parsed.references[0].title).toBe('Official Docs');
      expect(parsed.references[0].type).toBe('official');
      expect(parsed.references[1].type).toBe('community');
    });
  });
});