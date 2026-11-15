# CLI Contracts Documentation

## Overview

The `nrdg` CLI provides a consistent, scriptable interface for all NRDG functionality. All commands support JSON output for programmatic use.

## Global Options

```bash
nrdg [global-options] <command> [command-options] [arguments]

Global Options:
  -c, --config <path>     Configuration file path
  --json                  Output as JSON (default: table)
  --no-color              Disable colored output
  -h, --help              Show help
  -V, --version           Show version
```

## Exit Codes

| Code | Meaning |
|------|---------|
| 0 | Success |
| 1 | General error |
| 2 | Invalid arguments/usage |
| 3 | Configuration error |
| 4 | Knowledge not found |
| 5 | Search/Index error |
| 6 | Compatibility check failed |
| 7 | Analyzer/diagnostic error |
| 8 | MCP server error |
| 9 | Environment detection failed |

## Commands

### nrdg init

Initialize project configuration and knowledge base.

```bash
nrdg init [options]

Options:
  --force               Overwrite existing config
  --data-dir <path>     Custom data directory
  --ecosystems <list>   Comma-separated ecosystems to enable

Output (JSON):
{
  "success": true,
  "configPath": "/home/user/.config/nullroot-desktop-guidance/config.json",
  "dataDir": "/home/user/.local/share/nullroot-desktop-guidance",
  "ecosystemsEnabled": ["quickshell", "hyprland", "qt-qml", "lua", "wayland", "linux-desktop"]
}
```

### nrdg detect

Detect development environment (Hyprland, Quickshell, Qt, Lua, tools).

```bash
nrdg detect [options]

Options:
  --json                Output as JSON

Output (JSON):
{
  "distribution": { "name": "Arch Linux", "version": "2026.01.01", "id": "arch" },
  "kernel": "7.2.15-1-omarchy",
  "desktopSession": "hyprland",
  "hyprland": { "version": "0.45.0", "instanceSignature": "abc123" },
  "quickshell": { "version": "1.2.0" },
  "qt": { "version": "6.8.0", "path": "/usr/lib/qt6" },
  "lua": { "version": "5.4.7", "path": "/usr/bin/lua" },
  "tools": {
    "qmllint": true,
    "qmlformat": true,
    "qmlimportscanner": true,
    "luac": true,
    "luacheck": true
  },
  "configPaths": {
    "hyprland": "/home/user/.config/hypr/hyprland.conf",
    "quickshell": "/home/user/.config/quickshell/shell.qml"
  }
}
```

### nrdg search

Search knowledge base with filters.

```bash
nrdg search <query> [options]

Arguments:
  query                 Search query string (required)

Options:
  -e, --ecosystem <ecosystem>   Filter by ecosystem (quickshell|hyprland|qt-qml|lua|wayland|linux-desktop)
  -c, --category <category>     Filter by category
  -v, --version <version>       Filter by version
  -s, --status <status>         Filter by verification status
  -l, --limit <number>          Maximum results (default: 10, max: 100)
  -o, --offset <number>         Pagination offset (default: 0)

Output (JSON):
{
  "query": "workspace indicator",
  "totalResults": 42,
  "results": [
    {
      "id": "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
      "title": "Getting Started with Quickshell",
      "ecosystem": "quickshell",
      "category": "fundamentals",
      "snippet": "Quickshell is a QtQuick/QML-based desktop shell...",
      "score": 0.847,
      "metadata": {
        "versions": ["1.0", "1.1", "1.2"],
        "status": "verified",
        "lastVerified": "2026-01-15T00:00:00Z",
        "tags": ["beginner", "installation"]
      }
    }
  ],
  "limit": 10,
  "offset": 0
}
```

### nrdg retrieve

Retrieve full guide by ID.

```bash
nrdg retrieve <id> [options]

Arguments:
  id                    Guide UUID (required)

Options:
  --format <format>     Output format: markdown|json (default: markdown)

Output (JSON):
{
  "id": "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
  "title": "Getting Started with Quickshell",
  "ecosystem": "quickshell",
  "category": "fundamentals",
  "versions": ["1.0", "1.1", "1.2"],
  "sources": [...],
  "status": "verified",
  "lastVerified": "2026-01-15T00:00:00Z",
  "tags": ["beginner", "installation"],
  "checksum": "sha256:...",
  "content": {
    "explanation": "...",
    "patterns": [...],
    "examples": [...],
    "mistakes": [...],
    "compatibility": [...],
    "performance": [...],
    "debugging": [...],
    "references": [...]
  }
}
```

### nrdg inspect

Inspect project structure and detect ecosystem.

```bash
nrdg inspect [path] [options]

Arguments:
  path                  Project path (default: current directory)

Options:
  --deep                Deep analysis (run analyzers)
  --ecosystem <eco>     Force ecosystem (quickshell|hyprland|qt-qml|lua)

Output (JSON):
{
  "type": "quickshell",
  "root": "/home/user/my-quickshell-config",
  "files": [
    { "path": "shell.qml", "type": "qml", "size": 2048, "imports": ["QuickShell", "QtQuick"], "exports": ["Shell"] },
    { "path": "modules/bar.qml", "type": "qml", "size": 1024, "imports": ["QtQuick"], "exports": ["Bar"] }
  ],
  "dependencies": [
    { "name": "QuickShell", "version": "1.2", "type": "runtime", "ecosystem": "quickshell" }
  ],
  "issues": []
}
```

### nrdg audit

Run diagnostics on project.

```bash
nrdg audit [path] [options]

Arguments:
  path                  Project path (default: current directory)

Options:
  --fix                 Attempt auto-fix for safe issues
  --severity <level>    Minimum severity: error|warning|info|hint (default: info)

Output (JSON):
{
  "project": "/home/user/my-quickshell-config",
  "summary": { "errors": 2, "warnings": 5, "info": 3, "hints": 1 },
  "diagnostics": [
    {
      "severity": "error",
      "code": "QML_UNRESOLVED_IMPORT",
      "message": "Cannot resolve import 'NonExistentModule'",
      "location": { "file": "shell.qml", "line": 5, "column": 1 },
      "explanation": "Import references a module that doesn't exist in Qt or QuickShell",
      "fix": "Remove or correct the import statement",
      "references": [{ "title": "QML Import System", "url": "https://doc.qt.io/qt-6/qtqml-syntax-imports.html", "type": "official" }]
    }
  ]
}
```

### nrdg compatibility

Check API compatibility for target version.

```bash
nrdg compatibility <api> [options]

Arguments:
  api                   API identifier (e.g., "WorkspaceIndicator.model")

Options:
  -v, --version <version>   Target version (default: detected)
  -e, --ecosystem <eco>     Ecosystem (default: detected)
  -c, --component <comp>    Component (optional)

Output (JSON):
{
  "compatible": true,
  "api": "WorkspaceIndicator.model",
  "requestedVersion": "1.1",
  "availableVersion": "1.0",
  "introducedVersion": "1.0",
  "deprecatedVersion": "1.2",
  "removedVersion": null,
  "replacement": "WorkspaceIndicator.workspaces",
  "notes": "Model property renamed to workspaces in 1.2 for clarity"
}
```

### nrdg sources

Manage knowledge sources.

```bash
nrdg sources <subcommand> [options]

Subcommands:
  list                  List registered sources
  add <manifest>        Add source from manifest file
  remove <id>           Remove source by ID
  verify <id>           Verify source checksum
  update <id>           Update source from upstream

Output (list):
{
  "sources": [
    {
      "id": "uuid",
      "name": "Quickshell Official Docs",
      "description": "Official Quickshell documentation",
      "ecosystem": "quickshell",
      "version": "1.2",
      "url": "https://quickshell.org/docs",
      "license": "MIT",
      "retrieved": "2026-01-15T00:00:00Z",
      "checksum": "sha256:...",
      "guides": 42
    }
  ]
}
```

### nrdg index

Build or rebuild search index.

```bash
nrdg index [options]

Options:
  --ecosystem <eco>     Index specific ecosystem only
  --rebuild             Force full rebuild
  --stats               Show index statistics only

Output (JSON):
{
  "success": true,
  "ecosystems": ["quickshell", "hyprland", "qt-qml", "lua", "wayland", "linux-desktop"],
  "totalDocuments": 1247,
  "indexSize": 5242880,
  "durationMs": 3421,
  "stats": {
    "quickshell": { "documents": 312, "size": 1048576 },
    "hyprland": { "documents": 287, "size": 1572864 },
    ...
  }
}
```

### nrdg eval

Run evaluation benchmarks.

```bash
nrdg eval [options]

Options:
  --task <name>         Specific task to run
  --agent <name>        Agent to evaluate (claude|codex|both)
  --iterations <n>      Number of iterations (default: 3)
  --output <path>       Results output path

Output (JSON):
{
  "task": "build-quickshell-popup",
  "agent": "claude",
  "iterations": 3,
  "results": [
    {
      "iteration": 1,
      "withGuidance": true,
      "success": true,
      "correctness": 0.95,
      "compatibility": 1.0,
      "durationMs": 12400,
      "regressions": 0
    }
  ],
  "summary": {
    "avgCorrectness": 0.93,
    "avgCompatibility": 1.0,
    "avgDurationMs": 13200,
    "successRate": 1.0
  }
}
```

### nrdg doctor

Health check for installation.

```bash
nrdg doctor [options]

Options:
  --fix                 Attempt to fix issues

Output (JSON):
{
  "healthy": true,
  "checks": [
    { "name": "config", "status": "ok", "message": "Config valid" },
    { "name": "database", "status": "ok", "message": "SQLite accessible" },
    { "name": "index", "status": "ok", "message": "FTS5 index healthy" },
    { "name": "knowledge", "status": "ok", "message": "1247 guides loaded" },
    { "name": "tools", "status": "warn", "message": "luacheck not found (optional)" }
  ]
}
```

### nrdg mcp

Start MCP server.

```bash
nrdg mcp [options]

Options:
  -p, --port <number>   Port (default: 3000)
  -h, --host <host>     Host (default: localhost)
  --stdio               Use stdio transport (default for MCP)

Note: When run with --stdio, communicates via stdin/stdout for MCP protocol.
No JSON output in stdio mode.
```

## JSON Output Format

All commands support `--json` flag for structured output:

```json
{
  "success": true,
  "data": { ... },
  "metadata": {
    "command": "search",
    "timestamp": "2026-01-15T12:34:56Z",
    "version": "0.1.0"
  }
}
```

Error responses:
```json
{
  "success": false,
  "error": {
    "code": "KNOWLEDGE_NOT_FOUND",
    "message": "Guide not found: invalid-id",
    "details": { "id": "invalid-id" }
  },
  "metadata": { ... }
}
```