---
id: "a1b2c3d4-e5f6-7890-abcd-ef1234567890"
title: "Getting Started with Quickshell"
ecosystem: "quickshell"
category: "fundamentals"
versions: ["1.0", "1.1", "1.2"]
sources:
  - url: "https://quickshell.org/docs/getting-started"
    title: "Quickshell Getting Started Guide"
    ecosystem: "quickshell"
    versionApplicability: ">=1.0"
    retrieved: "2026-01-15T00:00:00Z"
    license: "MIT"
    verificationState: "official"
status: "verified"
lastVerified: "2026-01-15T00:00:00Z"
tags: ["beginner", "installation", "configuration", "quickstart"]
checksum: "sha256:placeholder"
---

# Getting Started with Quickshell

## Technical Explanation

Quickshell is a QtQuick/QML-based desktop shell for Wayland compositors. It provides a declarative way to build desktop interfaces using QML, with built-in integration for system services like Hyprland, UPower, NetworkManager, and more.

## Correct Implementation Patterns

### Basic Shell Configuration

```qml
import QtQuick
import QuickShell

Shell {
    id: root
    width: 1920
    height: 1080
    
    // Main bar at top
    Layer {
        id: barLayer
        anchors.top: parent.top
        anchors.left: parent.left
        anchors.right: parent.right
        height: 40
        
        Rectangle {
            anchors.fill: parent
            color: "#1e1e2e"
            
            Row {
                anchors.fill: parent
                spacing: 10
                
                // Workspace indicator
                WorkspaceIndicator {}
                
                // Window title
                WindowTitle {}
                
                // System tray
                SystemTray {}
            }
        }
    }
}
```

### Module Structure

```
config/
├── shell.qml          # Main shell entry point
├── modules/
│   ├── bar.qml        # Top bar component
│   ├── widgets/       # Reusable widgets
│   └── services/      # Service integrations
└── settings.json      # User configuration
```

## Working Examples

### Minimal Shell

```qml
import QtQuick
import QuickShell

Shell {
    width: Screen.width
    height: Screen.height
    
    Layer {
        anchors.fill: parent
        Item {
            anchors.fill: parent
            // Your desktop content here
        }
    }
}
```

## Common Mistakes

| Pattern | Problem | Solution |
|---------|---------|----------|
| Missing `import QuickShell` | Components not found | Always import QuickShell module |
| Hardcoded dimensions | Breaks on different screens | Use `Screen.width`/`Screen.height` |
| No error handling | Silent failures | Wrap in try-catch or use `Component.onCompleted` |

## API Compatibility Notes

| API | Introduced | Deprecated | Replacement |
|-----|------------|------------|-------------|
| `Shell` | 1.0 | - | - |
| `Layer` | 1.0 | - | - |
| `WorkspaceIndicator` | 1.1 | - | - |

## Performance Considerations

- **Layer stacking**: Minimize layer count; each layer has rendering overhead
- **Property bindings**: Avoid complex bindings in hot paths
- **Image loading**: Use `Image { asynchronous: true }` for large images

## Debugging Guidance

| Symptom | Cause | Diagnosis | Resolution |
|---------|-------|-----------|------------|
| Shell doesn't start | Missing imports | Check console for "module not found" | Add required imports |
| Bar not visible | Layer z-order | Check layer `z` property | Set appropriate `z` values |
| High CPU usage | Binding loops | Enable QML profiler | Simplify bindings |

## Official References

- [Quickshell Documentation](https://quickshell.org/docs)
- [QtQuick Documentation](https://doc.qt.io/qt-6/qtquick-index.html)
- [Wayland Protocol](https://wayland.freedesktop.org/docs/html/)