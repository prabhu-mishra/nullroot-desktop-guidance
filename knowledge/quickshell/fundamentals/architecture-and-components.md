---
id: "11111111-1111-1111-1111-111111111111"
title: "Quickshell Architecture and Component Model"
ecosystem: "quickshell"
category: "fundamentals"
versions: ["1.0", "1.1", "1.2"]
sources:
  - url: "https://quickshell.org/docs/architecture"
    title: "Quickshell Architecture Documentation"
    ecosystem: "quickshell"
    versionApplicability: ">=1.0"
    retrieved: "2026-11-15T00:00:00Z"
    license: "MIT"
    verificationState: "official"
  - url: "https://github.com/quickshell/quickshell/tree/main/docs"
    title: "Quickshell Source Repository - Docs"
    ecosystem: "quickshell"
    versionApplicability: ">=1.0"
    retrieved: "2026-11-15T00:00:00Z"
    license: "MIT"
    verificationState: "official"
status: "verified"
lastVerified: "2026-11-15T00:00:00Z"
tags: ["architecture", "components", "shell", "layer", "module-structure"]
checksum: "sha256:placeholder"
---

# Quickshell Architecture and Component Model

## Explanation

Quickshell is a declarative desktop shell built on QtQuick/QML for Wayland compositors. Its architecture centers on a hierarchical component model where a `Shell` root contains `Layer` elements that define desktop layers (background, bottom, top, overlay), each hosting QML `Item`-based components.

The component model follows QtQuick's declarative paradigm: components are defined in `.qml` files, imported via the `QuickShell` QML module, and composed through property bindings and anchors. The shell provides built-in integration with system services (Hyprland, UPower, NetworkManager, PipeWire) through reactive data models.

**Key architectural principles:**
- **Declarative composition**: Shell structure defined entirely in QML
- **Layer-based z-ordering**: Layers (background, bottom, top, overlay) manage stacking
- **Reactive data models**: System services exposed as QML models with automatic updates
- **Module system**: Configuration split across `.qml` files imported by the main shell

## Patterns

### Shell Root Configuration

Context: Root shell component with proper layer stacking
```qml
import QtQuick
import QuickShell

Shell {
    id: root
    width: Screen.width
    height: Screen.height

    // Layer stacking order (back to front):
    // background → bottom → top → overlay
    Layer {
        id: backgroundLayer
        layer: Layer.Background
        anchors.fill: parent
        // Wallpaper, desktop widgets
    }

    Layer {
        id: bottomLayer
        layer: Layer.Bottom
        anchors.fill: parent
        // Dock, panels behind windows
    }

    Layer {
        id: topLayer
        layer: Layer.Top
        anchors.fill: parent
        // Main bar, notifications
    }

    Layer {
        id: overlayLayer
        layer: Layer.Overlay
        anchors.fill: parent
        // Popups, OSD, screenshots
    }
}
```

### Module Structure for Maintainable Configuration

Context: Recommended file organization for Quickshell configurations
```
config/
├── shell.qml              # Main entry point (Shell {})
├── modules/
│   ├── bar.qml            # Top bar component
│   ├── widgets/
│   │   ├── WorkspaceIndicator.qml
│   │   ├── WindowTitle.qml
│   │   ├── SystemTray.qml
│   │   └── Clock.qml
│   └── services/
│       ├── HyprlandService.qml
│       ├── PowerService.qml
│       └── NetworkService.qml
├── settings.json          # User-configurable values
└── theme.qml              # Colors, spacing, fonts
```

### Reactive Service Integration Pattern

Context: Connecting to system services through reactive models
```qml
import QtQuick
import QuickShell

Item {
    id: batteryWidget

    property var batteryModel: Power.batteryModel

    // Reactive binding - updates automatically when battery changes
    Text {
        text: batteryModel.percentage + "%"
        color: batteryModel.charging ? "green" : (batteryModel.percentage < 20 ? "red" : "white")
    }

    // Listen for low battery
    Connections {
        target: batteryModel
        onPercentageChanged: {
            if (batteryModel.percentage < 10 && !batteryModel.charging) {
                Notification.send("Battery Low", "Battery at " + batteryModel.percentage + "%")
            }
        }
    }
}
```

## Examples

### Minimal Shell with Single Layer

Runnable: false
```qml
import QtQuick
import QuickShell

Shell {
    width: Screen.width
    height: Screen.height

    Layer {
        layer: Layer.Top
        anchors.fill: parent

        Rectangle {
            anchors.fill: parent
            color: "#1e1e2e"

            Text {
                anchors.centerIn: parent
                text: "Hello Quickshell"
                font.pixelSize: 24
                color: "white"
            }
        }
    }
}
```

### Multi-Layer Shell with Bar and Wallpaper

Runnable: false
```qml
import QtQuick
import QuickShell

Shell {
    width: Screen.width
    height: Screen.height

    // Background layer - wallpaper
    Layer {
        layer: Layer.Background
        anchors.fill: parent

        Image {
            anchors.fill: parent
            source: "file:///usr/share/backgrounds/default.jpg"
            fillMode: Image.PreserveAspectCrop
            asynchronous: true
        }
    }

    // Top layer - bar
    Layer {
        layer: Layer.Top
        anchors.top: parent.top
        anchors.left: parent.left
        anchors.right: parent.right
        height: 40

        Rectangle {
            anchors.fill: parent
            color: "#1e1e2ecc"  // Semi-transparent

            Row {
                anchors.fill: parent
                spacing: 12
                leftPadding: 12
                rightPadding: 12

                WorkspaceIndicator {}
                WindowTitle {}
                SystemTray {}
                Clock {}
            }
        }
    }
}
```

## Mistakes

### Missing Import QuickShell
Problem: Components like `Shell`, `Layer`, `WorkspaceIndicator` not found
Solution: Always include `import QuickShell` at top of shell.qml
Severity: error

### Hardcoded Dimensions on Shell
Problem: Breaks on different screen resolutions, multi-monitor
Solution: Use `Screen.width`/`Screen.height` or `anchors.fill: parent`
Severity: error

### Incorrect Layer Ordering
Problem: UI elements appear behind/above wrong layers
Solution: Use `layer: Layer.Background`, `Layer.Bottom`, `Layer.Top`, `Layer.Overlay` explicitly
Severity: warning

### Missing Anchors on Layer
Problem: Layer doesn't cover screen area
Solution: Always anchor layers to parent edges
Severity: error

### Using Item Instead of Layer
Problem: No z-ordering, no Wayland layer-shell integration
Solution: Use `Layer` with appropriate `layer` enum value
Severity: error

### No Error Handling in Service Bindings
Problem: Silent failures when services unavailable
Solution: Use `Component.onCompleted` to verify service connections
Severity: warning

## Compatibility

### Shell
Introduced: 1.0
Notes: Root component

### Layer
Introduced: 1.0
Notes: Desktop layer

### Layer.Background
Introduced: 1.0
Notes: Background layer enum

### Layer.Bottom
Introduced: 1.0
Notes: Bottom layer enum

### Layer.Top
Introduced: 1.0
Notes: Top layer enum

### Layer.Overlay
Introduced: 1.0
Notes: Overlay layer enum

### WorkspaceIndicator
Introduced: 1.1
Notes: Workspace display

### WindowTitle
Introduced: 1.1
Notes: Active window title

### SystemTray
Introduced: 1.1
Notes: System tray icons

### Power.batteryModel
Introduced: 1.0
Notes: Battery status model

### Hyprland.workspaceModel
Introduced: 1.2
Deprecated: 1.2
Replacement: Hyprland.workspaces
Notes: Renamed in 1.2

### Hyprland.windowModel
Introduced: 1.0
Notes: Window list model

## Performance

### Layer count
Impact: high
Description: Each Layer creates a Wayland sub-surface with rendering overhead
Mitigation: Use 3-4 layers max; combine related UI into single layer

### Property bindings
Impact: medium
Description: Complex bindings in hot paths cause repeated evaluation
Mitigation: Use `Binding` element with `when` for conditional bindings; avoid complex expressions

### Image loading
Impact: medium
Description: Large images block UI thread during loading
Mitigation: Use `asynchronous: true` for wallpapers and large images

### Model filtering
Impact: medium
Description: JavaScript `filter()` on large lists (workspaces, windows) is slow
Mitigation: Use `DelegateModel` with `filterOnGroup` instead of JS filter

### Anchor vs binding
Impact: low
Description: Property bindings for layout are resolved in JS engine
Mitigation: Prefer anchors over property bindings for layout; anchors resolved in layout pass

## Debugging

### Shell doesn't start
Cause: Missing `import QuickShell` or QML module path
Diagnosis: Check stdout/stderr for "module 'QuickShell' is not installed"
Resolution: Ensure QuickShell is installed; check `QML_IMPORT_PATH`
Tools: quickshell --log-level debug

### Bar not visible
Cause: Layer z-order incorrect or layer not anchored
Diagnosis: Inspect layer `z` property; verify `anchors.fill: parent`
Resolution: Set explicit `layer:` enum; ensure anchors cover screen
Tools: QML Inspector (Qt Creator)

### High CPU usage
Cause: Binding loops or excessive model updates
Diagnosis: Enable QML profiler; look for repeated `onPropertyChanged`
Resolution: Simplify bindings; use `Binding { when: condition }`
Tools: QT_QML_PROFILER=1 quickshell

### Wallpaper not showing
Cause: Image source invalid or fillMode wrong
Diagnosis: Check `source` URL; verify file exists
Resolution: Use `file://` absolute path; check `fillMode`
Tools: ls /path/to/image

### Service data not updating
Cause: Model not connected or service not running
Diagnosis: Check service status; verify model `count` property
Resolution: Ensure service daemon running (e.g., `hyprland`, `upowerd`)
Tools: systemctl --user status upowerd

## References

- [Quickshell Documentation](https://quickshell.org/docs) (official)
- [Quickshell GitHub Repository](https://github.com/quickshell/quickshell) (official)
- [QtQuick Documentation](https://doc.qt.io/qt-6/qtquick-index.html) (official)
- [Wayland Layer-Shell Protocol](https://wayland.freedesktop.org/docs/html/chapter-layer-shell.html) (specification)