# Knowledge Schema Documentation

## Overview

Every guide in NRDG's knowledge base is a Markdown file with YAML frontmatter containing structured metadata. The schema ensures consistency, enables filtering, and supports verification tracking.

## File Structure

```
knowledge/
├── quickshell/
│   ├── fundamentals/
│   │   ├── getting-started.md
│   │   └── ...
│   ├── components/
│   ├── services/
│   ├── integrations/
│   ├── ipc/
│   └── performance/
├── hyprland/
│   ├── configuration/
│   ├── rules/
│   ├── animations/
│   ├── ipc/
│   ├── plugins/
│   └── troubleshooting/
├── qt-qml/
├── lua/
├── wayland/
└── linux-desktop/
```

## Frontmatter Schema

```yaml
---
id: "a1b2c3d4-e5f6-7890-abcd-ef1234567890"      # UUID v4, unique identifier
title: "Guide Title"                             # Human-readable title (1-200 chars)
ecosystem: "quickshell"                          # Enum: quickshell | hyprland | qt-qml | lua | wayland | linux-desktop
category: "fundamentals"                         # Ecosystem-specific category
versions: ["1.0", "1.1", "1.2"]                 # Array of supported versions (semver)
sources:                                         # Array of source references (min 1)
  - url: "https://quickshell.org/docs/..."       # Official documentation URL
    title: "Quickshell Documentation"            # Source title
    ecosystem: "quickshell"                      # Source ecosystem
    versionApplicability: ">=1.0"                # Optional version range
    retrieved: "2026-01-15T00:00:00Z"           # ISO 8601 retrieval date
    license: "MIT"                               # Optional source license
    verificationState: "official"                # official | community | derived
status: "verified"                               # verified | reviewed | community | unverified | deprecated
lastVerified: "2026-01-15T00:00:00Z"            # ISO 8601 last verification date
tags: ["beginner", "installation"]              # Optional searchable tags
checksum: "sha256:..."                          # Optional content checksum
---
```

## Field Definitions

### id
- **Type**: UUID v4 string
- **Required**: Yes
- **Generated**: `crypto.randomUUID()` on creation
- **Purpose**: Stable identifier for linking, retrieval, deduplication

### title
- **Type**: String
- **Constraints**: 1-200 characters
- **Required**: Yes
- **Purpose**: Display name in search results, CLI output

### ecosystem
- **Type**: Enum
- **Values**: `quickshell`, `hyprland`, `qt-qml`, `lua`, `wayland`, `linux-desktop`
- **Required**: Yes
- **Purpose**: Top-level filtering, routing to correct analyzer/skill

### category
- **Type**: String
- **Required**: Yes
- **Values per ecosystem**:
  - **quickshell**: `fundamentals`, `components`, `services`, `integrations`, `ipc`, `performance`
  - **hyprland**: `configuration`, `rules`, `animations`, `ipc`, `plugins`, `troubleshooting`
  - **qt-qml**: `properties`, `signals`, `models`, `lifecycle`, `imports`, `rendering`, `apis`
  - **lua**: `syntax`, `tables`, `metatables`, `coroutines`, `modules`, `stdlib`
  - **wayland**: `protocols`, `surfaces`, `outputs`, `input`, `extensions`
  - **linux-desktop**: `dbus`, `systemd`, `power`, `audio`, `network`, `media`, `bluetooth`, `portals`
- **Purpose**: Sub-ecosystem filtering, organization

### versions
- **Type**: String array (semver)
- **Constraints**: Min 1 item
- **Required**: Yes
- **Format**: `MAJOR.MINOR.PATCH` or `MAJOR.MINOR`
- **Purpose**: Version compatibility filtering, upgrade guidance

### sources
- **Type**: Array of SourceReference objects
- **Constraints**: Min 1 item
- **Required**: Yes
- **Purpose**: Traceability, verification, license compliance

#### SourceReference Fields
| Field | Type | Required | Description |
|-------|------|----------|-------------|
| url | URL string | Yes | Official documentation URL |
| title | String | Yes | Human-readable source title |
| ecosystem | Enum | Yes | Source ecosystem |
| versionApplicability | String | No | Version range (e.g., ">=1.0", "^1.2") |
| retrieved | ISO 8601 | Yes | When source was accessed |
| license | String | No | Source license (MIT, GFDL, etc.) |
| verificationState | Enum | Yes | `official` \| `community` \| `derived` |

### status
- **Type**: Enum
- **Values**:
  - `verified` - Tested against official source, confirmed accurate
  - `reviewed` - Peer reviewed, matches official docs
  - `community` - Community contributed, not officially verified
  - `unverified` - Not yet reviewed
  - `deprecated` - Superseded, kept for reference
- **Required**: Yes
- **Purpose**: Trust signaling, filtering

### lastVerified
- **Type**: ISO 8601 datetime
- **Required**: Yes
- **Purpose**: Freshness indicator, stale content detection

### tags
- **Type**: String array
- **Default**: `[]`
- **Required**: No
- **Purpose**: Additional search dimensions, cross-cutting concerns

### checksum
- **Type**: String (SHA-256 hex)
- **Format**: `sha256:<64 hex chars>`
- **Required**: No
- **Purpose**: Content integrity verification, change detection

## Content Structure

After frontmatter, the guide body must contain these sections (in order):

```markdown
# Technical Explanation
Conceptual overview of the topic.

## Correct Implementation Patterns
### Pattern Name
Description and context.

```qml
// Code example
```

## Working Examples
### Example Name
Runnable code with dependencies noted.

## Common Mistakes
| Pattern | Problem | Solution |
|---------|---------|----------|

## API Compatibility Notes
| API | Introduced | Deprecated | Replacement |
|-----|------------|------------|-------------|

## Performance Considerations
- **Area**: Impact level - description, mitigation

## Debugging Guidance
| Symptom | Cause | Diagnosis | Resolution |
|---------|-------|-----------|------------|

## Official References
- [Link Title](URL)
```

## Validation Rules

1. **All required frontmatter fields present**
2. **UUID format valid** (v4)
3. **Ecosystem/category combination valid** (per matrix above)
4. **Versions array non-empty**, each valid semver
5. **Sources array non-empty**, each with valid URL and retrieval date
6. **Status** in allowed enum
7. **lastVerified** valid ISO 8601, not in future
8. **Checksum** (if present) valid SHA-256 hex
9. **Content sections** follow required structure
10. **No duplicate IDs** across knowledge base

## Example Complete Guide

See `knowledge/quickshell/fundamentals/getting-started.md` for a complete example.