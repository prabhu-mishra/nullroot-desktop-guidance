# Security Model Documentation

## Threat Model

### Assets to Protect
1. **User's local filesystem** - Project files, configs, secrets
2. **Knowledge base integrity** - Accurate, unverified content clearly marked
3. **System stability** - No unintended shell/desktop modifications
4. **Privacy** - No telemetry, no data exfiltration
5. **Supply chain** - Dependency integrity

### Threat Actors
1. **Malicious knowledge sources** - Compromised upstream docs
2. **Compromised dependencies** - Supply chain attacks
3. **Misconfigured AI agents** - Over-permissioned tool use
4. **Local attacker** - Local user/process accessing NRDG data
5. **NRDG bugs** - Logic errors causing unintended behavior

### Trust Boundaries

```
┌─────────────────────────────────────────────────────────────┐
│                    NRDG Process                              │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────────────┐  │
│  │   CLI       │  │  MCP Server │  │  Knowledge Ingestion│  │
│  │   (user)    │  │  (AI agent) │  │  (maintainers)      │  │
│  └──────┬──────┘  └──────┬──────┘  └──────────┬──────────┘  │
│         │                │                     │             │
│         ▼                ▼                     ▼             │
│  ┌─────────────────────────────────────────────────────────┐ │
│  │              Core Packages (trusted code)                │ │
│  │  @nullroot/core, knowledge, retrieval, compatibility,   │ │
│  │  analyzers, integrations, config, shared                │ │
│  └─────────────────────────────────────────────────────────┘ │
│         │                │                     │             │
│         ▼                ▼                     ▼             │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────────────┐  │
│  │  SQLite DB  │  │  Knowledge  │  │  Project Filesystem │  │
│  │  (local)    │  │  Files      │  │  (read-only)        │  │
│  └─────────────┘  └─────────────┘  └─────────────────────┘  │
└─────────────────────────────────────────────────────────────┘
```

## Security Principles

### 1. Offline-First, No Network by Default
- **No mandatory network calls** for core functionality
- Knowledge ingestion is explicit, manual process
- Optional semantic retrieval uses local embedding providers only
- No update checks, no telemetry, no phoning home

### 2. Read-Only Project Access
- Project analyzers **never write** to project directories
- No automatic file modification, formatting, or fixing
- `--fix` flag in `nrdg audit` requires explicit user confirmation
- MCP tools `inspect_project` and `run_diagnostics` are read-only

### 3. Explicit Approval for System Changes
- `nrdg init` asks before creating directories
- No automatic package installation
- No shell/desktop restart
- No systemd service modification
- No privileged operations (sudo) ever

### 4. Input Validation at All Boundaries
- **Zod schemas** for all external inputs:
  - Knowledge frontmatter (user-edited)
  - Config files (user-edited)
  - CLI arguments (shell)
  - MCP tool inputs (AI agents)
  - Source manifests (ingestion pipeline)
- **No `any` types** in validated data paths
- **Fail closed** on validation errors

### 5. Secret Redaction
- Diagnostics output scanned for:
  - API keys, tokens, passwords
  - File paths containing secrets
  - Environment variable values
  - Database connection strings
- Redaction patterns:
  ```typescript
  const SECRET_PATTERNS = [
    /(api[_-]?key|token|secret|password|passwd|auth)[\s:=]+[\w-]+/gi,
    /[A-Za-z0-9+/]{40,}/g,  // Base64-like strings
    /\b[A-F0-9]{32,}\b/gi,   // Hex strings (likely hashes/keys)
  ];
  ```

### 6. Directory Boundary Enforcement
- Project inspection **never traverses above** project root
- Symlinks resolved and checked against root
- Config paths validated against allowed locations
- Knowledge base restricted to configured data directory

### 7. Dependency Integrity
- `pnpm` with lockfile for reproducible builds
- `pnpm audit` in CI pipeline
- Minimal dependencies, prefer stdlib
- Native deps (`better-sqlite3`) from trusted sources
- No `postinstall` scripts in dependencies

### 8. No Arbitrary Code Execution
- **Never** `eval()`, `Function()`, `vm.runInContext()`
- **Never** execute project scripts (npm scripts, build scripts, etc.)
- **Never** `require()` or `import()` user-provided paths
- Analyzers use **static analysis only** (qmllint, luacheck, etc.)

### 9. MCP Server Hardening
- Stdio transport only (no network exposure)
- Tool schemas strictly validated
- No file system access beyond declared tools
- No shell command execution
- Timeout on all operations (30s default)

### 10. Knowledge Base Trust Levels
| Source Type | Trust Level | Verification Required |
|-------------|-------------|----------------------|
| Official docs (quickshell.org, wiki.hypr.land, doc.qt.io) | High | Automated checksum + periodic manual review |
| Community wikis/forums | Medium | Manual verification before `verified` status |
| Derived/engineering recommendations | Low | Clear labeling as `community` or `unverified` |
| User-contributed | Low | Review required, starts as `unverified` |

## Secure Coding Practices

### TypeScript
```typescript
// ✅ Good: Explicit types, no any
function parseConfig(data: unknown): Result<Config, ValidationError> {
  const result = ConfigSchema.safeParse(data);
  // ...
}

// ❌ Bad: any type, no validation
function parseConfig(data: any): Config {
  return data as Config;
}
```

### File Operations
```typescript
// ✅ Good: Path validation, boundary check
async function readProjectFile(projectRoot: string, relativePath: string): Promise<string> {
  const resolved = path.resolve(projectRoot, relativePath);
  if (!resolved.startsWith(projectRoot)) {
    throw new Error('Path traversal attempt');
  }
  return fs.readFile(resolved, 'utf-8');
}

// ❌ Bad: No boundary check
async function readProjectFile(projectRoot: string, relativePath: string): Promise<string> {
  return fs.readFile(path.join(projectRoot, relativePath), 'utf-8');
}
```

### Process Execution
```typescript
// ✅ Good: No shell, explicit args, timeout
async function runAnalyzer(tool: string, args: string[]): Promise<string> {
  return new Promise((resolve, reject) => {
    const proc = spawn(tool, args, { 
      timeout: 30000,
      shell: false,  // Never use shell!
      stdio: ['ignore', 'pipe', 'pipe']
    });
    // ...
  });
}

// ❌ Bad: Shell injection risk
async function runAnalyzer(command: string): Promise<string> {
  return exec(command);  // DANGEROUS
}
```

## Incident Response

### Knowledge Base Compromise
1. Detect: Checksum mismatch on guide load
2. Isolate: Mark affected guides as `unverified`
3. Investigate: Compare with upstream source
4. Remediate: Restore from git history or re-ingest
5. Notify: Log security event (local only)

### Dependency Vulnerability
1. Detect: `pnpm audit` in CI
2. Assess: CVSS score, exploitability
3. Mitigate: Update, patch, or replace dependency
4. Verify: Tests pass, no regression

### MCP Tool Abuse
1. Detect: Unusual tool call patterns
2. Isolate: Restart MCP server (stateless)
3. Investigate: Audit tool call logs
4. Remediate: Adjust tool schemas/permissions

## Compliance Considerations

- **GDPR**: No personal data collected
- **SOC 2**: No customer data processed
- **Supply chain**: SLSA Level 1 practices (lockfile, CI, signed releases)
- **Licensing**: MIT for code, respect upstream for knowledge content

## Security Checklist for Contributors

- [ ] All external inputs validated with Zod
- [ ] No `any` types in public APIs
- [ ] File operations respect directory boundaries
- [ ] No shell command execution with user input
- [ ] No `eval` or dynamic code execution
- [ ] Secrets redacted from all output
- [ ] No network calls in core packages
- [ ] Dependencies audited before adding
- [ ] Tests cover error/edge cases
- [ ] Documentation updated for security-relevant changes