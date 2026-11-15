# Official Source Registry

## Overview

This registry documents all official documentation sources used by NRDG. Each source has defined ownership, versioning strategy, retrieval schedule, and trust level.

## Source Categories

### Tier 1: Official Project Documentation (Highest Trust)
- Maintained by project authors
- Versioned with software releases
- License permits reuse/reference

### Tier 2: Official Specifications (High Trust)
- Standards bodies (Wayland, freedesktop.org)
- Stable, versioned specifications
- Open licensing

### Tier 3: Community Wikis (Medium Trust)
- Community maintained
- May lag behind releases
- Requires verification

### Tier 4: Engineering Recommendations (Lowest Trust)
- NRDG team derived guidance
- Clearly labeled as `community` or `unverified`
- Based on testing/experience

## Source Registry

### Quickshell

| Field | Value |
|-------|-------|
| **Name** | Quickshell Official Documentation |
| **URL** | https://quickshell.org/docs |
| **Repository** | https://github.com/quickshell/quickshell/tree/main/docs |
| **Ecosystem** | quickshell |
| **Tier** | 1 |
| **License** | MIT |
| **Versioning** | Matches Quickshell releases (semver) |
| **Retrieval Schedule** | On each Quickshell release + monthly |
| **Verification** | Automated checksum + manual review |
| **Content Types** | Getting started, components, services, IPC, performance |
| **Last Retrieved** | 2026-01-15 |
| **Checksum** | sha256:pending |
| **Guides Indexed** | 42 |

#### Version Mapping
| Quickshell Version | Docs Version | Notes |
|-------------------|--------------|-------|
| 1.0.x | 1.0 | Initial stable |
| 1.1.x | 1.1 | WorkspaceIndicator added |
| 1.2.x | 1.2 | Model→workspaces rename, new services |

### Hyprland

| Field | Value |
|-------|-------|
| **Name** | Hyprland Wiki |
| **URL** | https://wiki.hypr.land |
| **Repository** | https://github.com/hyprwm/Hyprland/tree/main/docs |
| **Ecosystem** | hyprland |
| **Tier** | 1 |
| **License** | MIT |
| **Versioning** | Matches Hyprland releases (date-based: 0.Y.Z) |
| **Retrieval Schedule** | On each Hyprland release + bi-weekly |
| **Verification** | Automated checksum + manual review |
| **Content Types** | Configuration, rules, animations, IPC, plugins, troubleshooting |
| **Last Retrieved** | 2026-01-15 |
| **Checksum** | sha256:pending |
| **Guides Indexed** | 58 |

#### Version Mapping
| Hyprland Version | Docs Version | Key Changes |
|-----------------|--------------|-------------|
| 0.35.x | 0.35 | windowrulev2 introduced |
| 0.40.x | 0.40 | New animation system |
| 0.45.x | 0.45 | Plugin API v2, IPC improvements |

### Qt/QML

| Field | Value |
|-------|-------|
| **Name** | Qt 6 Documentation |
| **URL** | https://doc.qt.io/qt-6/ |
| **Repository** | https://code.qt.io/cgit/qt/qtbase.git/tree/doc |
| **Ecosystem** | qt-qml |
| **Tier** | 1 |
| **License** | GFDL 1.3 / Commercial |
| **Versioning** | Qt releases (6.LTS, 6.N) |
| **Retrieval Schedule** | On Qt LTS releases + quarterly |
| **Verification** | Manual review (license restricts automated copying) |
| **Content Types** | Properties, signals, models, lifecycle, imports, rendering, APIs |
| **Last Retrieved** | 2026-01-15 |
| **Checksum** | sha256:pending |
| **Guides Indexed** | 127 |

#### Version Mapping
| Qt Version | Docs Version | Support |
|-----------|--------------|---------|
| 6.8 LTS | 6.8 | Current LTS (until 2027) |
| 6.12 | 6.12 | Current feature release |
| 5.15 LTS | 5.15 | Legacy (EOL 2025) |

### Lua

| Field | Value |
|-------|-------|
| **Name** | Lua 5.4 Reference Manual |
| **URL** | https://www.lua.org/manual/5.4/ |
| **Repository** | https://www.lua.org/manual/5.4/manual.html |
| **Ecosystem** | lua |
| **Tier** | 1 |
| **License** | MIT |
| **Versioning** | Lua versions (5.1, 5.2, 5.3, 5.4) |
| **Retrieval Schedule** | On Lua release (rare) |
| **Verification** | Manual review |
| **Content Types** | Syntax, tables, metatables, coroutines, modules, stdlib |
| **Last Retrieved** | 2026-01-15 |
| **Checksum** | sha256:pending |
| **Guides Indexed** | 34 |

### Wayland

| Field | Value |
|-------|-------|
| **Name** | Wayland Protocol Documentation |
| **URL** | https://wayland.freedesktop.org/docs/html/ |
| **Repository** | https://gitlab.freedesktop.org/wayland/wayland/-/tree/main/doc |
| **Ecosystem** | wayland |
| **Tier** | 2 |
| **License** | MIT |
| **Versioning** | Protocol versions (1.0, 1.1, etc.) + extensions |
| **Retrieval Schedule** | On Wayland release + quarterly |
| **Verification** | Manual review |
| **Content Types** | Core protocols, surfaces, outputs, input, extensions |
| **Last Retrieved** | 2026-01-15 |
| **Checksum** | sha256:pending |
| **Guides Indexed** | 23 |

### Linux Desktop

| Field | Value |
|-------|-------|
| **Name** | freedesktop.org Specifications |
| **URL** | https://specifications.freedesktop.org/ |
| **Repository** | Various (DBus, systemd, PipeWire, etc.) |
| **Ecosystem** | linux-desktop |
| **Tier** | 2 |
| **License** | Various (mostly MIT/LGPL) |
| **Versioning** | Per-specification |
| **Retrieval Schedule** | Quarterly |
| **Verification** | Manual review |
| **Content Types** | D-Bus, systemd, UPower, PipeWire, NetworkManager, MPRIS, BlueZ, Portals |
| **Last Retrieved** | 2026-01-15 |
| **Checksum** | sha256:pending |
| **Guides Indexed** | 41 |

#### Sub-Sources
| Specification | URL | Version |
|--------------|-----|---------|
| D-Bus | https://dbus.freedesktop.org/doc/dbus-specification.html | 1.14 |
| systemd | https://systemd.io/ | 255 |
| UPower | https://upower.freedesktop.org/docs/ | 1.90 |
| PipeWire | https://pipewire.org/docs/ | 1.0 |
| NetworkManager | https://networkmanager.dev/docs/api/ | 1.48 |
| MPRIS | https://specifications.freedesktop.org/mpris-spec/latest/ | 2.2 |
| BlueZ | https://bluez.gitlab.io/docs/ | 5.75 |
| Desktop Portals | https://flatpak.github.io/xdg-desktop-portal/docs/ | 1.14 |

## Ingestion Pipeline

### Automated Ingestion (Tier 1-2)
```bash
# Monthly cron job
#!/bin/bash
cd /path/to/nrdg
for source in quickshell hyprland qt-qml lua wayland linux-desktop; do
  pnpm run ingest:source $source
done
```

### Manual Ingestion (Tier 3-4)
1. Create source manifest
2. Extract relevant sections
3. Write guide files with frontmatter
4. Set status to `community` or `unverified`
5. Schedule verification review

### Source Manifest Format
```json
{
  "id": "uuid",
  "name": "Source Name",
  "description": "Description",
  "ecosystem": "quickshell",
  "version": "1.2",
  "url": "https://quickshell.org/docs",
  "license": "MIT",
  "retrieved": "2026-01-15T00:00:00Z",
  "checksum": "sha256:...",
  "guides": ["guide-id-1", "guide-id-2"]
}
```

## Verification Process

### Automated Checks (Run on Ingestion)
1. **Checksum validation** - Detect content changes
2. **Schema validation** - All guides pass Zod schema
3. **Link validation** - All source URLs accessible
4. **Duplicate detection** - No duplicate guide IDs

### Manual Review (Quarterly)
1. **Content accuracy** - Compare guide claims with source
2. **Version alignment** - Guides match claimed versions
3. **Completeness** - No major topics missing
4. **Status review** - Upgrade `unverified` → `reviewed` → `verified`

### Staleness Detection
- Guides not verified in 6 months → warning
- Guides not verified in 12 months → downgrade to `unverified`
- Sources not retrieved in 3 months → alert

## Trust Scoring

Each guide gets a trust score (0-100):

```
Trust Score = 
  (Source Tier Weight × 40) +
  (Verification Status Weight × 30) +
  (Recency Weight × 20) +
  (Cross-Reference Weight × 10)
```

| Factor | Weight | Values |
|--------|--------|--------|
| Source Tier | 40 | Tier 1: 40, Tier 2: 30, Tier 3: 20, Tier 4: 10 |
| Verification | 30 | Verified: 30, Reviewed: 20, Community: 10, Unverified: 0 |
| Recency | 20 | <1mo: 20, <3mo: 15, <6mo: 10, <1yr: 5, >1yr: 0 |
| Cross-Ref | 10 | ≥3 sources: 10, 2: 7, 1: 3, 0: 0 |

## Source Deprecation

Sources may be deprecated if:
- Project abandoned (no releases > 2 years)
- Documentation moved/removed
- License changed to restrictive
- Consistently inaccurate

Process:
1. Mark source as `deprecated` in registry
2. Downgrade all guides to `deprecated` status
3. Find replacement source
4. Re-ingest from new source
5. Update dependent guides

## License Compliance

| Source | License | NRDG Use | Attribution Required |
|--------|---------|----------|---------------------|
| Quickshell | MIT | ✅ Reference + snippets | Yes |
| Hyprland | MIT | ✅ Reference + snippets | Yes |
| Qt | GFDL 1.3 | ✅ Reference only (no verbatim) | Yes |
| Lua | MIT | ✅ Reference + snippets | Yes |
| Wayland | MIT | ✅ Reference + snippets | Yes |
| freedesktop.org | Various | ✅ Reference + snippets | Yes |

**Policy**: Never copy verbatim from GFDL/non-MIT sources. Write original explanations with source references.

## Registry Maintenance

- **Owner**: NRDG maintainers
- **Location**: `sources/manifests/source-registry.json`
- **Review**: Monthly (automated), Quarterly (manual)
- **Backup**: Git history + exported JSON