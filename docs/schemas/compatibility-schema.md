# Compatibility Schema Documentation

## Overview

The compatibility database tracks API availability, deprecation, and removal versions across all supported ecosystems. This enables version-aware recommendations and prevents suggesting APIs that don't exist in the user's installed version.

## Database Schema

```sql
CREATE TABLE compatibility (
  id TEXT PRIMARY KEY,                    -- UUID v4
  ecosystem TEXT NOT NULL,                -- Enum
  component TEXT NOT NULL,                -- Logical grouping (e.g., "WorkspaceIndicator", "HyprlandConfig")
  api TEXT NOT NULL,                      -- Specific API identifier
  first_supported TEXT NOT NULL,          -- Version where API first appeared
  deprecated_in TEXT,                     -- Version where deprecated (optional)
  removed_in TEXT,                        -- Version where removed (optional)
  replacement TEXT,                       -- Replacement API (optional)
  source TEXT NOT NULL,                   -- Source URL
  verified_date TEXT NOT NULL,            -- ISO 8601
  notes TEXT                              -- Additional context
);

CREATE INDEX idx_compat_ecosystem ON compatibility(ecosystem);
CREATE INDEX idx_compat_component ON compatibility(component);
CREATE INDEX idx_compat_api ON compatibility(api);
```

## Field Definitions

### id
- **Type**: UUID v4
- **Purpose**: Stable identifier

### ecosystem
- **Type**: Enum
- **Values**: `quickshell`, `hyprland`, `qt-qml`, `lua`, `wayland`, `linux-desktop`
- **Purpose**: Top-level filtering

### component
- **Type**: String
- **Examples**: 
  - quickshell: `Shell`, `Layer`, `WorkspaceIndicator`, `WindowTitle`, `SystemTray`, `Popup`, `Bar`
  - hyprland: `Config`, `Keybind`, `WindowRule`, `Animation`, `Workspace`, `Monitor`, `Plugin`
  - qt-qml: `Property`, `Signal`, `Model`, `Delegate`, `Loader`, `Component`, `Binding`
  - lua: `Table`, `Metatable`, `Coroutine`, `Module`, `Stdlib`
  - wayland: `Surface`, `Output`, `Seat`, `Registry`, `Compositor`
  - linux-desktop: `DBus`, `Systemd`, `UPower`, `PipeWire`, `NetworkManager`, `MPRIS`
- **Purpose**: Logical grouping for browsing

### api
- **Type**: String
- **Examples**:
  - `Shell.width`, `Layer.anchors`, `WorkspaceIndicator.model`
  - `general:layout`, `windowrulev2`, `animation:bezier`
  - `PropertyBinding`, `SignalHandler`, `ListModel`
  - `table.insert`, `coroutine.yield`, `require`
  - `wl_surface.attach`, `wl_output.mode`
  - `dbus.call`, `systemd.start`, `pipewire.node`
- **Format**: `Component.member` or `config:key` or `function.name`
- **Purpose**: Precise API identification

### first_supported
- **Type**: Version string (semver)
- **Required**: Yes
- **Purpose**: Minimum version for availability

### deprecated_in
- **Type**: Version string (semver)
- **Required**: No
- **Purpose**: Version where deprecation warning added

### removed_in
- **Type**: Version string (semver)
- **Required**: No
- **Purpose**: Version where API removed/broken

### replacement
- **Type**: String
- **Required**: No
- **Format**: Same as `api` field
- **Purpose**: Migration target

### source
- **Type**: URL string
- **Required**: Yes
- **Purpose**: Verification traceability

### verified_date
- **Type**: ISO 8601 datetime
- **Required**: Yes
- **Purpose**: Freshness tracking

### notes
- **Type**: String
- **Required**: No
- **Purpose**: Context (breaking changes, migration steps, caveats)

## Query Logic

### Compatibility Check

```typescript
function checkCompatibility(
  ecosystem: Ecosystem,
  component: string,
  api: string,
  userVersion: string
): CompatibilityResult {
  const entry = db.query({
    ecosystem,
    component,
    api
  })[0];

  if (!entry) {
    return { compatible: false, api, requestedVersion: userVersion };
  }

  const introduced = parseVersion(entry.first_supported);
  const deprecated = entry.deprecated_in ? parseVersion(entry.deprecated_in) : null;
  const removed = entry.removed_in ? parseVersion(entry.removed_in) : null;
  const user = parseVersion(userVersion);

  const compatible = 
    user >= introduced &&
    (!deprecated || user < deprecated) &&  // deprecated but still works
    (!removed || user < removed);          // removed = broken

  return {
    compatible,
    api,
    requestedVersion: userVersion,
    availableVersion: entry.first_supported,
    introducedVersion: entry.first_supported,
    deprecatedVersion: entry.deprecated_in,
    removedVersion: entry.removed_in,
    replacement: entry.replacement,
    notes: entry.notes
  };
}
```

### Version Comparison Rules

1. **Exact match**: `userVersion === entry.first_supported` → compatible
2. **Newer minor/patch**: `1.2.0` ≥ `1.1.0` → compatible (semver compatible)
3. **Newer major**: `2.0.0` ≥ `1.0.0` → **check breaking changes** (may not be compatible)
4. **Deprecated but present**: `userVersion >= deprecated_in && userVersion < removed_in` → compatible with warning
5. **Removed**: `userVersion >= removed_in` → not compatible

## Example Entries

### Quickshell: WorkspaceIndicator

| Field | Value |
|-------|-------|
| ecosystem | quickshell |
| component | WorkspaceIndicator |
| api | WorkspaceIndicator.model |
| first_supported | 1.0 |
| deprecated_in | 1.2 |
| removed_in | null |
| replacement | WorkspaceIndicator.workspaces |
| source | https://quickshell.org/docs/workspace-indicator |
| verified_date | 2026-01-15T00:00:00Z |
| notes | Model property renamed to workspaces in 1.2 for clarity |

### Hyprland: Window Rules v2

| Field | Value |
|-------|-------|
| ecosystem | hyprland |
| component | Config |
| api | windowrulev2 |
| first_supported | 0.35 |
| deprecated_in | null |
| removed_in | null |
| replacement | null |
| source | https://wiki.hypr.land/Configuring/Window-Rules/ |
| verified_date | 2026-01-15T00:00:00Z |
| notes | Replaces legacy windowrule, supports more matchers |

### Qt/QML: ListModel

| Field | Value |
|-------|-------|
| ecosystem | qt-qml |
| component | Model |
| api | ListModel.append |
| first_supported | 5.0 |
| deprecated_in | null |
| removed_in | null |
| replacement | null |
| source | https://doc.qt.io/qt-6/qml-qtqml-models-listmodel.html |
| verified_date | 2026-01-15T00:00:00Z |
| notes | Available since Qt 5, stable in Qt 6 |

## Ingestion Pipeline

1. **Source identification**: Official changelogs, migration guides, API docs
2. **Entry creation**: Manual or semi-automated extraction
3. **Verification**: Cross-reference with multiple sources
4. **Entry storage**: Insert with `verified_date = now()`
5. **Periodic review**: Re-verify entries older than 6 months

## API for Consumers

```typescript
// Check single API
const result = await checker.check('quickshell', 'WorkspaceIndicator', 'WorkspaceIndicator.model', '1.1');

// Check multiple APIs (batch)
const results = await checker.checkMultiple([
  { ecosystem: 'quickshell', component: 'WorkspaceIndicator', api: 'WorkspaceIndicator.model', version: '1.1' },
  { ecosystem: 'hyprland', component: 'Config', api: 'windowrulev2', version: '0.40' },
]);
```

## Response Format

```typescript
interface CompatibilityResult {
  compatible: boolean;
  api: string;
  requestedVersion: string;
  availableVersion?: string;      // first_supported
  introducedVersion?: string;     // same as availableVersion
  deprecatedVersion?: string;     // deprecated_in
  removedVersion?: string;        // removed_in
  replacement?: string;           // replacement API
  notes?: string;                 // Additional context
}
```