# Knowledge Coverage Matrix

## Overview
This matrix tracks guide coverage across all six ecosystems and their categories. Green = covered, Yellow = partial, Red = missing.

## Coverage Summary

| Ecosystem | Categories | Guides | Coverage |
|-----------|------------|--------|----------|
| quickshell | 6 | 1 | 3% |
| hyprland | 6 | 0 | 0% |
| qt-qml | 7 | 0 | 0% |
| lua | 6 | 0 | 0% |
| wayland | 5 | 0 | 0% |
| linux-desktop | 8 | 0 | 0% |

---

## Quickshell (6 categories)

| Category | Required Topics | Covered | Missing |
|----------|-----------------|---------|---------|
| fundamentals | Getting started, Architecture, QML basics | ✅ getting-started | Architecture, QML basics |
| components | Panels, Widgets, Layers, Overlays | 0 | All 4 |
| services | System integrations (Hyprland, UPower, NetworkManager, etc.) | 0 | All |
| integrations | Hyprland, Wayland, DBus, PipeWire | 0 | All |
| ipc | Quickshell IPC, command socket, events | 0 | All |
| performance | Layer optimization, binding optimization, profiling | 0 | All |

**Priority Gaps:**
1. Architecture and components
2. Panels and desktop widgets
3. IPC and configuration
4. System integrations
5. QML fundamentals for Quickshell

---

## Hyprland (6 categories)

| Category | Required Topics | Covered | Missing |
|----------|-----------------|---------|---------|
| configuration | Config structure, variables, includes, env | 0 | All |
| rules | Window rules v2, workspace rules, layer rules | 0 | All |
| animations | Animation definitions, bezier curves, per-window | 0 | All |
| ipc | Hyprland IPC socket, commands, events, sockets | 0 | All |
| plugins | Plugin API v2, writing plugins, loading | 0 | All |
| troubleshooting | Common issues, logs, debugging | 0 | All |

**Priority Gaps:**
1. Configuration fundamentals
2. Monitors and workspaces
3. Binds and rules
4. Animations and rendering
5. IPC and event sockets

---

## Qt/QML (7 categories)

| Category | Required Topics | Covered | Missing |
|----------|-----------------|---------|---------|
| properties | Property system, bindings, aliases, groups | 0 | All |
| signals | Signal/slot, connections, handlers | 0 | All |
| models | ListModel, ObjectModel, C++ models, views | 0 | All |
| lifecycle | Component creation, destruction, Loader | 0 | All |
| imports | Module imports, versioning, namespaces | 0 | All |
| rendering | Scene graph, shaders, render targets | 0 | All |
| apis | Qt Quick Controls, Qt Quick Layouts, Qt Quick 3D | 0 | All |

**Priority Gaps:**
1. QML object model and properties
2. Properties, signals, and bindings
3. Components and models
4. Qt Quick fundamentals
5. Debugging QML

---

## Lua (6 categories)

| Category | Required Topics | Covered | Missing |
|----------|-----------------|---------|---------|
| syntax | Lexical conventions, statements, expressions | 0 | All |
| tables | Table constructors, metatables, iterators | 0 | All |
| metatables | __index, __newindex, __call, metamethods | 0 | All |
| coroutines | Coroutine creation, yield, resume, status | 0 | All |
| modules | require, package, module patterns | 0 | All |
| stdlib | string, table, math, io, os, debug | 0 | All |

**Priority Gaps:**
1. Language fundamentals
2. Tables and metatables
3. Modules and require
4. Configuration patterns
5. Debugging Lua

---

## Wayland (5 categories)

| Category | Required Topics | Covered | Missing |
|----------|-----------------|---------|---------|
| protocols | Core protocol, extensions, versioning | 0 | All |
| surfaces | wl_surface, subsurfaces, regions, damage | 0 | All |
| outputs | wl_output, modes, scaling, transform | 0 | All |
| input | wl_seat, keyboard, pointer, touch, tablet | 0 | All |
| extensions | xdg-shell, layer-shell, foreign-toplevel | 0 | All |

**Priority Gaps:**
1. Architecture and protocols
2. Compositor concepts
3. Clients and surfaces
4. Input and output
5. Diagnostics

---

## Linux Desktop (8 categories)

| Category | Required Topics | Covered | Missing |
|----------|-----------------|---------|---------|
| dbus | Bus types, introspection, signals, methods | 0 | All |
| systemd | User services, timers, socket activation | 0 | All |
| power | UPower, battery, lid, suspend | 0 | All |
| audio | PipeWire, WirePlumber, streams, nodes | 0 | All |
| network | NetworkManager, connections, VPN | 0 | All |
| media | MPRIS, media controls | 0 | All |
| bluetooth | BlueZ, devices, profiles | 0 | All |
| portals | xdg-desktop-portal, file chooser, screencast | 0 | All |

**Priority Gaps:**
1. D-Bus fundamentals
2. Systemd user services
3. PipeWire audio
4. Desktop portals
5. Notifications
6. NetworkManager