# ADR 0006: Compatibility Database Versioning

## Status
Accepted

## Context
NRDG needs to provide version-aware API compatibility guidance across 6 ecosystems. Users and AI agents need to know:
- Is API X available in version Y?
- When was API X introduced/deprecated/removed?
- What should I use instead of deprecated API X?

The compatibility database must support:
- Semantic version comparison (semver)
- Multiple versioning schemes (semver, date-based, custom)
- Ecosystem-specific version semantics
- Migration path suggestions
- Batch queries for project-wide compatibility checks

## Decision
Implement a **structured compatibility entry model** with explicit version tracking and semver-aware comparison logic.

### Compatibility Entry Model
```typescript
// packages/compatibility/src/models.ts
export interface CompatibilityEntry {
  id: string;                    // UUID
  ecosystem: Ecosystem;          // quickshell, hyprland, qt-qml, lua, wayland, linux-desktop
  component: string;             // High-level component: "WorkspaceIndicator", "windowrulev2"
  api: string;                   // Specific API: "model", "workspaces", "rule"
  
  // Version tracking (semver strings)
  firstSupported: string;        // Version where API first appeared: "1.0"
  deprecatedIn?: string;         // Version where API deprecated: "1.2"
  removedIn?: string;            // Version where API removed: "2.0"
  replacement?: string;          // Replacement API: "WorkspaceIndicator.workspaces"
  
  // Metadata
  source: string;                // URL to official documentation
  verifiedDate: string;          // ISO 8601 date of verification
  notes?: string;                // Migration guidance, caveats
}
```

### Version Comparison Logic
Use `@nullroot/shared` version utilities with ecosystem-specific handling:

```typescript
// packages/compatibility/src/checker.ts
export class CompatibilityChecker {
  check(
    ecosystem: Ecosystem,
    component: string,
    api: string,
    targetVersion: string
  ): CompatibilityResult {
    const entry = this.db.query({ ecosystem, component, api })[0];
    if (!entry) {
      return { compatible: false, api, requestedVersion: targetVersion, notes: 'API not found in database' };
    }
    
    const result = this.evaluateCompatibility(entry, targetVersion);
    return {
      compatible: result.compatible,
      api,
      requestedVersion: targetVersion,
      availableVersion: entry.firstSupported,
      introducedVersion: entry.firstSupported,
      deprecatedVersion: entry.deprecatedIn,
      removedVersion: entry.removedIn,
      replacement: entry.replacement,
      notes: result.notes
    };
  }
  
  private evaluateCompatibility(entry: CompatibilityEntry, targetVersion: string): { compatible: boolean; notes: string } {
    // 1. Check if introduced
    if (!satisfiesVersion(targetVersion, `>=${entry.firstSupported}`)) {
      return { 
        compatible: false, 
        notes: `API introduced in ${entry.firstSupported}, not available in ${targetVersion}` 
      };
    }
    
    // 2. Check if removed
    if (entry.removedIn && satisfiesVersion(targetVersion, `>=${entry.removedIn}`)) {
      return { 
        compatible: false, 
        notes: `API removed in ${entry.removedIn}, unavailable in ${targetVersion}` +
               (entry.replacement ? `. Use ${entry.replacement} instead.` : '')
      };
    }
    
    // 3. Check if deprecated
    if (entry.deprecatedIn && satisfiesVersion(targetVersion, `>=${entry.deprecatedIn}`)) {
      return { 
        compatible: true,  // Still works but deprecated
        notes: `API deprecated in ${entry.deprecatedIn}` +
               (entry.replacement ? `. Consider migrating to ${entry.replacement}.` : '')
      };
    }
    
    // 4. Compatible
    return { compatible: true, notes: 'API available and supported' };
  }
}
```

### Ecosystem Version Schemes

| Ecosystem | Version Scheme | Example | Comparison Notes |
|-----------|---------------|---------|------------------|
| Quickshell | Semver | 1.0, 1.1, 1.2 | Standard semver |
| Hyprland | Date-based | 0.35, 0.40, 0.45 | Treat as semver (0.Y.Z) |
| Qt/QML | Semver + LTS | 6.8, 6.12, 5.15 | Major.Minor; LTS = long-term support |
| Lua | Semver | 5.1, 5.2, 5.3, 5.4 | Standard semver |
| Wayland | Protocol version | 1.0, 1.1, 1.2 | Standard semver |
| Linux Desktop | Per-spec | systemd 255, UPower 1.90 | Each spec has own versioning |

**Handling**: Store versions as strings; comparison uses `satisfiesVersion()` which handles:
- Standard semver: `^1.2.0`, `~1.2.0`, `>=1.0.0`, `<2.0.0`
- Simple versions: `1.2`, `0.45` (treated as `1.2.0`, `0.45.0`)
- Date-based: `2024.01` (if needed)

### Database Schema
```sql
-- packages/compatibility/src/database.ts
CREATE TABLE IF NOT EXISTS compatibility (
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
CREATE INDEX idx_compat_first_supported ON compatibility(first_supported);
```

### Query API
```typescript
// packages/compatibility/src/database.ts
interface CompatibilityQuery {
  ecosystem?: Ecosystem;
  component?: string;
  api?: string;
  version?: string;  // Target version for filtering
}

// Returns entries compatible with version (if provided)
query(query: CompatibilityQuery): CompatibilityEntry[];

// Version-aware query
queryCompatible(ecosystem: Ecosystem, version: string): CompatibilityEntry[];
```

### Seed Data Strategy

#### Priority APIs by Ecosystem

**Quickshell (15 APIs)**
| Component | API | Introduced | Deprecated | Removed | Replacement |
|-----------|-----|------------|------------|---------|-------------|
| Shell | Shell | 1.0 | - | - | - |
| Shell | Layer | 1.0 | - | - | - |
| WorkspaceIndicator | model | 1.1 | 1.2 | - | workspaces |
| WorkspaceIndicator | workspaces | 1.2 | - | - | - |
| WindowTitle | title | 1.1 | - | - | - |
| SystemTray | items | 1.1 | - | - | - |
| Power | batteryModel | 1.0 | - | - | - |
| Power | acModel | 1.0 | - | - | - |
| Network | networkModel | 1.0 | - | - | - |
| Hyprland | workspaceModel | 1.0 | 1.2 | - | workspaces |
| Hyprland | workspaces | 1.2 | - | - | - |
| Hyprland | windowModel | 1.0 | - | - | - |
| Audio | audioModel | 1.1 | - | - | - |
| Bluetooth | bluetoothModel | 1.2 | - | - | - |
| Process | Process | 1.0 | - | - | - |

**Hyprland (12 APIs)**
| Component | API | Introduced | Deprecated | Removed | Replacement |
|-----------|-----|------------|------------|---------|-------------|
| Config | windowrulev2 | 0.35 | - | - | - |
| Config | windowrule | 0.10 | 0.35 | 0.40 | windowrulev2 |
| Config | animation | 0.30 | - | - | - |
| Config | plugin | 0.40 | - | - | - |
| Config | monitor | 0.20 | - | - | - |
| Config | input | 0.10 | - | - | - |
| IPC | hyprctl/j/[cmd] | 0.35 | - | - | - |
| IPC | hyprctl/keyword | 0.35 | - | - | - |
| IPC | hyprctl/binds | 0.35 | - | - | - |
| Config | layerrule | 0.40 | - | - | - |
| Config | cursor | 0.20 | - | - | - |
| Config | gesture | 0.40 | - | - | - |

**Qt/QML (10 APIs)**
| Component | API | Introduced | Deprecated | Removed | Replacement |
|-----------|-----|------------|------------|---------|-------------|
| QtQuick | Item | 5.0 | - | - | - |
| QtQuick | Rectangle | 5.0 | - | - | - |
| QtQuick | Text | 5.0 | - | - | - |
| QtQuick | MouseArea | 5.0 | - | - | - |
| QtQuick | ListView | 5.0 | - | - | - |
| QtQml | PropertyBinding | 5.0 | - | - | - |
| QtQml | Signal | 5.0 | - | - | - |
| QtQml | Model | 5.0 | - | - | - |
| QtQuick.Controls | Button | 5.1 | - | - | - |
| QtQuick.Controls | Menu | 5.1 | - | - | - |

**Lua (8 APIs)**
| Component | API | Introduced | Deprecated | Removed | Replacement |
|-----------|-----|------------|------------|---------|-------------|
| Stdlib | table.insert | 5.1 | - | - | - |
| Stdlib | table.remove | 5.1 | - | - | - |
| Stdlib | coroutine.create | 5.1 | - | - | - |
| Stdlib | coroutine.resume | 5.1 | - | - | - |
| Stdlib | setmetatable | 5.1 | - | - | - |
| Stdlib | require | 5.1 | - | - | - |
| Stdlib | package.loaded | 5.1 | - | - | - |
| Stdlib | debug.traceback | 5.1 | - | - | - |

**Wayland (5 APIs)**
| Component | API | Introduced | Deprecated | Removed | Replacement |
|-----------|-----|------------|------------|---------|-------------|
| Core | wl_surface | 1.0 | - | - | - |
| Core | wl_output | 1.0 | - | - | - |
| Core | wl_seat | 1.0 | - | - | - |
| Layer-shell | zwlr_layer_shell_v1 | 1.0 | - | - | - |
| XDG-shell | xdg_wm_base | 1.0 | - | - | - |

**Linux Desktop (8 APIs)**
| Component | API | Introduced | Deprecated | Removed | Replacement |
|-----------|-----|------------|------------|---------|-------------|
| D-Bus | org.freedesktop.DBus | 1.0 | - | - | - |
| systemd | sd_notify | 230 | - | - | - |
| UPower | org.freedesktop.UPower | 0.9 | - | - | - |
| PipeWire | pw_stream | 0.3 | - | - | - |
| NetworkManager | org.freedesktop.NetworkManager | 1.0 | - | - | - |
| MPRIS | org.mpris.MediaPlayer2 | 2.0 | - | - | - |
| BlueZ | org.bluez | 5.0 | - | - | - |
| Portals | org.freedesktop.portal.Desktop | 1.0 | - | - | - |

Total: ~58 seed entries

### MCP Integration
```typescript
// packages/integrations/src/mcp.ts - check_compatibility tool
{
  name: 'check_compatibility',
  description: 'Check API compatibility for target version',
  inputSchema: {
    type: 'object',
    properties: {
      api: { type: 'string', description: 'API identifier (e.g., "WorkspaceIndicator.model")' },
      version: { type: 'string', description: 'Target version' },
      ecosystem: { type: 'string', enum: ECOSYSTEMS },
      component: { type: 'string' }
    },
    required: ['api']
  }
}
```

### CLI Integration
```bash
nrdg compatibility "WorkspaceIndicator.model" --version 1.1 --ecosystem quickshell
```

## Consequences

### Positive
- **Precise version guidance**: Agents get exact compatibility info
- **Migration support**: Replacement API + notes guide transitions
- **Ecosystem flexibility**: Handles different versioning schemes
- **Extensible**: Easy to add new APIs, components, ecosystems
- **Query flexibility**: Filter by ecosystem, component, API, version

### Negative
- **Maintenance burden**: Seed data must be updated with each release
- **Version scheme complexity**: Date-based (Hyprland) vs semver needs care
- **False precision**: "Compatible" doesn't guarantee bug-free usage

## Alternatives Considered

| Alternative | Evaluation |
|-------------|------------|
| **Simple version ranges** | Less precise; can't express deprecation/removal separately |
| **Changelog parsing** | Automated but unreliable; needs manual verification anyway |
| **External database** | Violates offline-first; adds dependency |
| **Per-guide compatibility** | Duplicates data; harder to query across guides |

## Implementation Notes

1. **Seed script**: `packages/compatibility/scripts/seed.ts` loads JSON/YAML seed data
2. **Verification process**: Quarterly review against official release notes
3. **Version normalization**: Store as-is; comparison handles normalization
4. **Batch API**: `checkMultiple()` for project-wide scans
5. **Cache**: In-memory cache in `CompatibilityChecker` for repeated queries