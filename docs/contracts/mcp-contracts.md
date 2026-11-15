# MCP Tool Contracts Documentation

## Overview

The NRDG MCP (Model Context Protocol) server exposes 6 tools for AI agents to access guidance functionality. All tools use structured input/output schemas validated with Zod.

## Server Configuration

```json
{
  "name": "nullroot-desktop-guidance",
  "version": "0.1.0",
  "transport": "stdio",
  "capabilities": {
    "tools": {}
  }
}
```

## Tool Definitions

### 1. search_guidance

Search the knowledge base for relevant guides.

#### Input Schema
```json
{
  "type": "object",
  "properties": {
    "query": {
      "type": "string",
      "description": "Search query string",
      "minLength": 1
    },
    "ecosystems": {
      "type": "array",
      "items": {
        "type": "string",
        "enum": ["quickshell", "hyprland", "qt-qml", "lua", "wayland", "linux-desktop"]
      },
      "description": "Filter by ecosystem"
    },
    "categories": {
      "type": "array",
      "items": { "type": "string" },
      "description": "Filter by category"
    },
    "versions": {
      "type": "array",
      "items": { "type": "string" },
      "description": "Filter by version"
    },
    "status": {
      "type": "array",
      "items": {
        "type": "string",
        "enum": ["verified", "reviewed", "community", "unverified", "deprecated"]
      },
      "description": "Filter by verification status"
    },
    "limit": {
      "type": "integer",
      "minimum": 1,
      "maximum": 100,
      "default": 10,
      "description": "Maximum results"
    },
    "offset": {
      "type": "integer",
      "minimum": 0,
      "default": 0,
      "description": "Pagination offset"
    }
  },
  "required": ["query"],
  "additionalProperties": false
}
```

#### Output Schema
```json
{
  "type": "object",
  "properties": {
    "query": { "type": "string" },
    "totalResults": { "type": "integer" },
    "results": {
      "type": "array",
      "items": {
        "type": "object",
        "properties": {
          "id": { "type": "string", "format": "uuid" },
          "title": { "type": "string" },
          "ecosystem": { "type": "string", "enum": ["quickshell", "hyprland", "qt-qml", "lua", "wayland", "linux-desktop"] },
          "category": { "type": "string" },
          "snippet": { "type": "string" },
          "score": { "type": "number" },
          "metadata": {
            "type": "object",
            "properties": {
              "versions": { "type": "array", "items": { "type": "string" } },
              "status": { "type": "string", "enum": ["verified", "reviewed", "community", "unverified", "deprecated"] },
              "lastVerified": { "type": "string", "format": "date-time" },
              "tags": { "type": "array", "items": { "type": "string" } }
            },
            "required": ["versions", "status", "lastVerified", "tags"]
          }
        },
        "required": ["id", "title", "ecosystem", "category", "snippet", "score", "metadata"]
      }
    },
    "limit": { "type": "integer" },
    "offset": { "type": "integer" }
  },
  "required": ["query", "totalResults", "results", "limit", "offset"]
}
```

#### Example
```json
{
  "query": "hyprland window rules",
  "ecosystems": ["hyprland"],
  "limit": 5
}
```

### 2. retrieve_guide

Retrieve a complete guide by its UUID.

#### Input Schema
```json
{
  "type": "object",
  "properties": {
    "id": {
      "type": "string",
      "format": "uuid",
      "description": "Guide UUID"
    }
  },
  "required": ["id"],
  "additionalProperties": false
}
```

#### Output Schema
```json
{
  "type": "object",
  "properties": {
    "id": { "type": "string", "format": "uuid" },
    "title": { "type": "string" },
    "ecosystem": { "type": "string", "enum": ["quickshell", "hyprland", "qt-qml", "lua", "wayland", "linux-desktop"] },
    "category": { "type": "string" },
    "versions": { "type": "array", "items": { "type": "string" } },
    "sources": {
      "type": "array",
      "items": {
        "type": "object",
        "properties": {
          "url": { "type": "string", "format": "uri" },
          "title": { "type": "string" },
          "ecosystem": { "type": "string" },
          "versionApplicability": { "type": "string" },
          "retrieved": { "type": "string", "format": "date-time" },
          "license": { "type": "string" },
          "verificationState": { "type": "string", "enum": ["official", "community", "derived"] }
        },
        "required": ["url", "title", "ecosystem", "retrieved", "verificationState"]
      }
    },
    "status": { "type": "string", "enum": ["verified", "reviewed", "community", "unverified", "deprecated"] },
    "lastVerified": { "type": "string", "format": "date-time" },
    "tags": { "type": "array", "items": { "type": "string" } },
    "checksum": { "type": "string" },
    "content": {
      "type": "object",
      "properties": {
        "explanation": { "type": "string" },
        "patterns": {
          "type": "array",
          "items": {
            "type": "object",
            "properties": {
              "name": { "type": "string" },
              "description": { "type": "string" },
              "code": { "type": "string" },
              "language": { "type": "string", "enum": ["qml", "hyprlang", "lua", "typescript", "javascript", "cpp", "json", "yaml"] },
              "context": { "type": "string" }
            },
            "required": ["name", "description", "code", "language"]
          }
        },
        "examples": {
          "type": "array",
          "items": {
            "type": "object",
            "properties": {
              "name": { "type": "string" },
              "description": { "type": "string" },
              "code": { "type": "string" },
              "language": { "type": "string", "enum": ["qml", "hyprlang", "lua", "typescript", "javascript", "cpp", "json", "yaml", "bash"] },
              "runnable": { "type": "boolean" },
              "dependencies": { "type": "array", "items": { "type": "string" } }
            },
            "required": ["name", "description", "code", "language", "runnable"]
          }
        },
        "mistakes": {
          "type": "array",
          "items": {
            "type": "object",
            "properties": {
              "pattern": { "type": "string" },
              "problem": { "type": "string" },
              "solution": { "type": "string" },
              "severity": { "type": "string", "enum": ["error", "warning", "info"] }
            },
            "required": ["pattern", "problem", "solution", "severity"]
          }
        },
        "compatibility": {
          "type": "array",
          "items": {
            "type": "object",
            "properties": {
              "api": { "type": "string" },
              "introduced": { "type": "string" },
              "deprecated": { "type": "string" },
              "removed": { "type": "string" },
              "replacement": { "type": "string" },
              "notes": { "type": "string" }
            },
            "required": ["api", "introduced"]
          }
        },
        "performance": {
          "type": "array",
          "items": {
            "type": "object",
            "properties": {
              "area": { "type": "string" },
              "impact": { "type": "string", "enum": ["high", "medium", "low"] },
              "description": { "type": "string" },
              "mitigation": { "type": "string" }
            },
            "required": ["area", "impact", "description"]
          }
        },
        "debugging": {
          "type": "array",
          "items": {
            "type": "object",
            "properties": {
              "symptom": { "type": "string" },
              "cause": { "type": "string" },
              "diagnosis": { "type": "string" },
              "resolution": { "type": "string" },
              "tools": { "type": "array", "items": { "type": "string" } }
            },
            "required": ["symptom", "cause", "diagnosis", "resolution"]
          }
        },
        "references": {
          "type": "array",
          "items": {
            "type": "object",
            "properties": {
              "title": { "type": "string" },
              "url": { "type": "string", "format": "uri" },
              "type": { "type": "string", "enum": ["official", "community", "tutorial", "specification"] }
            },
            "required": ["title", "url", "type"]
          }
        }
      },
      "required": ["explanation", "patterns", "examples", "mistakes", "compatibility", "performance", "debugging", "references"]
    }
  },
  "required": ["id", "title", "ecosystem", "category", "versions", "sources", "status", "lastVerified", "tags", "content"]
}
```

### 3. detect_environment

Detect the current development environment.

#### Input Schema
```json
{
  "type": "object",
  "properties": {},
  "additionalProperties": false
}
```

#### Output Schema
```json
{
  "type": "object",
  "properties": {
    "distribution": {
      "type": "object",
      "properties": {
        "name": { "type": "string" },
        "version": { "type": "string" },
        "id": { "type": "string" }
      }
    },
    "kernel": { "type": "string" },
    "desktopSession": { "type": "string" },
    "hyprland": {
      "type": "object",
      "properties": {
        "version": { "type": "string" },
        "instanceSignature": { "type": "string" }
      }
    },
    "quickshell": {
      "type": "object",
      "properties": {
        "version": { "type": "string" }
      }
    },
    "qt": {
      "type": "object",
      "properties": {
        "version": { "type": "string" },
        "path": { "type": "string" }
      }
    },
    "lua": {
      "type": "object",
      "properties": {
        "version": { "type": "string" },
        "path": { "type": "string" }
      }
    },
    "tools": {
      "type": "object",
      "properties": {
        "qmllint": { "type": "boolean" },
        "qmlformat": { "type": "boolean" },
        "qmlimportscanner": { "type": "boolean" },
        "luac": { "type": "boolean" },
        "luacheck": { "type": "boolean" }
      }
    },
    "configPaths": {
      "type": "object",
      "properties": {
        "hyprland": { "type": "string" },
        "quickshell": { "type": "string" }
      }
    }
  },
  "required": ["kernel", "tools", "configPaths"]
}
```

### 4. inspect_project

Inspect a project structure and detect ecosystem.

#### Input Schema
```json
{
  "type": "object",
  "properties": {
    "path": {
      "type": "string",
      "description": "Project path (absolute or relative)"
    }
  },
  "required": ["path"],
  "additionalProperties": false
}
```

#### Output Schema
```json
{
  "type": "object",
  "properties": {
    "type": { "type": "string", "enum": ["quickshell", "hyprland", "qml", "lua", "mixed", "unknown"] },
    "root": { "type": "string" },
    "files": {
      "type": "array",
      "items": {
        "type": "object",
        "properties": {
          "path": { "type": "string" },
          "type": { "type": "string", "enum": ["qml", "hyprlang", "lua", "json", "yaml", "ts", "js", "other"] },
          "size": { "type": "integer" },
          "imports": { "type": "array", "items": { "type": "string" } },
          "exports": { "type": "array", "items": { "type": "string" } }
        },
        "required": ["path", "type", "size"]
      }
    },
    "dependencies": {
      "type": "array",
      "items": {
        "type": "object",
        "properties": {
          "name": { "type": "string" },
          "version": { "type": "string" },
          "type": { "type": "string", "enum": ["runtime", "development", "peer", "optional"] },
          "ecosystem": { "type": "string" }
        },
        "required": ["name", "type"]
      }
    },
    "issues": {
      "type": "array",
      "items": {
        "type": "object",
        "properties": {
          "severity": { "type": "string", "enum": ["error", "warning", "info", "hint"] },
          "code": { "type": "string" },
          "message": { "type": "string" },
          "location": {
            "type": "object",
            "properties": {
              "file": { "type": "string" },
              "line": { "type": "integer" },
              "column": { "type": "integer" },
              "endLine": { "type": "integer" },
              "endColumn": { "type": "integer" }
            },
            "required": ["file"]
          },
          "explanation": { "type": "string" },
          "fix": { "type": "string" },
          "references": {
            "type": "array",
            "items": {
              "type": "object",
              "properties": {
                "title": { "type": "string" },
                "url": { "type": "string", "format": "uri" },
                "type": { "type": "string", "enum": ["official", "community", "tutorial", "specification"] }
              },
              "required": ["title", "url", "type"]
            }
          }
        },
        "required": ["severity", "code", "message", "location"]
      }
    }
  },
  "required": ["type", "root", "files", "dependencies", "issues"]
}
```

### 5. run_diagnostics

Run diagnostics on a project.

#### Input Schema
```json
{
  "type": "object",
  "properties": {
    "path": {
      "type": "string",
      "description": "Project path"
    }
  },
  "required": ["path"],
  "additionalProperties": false
}
```

#### Output Schema
```json
{
  "type": "object",
  "properties": {
    "project": { "type": "string" },
    "summary": {
      "type": "object",
      "properties": {
        "errors": { "type": "integer" },
        "warnings": { "type": "integer" },
        "info": { "type": "integer" },
        "hints": { "type": "integer" }
      },
      "required": ["errors", "warnings", "info", "hints"]
    },
    "diagnostics": {
      "type": "array",
      "items": {
        "type": "object",
        "properties": {
          "severity": { "type": "string", "enum": ["error", "warning", "info", "hint"] },
          "code": { "type": "string" },
          "message": { "type": "string" },
          "location": {
            "type": "object",
            "properties": {
              "file": { "type": "string" },
              "line": { "type": "integer" },
              "column": { "type": "integer" },
              "endLine": { "type": "integer" },
              "endColumn": { "type": "integer" }
            },
            "required": ["file"]
          },
          "explanation": { "type": "string" },
          "fix": { "type": "string" },
          "references": {
            "type": "array",
            "items": {
              "type": "object",
              "properties": {
                "title": { "type": "string" },
                "url": { "type": "string", "format": "uri" },
                "type": { "type": "string", "enum": ["official", "community", "tutorial", "specification"] }
              },
              "required": ["title", "url", "type"]
            }
          }
        },
        "required": ["severity", "code", "message", "location"]
      }
    }
  },
  "required": ["project", "summary", "diagnostics"]
}
```

### 6. check_compatibility

Check API compatibility for a target version.

#### Input Schema
```json
{
  "type": "object",
  "properties": {
    "api": {
      "type": "string",
      "description": "API identifier (e.g., 'WorkspaceIndicator.model')"
    },
    "version": {
      "type": "string",
      "description": "Target version (semver)"
    },
    "ecosystem": {
      "type": "string",
      "enum": ["quickshell", "hyprland", "qt-qml", "lua", "wayland", "linux-desktop"],
      "description": "Ecosystem (auto-detected if omitted)"
    },
    "component": {
      "type": "string",
      "description": "Component name (optional)"
    }
  },
  "required": ["api"],
  "additionalProperties": false
}
```

#### Output Schema
```json
{
  "type": "object",
  "properties": {
    "compatible": { "type": "boolean" },
    "api": { "type": "string" },
    "requestedVersion": { "type": "string" },
    "availableVersion": { "type": "string" },
    "introducedVersion": { "type": "string" },
    "deprecatedVersion": { "type": "string" },
    "removedVersion": { "type": "string" },
    "replacement": { "type": "string" },
    "notes": { "type": "string" }
  },
  "required": ["compatible", "api", "requestedVersion"]
}
```

## Error Responses

All tools may return errors in this format:

```json
{
  "error": {
    "code": "ERROR_CODE",
    "message": "Human-readable error message",
    "details": {}
  }
}
```

### Common Error Codes

| Code | Description |
|------|-------------|
| `KNOWLEDGE_NOT_FOUND` | Guide ID not found |
| `INVALID_QUERY` | Search query invalid |
| `INVALID_ID` | UUID format invalid |
| `INVALID_VERSION` | Version format invalid |
| `INVALID_PATH` | Project path not found |
| `ANALYZER_ERROR` | Analyzer execution failed |
| `DATABASE_ERROR` | SQLite operation failed |
| `CONFIG_ERROR` | Configuration invalid |
| `MCP_INTERNAL` | Internal server error |

## Rate Limiting

- No explicit rate limiting (local tool)
- Recommended: Max 100 requests/second per client
- Large result sets paginated via `limit`/`offset`

## Versioning

Tool schemas versioned with MCP server version.
Breaking changes = major version bump.
Additive changes = minor version bump.