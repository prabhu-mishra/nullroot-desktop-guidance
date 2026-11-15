# Prioritized Guide Inventory

## Selection Criteria
1. **Foundation first** - Core concepts before advanced topics
2. **High impact** - Topics that unlock many other capabilities
3. **Cross-ecosystem relevance** - Knowledge useful across multiple ecosystems
4. **Practical utility** - Immediate applicability for developers
5. **Verification feasibility** - Can be validated against official sources

---

## Quickshell (5 Priority Topics)

| Priority | Guide Title | Category | Description | Source | Status |
|----------|-------------|----------|-------------|--------|--------|
| 1 | Architecture and Component Model | fundamentals | Shell, Layer, Item hierarchy; QML module structure | Quickshell docs v1.2 | Planned |
| 2 | QML Fundamentals for Quickshell | fundamentals | Import QuickShell, Shell/Root/Item, properties, signals | Quickshell docs v1.2 | Planned |
| 3 | Panels and Desktop Widgets | components | Bar, Layer, anchors, WorkspaceIndicator, SystemTray | Quickshell docs v1.2 | Planned |
| 4 | IPC and Configuration | ipc | Command socket, config reload, event subscriptions | Quickshell docs v1.2 | Planned |
| 5 | System Integrations (Hyprland, UPower, NetworkManager) | integrations | Service modules, data models, reactive bindings | Quickshell docs v1.2 | Planned |

**First Batch Candidate**: Architecture and Component Model + QML Fundamentals (foundational)

---

## Hyprland / Hyprlang (5 Priority Topics)

| Priority | Guide Title | Category | Description | Source | Status |
|----------|-------------|----------|-------------|--------|--------|
| 1 | Configuration Fundamentals | configuration | hyprland.conf structure, variables, includes, categories | Hyprland Wiki 0.45 | Planned |
| 2 | Monitors and Workspaces | configuration | monitor keyword, workspace rules, persistent workspaces | Hyprland Wiki 0.45 | Planned |
| 3 | Binds and Window Rules | rules | bind/bindm/bindel, windowrulev2, matchers, actions | Hyprland Wiki 0.45 | Planned |
| 4 | Animations and Rendering | animations | animation{} blocks, bezier, per-window, blur/opacity | Hyprland Wiki 0.45 | Planned |
| 5 | IPC and Event Sockets | ipc | hyprctl, socket commands, event streaming, JSON output | Hyprland Wiki 0.45 | Planned |

**First Batch Candidate**: Configuration Fundamentals (foundational)

---

## Qt6 / QML (5 Priority Topics)

| Priority | Guide Title | Category | Description | Source | Status |
|----------|-------------|----------|-------------|--------|--------|
| 1 | QML Object Model and Type System | properties | QtObject, properties, enums, property aliases, groups | Qt 6.8 docs | Planned |
| 2 | Properties, Signals, and Bindings | properties/signals | Property bindings, signal handlers, Connections, Binding | Qt 6.8 docs | Planned |
| 3 | Components and Models | models | Component, Loader, ListModel, ObjectModel, DelegateModel | Qt 6.8 docs | Planned |
| 4 | Qt Quick Fundamentals | apis | Item, Rectangle, Text, Image, MouseArea, Flickable | Qt 6.8 docs | Planned |
| 5 | Debugging QML Applications | debugging | QML profiler, debug messages, inspector, common errors | Qt 6.8 docs | Planned |

**First Batch Candidate**: QML Object Model + Properties/Signals/Bindings (foundational)

---

## Lua (5 Priority Topics)

| Priority | Guide Title | Category | Description | Source | Status |
|----------|-------------|----------|-------------|--------|--------|
| 1 | Language Fundamentals (5.4) | syntax | Lexical structure, types, operators, control flow | Lua 5.4 Manual | Planned |
| 2 | Tables and Metatables | tables/metatables | Constructors, iterators, metamethods, __index/__newindex | Lua 5.4 Manual | Planned |
| 3 | Modules and Package System | modules | require, package.path, module patterns, local modules | Lua 5.4 Manual | Planned |
| 4 | Configuration Patterns | modules | Config files, schema validation, env overrides | Community patterns | Planned |
| 5 | Debugging Lua | debugging | debug library, traceback, inspection, profiling | Lua 5.4 Manual | Planned |

**First Batch Candidate**: Language Fundamentals + Tables/Metatables (foundational)

---

## Wayland (5 Priority Topics)

| Priority | Guide Title | Category | Description | Source | Status |
|----------|-------------|----------|-------------|--------|--------|
| 1 | Architecture and Core Protocols | protocols | Wayland architecture, registry, globals, protocol versioning | Wayland 1.22 docs | Planned |
| 2 | Compositor Concepts | protocols | Compositor role, surfaces, outputs, seats, shells | Wayland 1.22 docs | Planned |
| 3 | Clients and Surfaces | surfaces | wl_surface, buffer management, damage, subsurfaces | Wayland 1.22 docs | Planned |
| 4 | Input and Output | input/output | wl_seat, keyboard, pointer, touch, wl_output, modes | Wayland 1.22 docs | Planned |
| 5 | Diagnostics and Debugging | extensions | Wayland debug, WAYLAND_DEBUG, protocol tracing | Wayland 1.22 docs | Planned |

**First Batch Candidate**: Architecture and Core Protocols (foundational)

---

## Linux Desktop Integrations (6 Priority Topics)

| Priority | Guide Title | Category | Description | Source | Status |
|----------|-------------|----------|-------------|--------|--------|
| 1 | D-Bus Fundamentals | dbus | Bus types, introspection, method calls, signals, properties | D-Bus 1.14 spec | Planned |
| 2 | Systemd User Services | systemd | --user services, timers, socket activation, drop-ins | systemd 255 docs | Planned |
| 3 | PipeWire Audio Basics | audio | Graph, nodes, ports, links, WirePlumber session mgmt | PipeWire 1.0 docs | Planned |
| 4 | Desktop Portals (xdg-desktop-portal) | portals | Portal APIs, file chooser, screencast, settings | Portals 1.14 docs | Planned |
| 5 | Notifications (Freedesktop Notifications) | dbus | Notify spec, actions, hints, persistence | Notifications spec | Planned |
| 6 | NetworkManager D-Bus API | network | Devices, connections, VPN, secrets, dispatcher | NM 1.48 API | Planned |

**First Batch Candidate**: D-Bus Fundamentals + Systemd User Services (foundational, cross-cutting)

---

## First Batch Selection (3-5 Guides)

Based on the criteria above, the following guides are selected for the first batch:

| # | Guide | Ecosystem | Category | Rationale |
|---|-------|-----------|----------|-----------|
| 1 | **Quickshell Architecture and Component Model** | quickshell | fundamentals | Foundation for all Quickshell guides; unlocks components, services, integrations |
| 2 | **Hyprland Configuration Fundamentals** | hyprland | configuration | Foundation for all Hyprland guides; required for rules, animations, IPC |
| 3 | **QML Object Model and Properties/Signals/Bindings** | qt-qml | properties | Foundation for Qt/QML; required for all QML-based ecosystems (Quickshell) |
| 4 | **D-Bus Fundamentals** | linux-desktop | dbus | Cross-cutting; required for systemd, PipeWire, Portals, NetworkManager |
| 5 | **Lua Language Fundamentals and Tables/Metatables** | lua | syntax/tables | Foundation for Lua; used in Neovim, Hammerspoon, Quickshell scripting |

**Total: 5 guides** - One per ecosystem, all foundational, maximum cross-ecosystem value.

---

## Next Batch (After Validation)

| # | Guide | Ecosystem | Category |
|---|-------|-----------|----------|
| 6 | Wayland Architecture and Core Protocols | wayland | protocols |
| 7 | Quickshell Panels and Desktop Widgets | quickshell | components |
| 8 | Hyprland Monitors and Workspaces | hyprland | configuration |
| 9 | Qt Quick Components and Models | qt-qml | models |
| 10 | Systemd User Services | linux-desktop | systemd |
| 11 | Lua Modules and Configuration Patterns | lua | modules |
| 12 | PipeWire Audio Basics | linux-desktop | audio |