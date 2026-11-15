# ADR 0005: Analyzer Plugin Architecture

## Status
Accepted

## Context
NRDG needs to analyze projects across 5+ ecosystems (Quickshell, Hyprland, Qt/QML, Lua, Wayland/Linux Desktop). Each ecosystem has different:
- Project structures (QML files, Hyprland configs, Lua modules)
- Diagnostic tools (qmllint, luacheck, hyprctl)
- Analysis depth (syntax, imports, dependencies, runtime behavior)

The analyzer system must be:
- **Extensible**: New ecosystems added without modifying core
- **Composable**: Multiple analyzers can run on one project
- **Reliable**: Tool failures don't crash the analyzer
- **Standardized**: Uniform diagnostic output format
- **Performant**: Parallel execution, configurable timeouts

## Decision
Implement a **plugin-based analyzer architecture** with:

### 1. Common Interface
```typescript
// packages/analyzers/src/types.ts
export interface Analyzer {
  readonly name: string;                    // Unique identifier
  readonly supportedEcosystems: Ecosystem[]; // Which ecosystems this handles
  
  // Main entry point
  analyze(path: string, config?: AnalyzerConfig): Promise<AnalyzerResult>;
  
  // Quick check if analyzer applies to path
  detects(path: string): Promise<boolean>;
  
  // Tool availability check
  getRequiredTools(): string[];
  getOptionalTools(): string[];
}

export interface AnalyzerConfig {
  enabled: boolean;
  options: Record<string, unknown>;
  timeoutMs?: number;        // Per-tool timeout (default: 30000)
  severityThreshold?: DiagnosticSeverity; // Minimum severity to report
}

export interface AnalyzerResult {
  project: ProjectInfo;           // Detected project structure
  diagnostics: Diagnostic[];      // Normalized diagnostics
  metadata: Record<string, unknown>; // Analyzer-specific data
}
```

### 2. Registry Pattern
```typescript
// packages/analyzers/src/registry.ts
export class AnalyzerRegistry {
  private analyzers = new Map<string, Analyzer>();
  
  register(analyzer: Analyzer): void;
  unregister(name: string): boolean;
  get(name: string): Analyzer | undefined;
  getAll(): Analyzer[];
  getForEcosystem(ecosystem: Ecosystem): Analyzer[];
  getForPath(path: string): Promise<Analyzer[]>; // Runs detects()
}
```

### 3. Diagnostic Normalization
All analyzers output standardized `Diagnostic[]`:

```typescript
// packages/core/src/types.ts (extended)
export interface Diagnostic {
  readonly severity: DiagnosticSeverity;  // error | warning | info | hint
  readonly code: string;                  // Standardized: "QML_UNRESOLVED_IMPORT"
  readonly message: string;               // Human-readable
  readonly location: DiagnosticLocation;  // File + line/column
  readonly explanation?: string;          // Why this matters
  readonly fix?: string;                  // Suggested fix (for future --fix)
  readonly references?: Reference[];      // Links to NRDG guides
  readonly analyzer: string;              // Source analyzer name
}

export interface DiagnosticLocation {
  readonly file: string;                  // Relative to project root
  readonly line?: number;
  readonly column?: number;
  readonly endLine?: number;
  readonly endColumn?: number;
}
```

### 4. Tool Integration Strategy
Each analyzer wraps external tools with consistent patterns:

```typescript
// Base class for tool-based analyzers
abstract class ToolAnalyzer implements Analyzer {
  abstract readonly name: string;
  abstract readonly supportedEcosystems: Ecosystem[];
  
  protected abstract getToolCommands(): ToolCommand[];
  
  async analyze(path: string, config?: AnalyzerConfig): Promise<AnalyzerResult> {
    const results = await Promise.allSettled(
      this.getToolCommands().map(cmd => this.runTool(cmd, path, config))
    );
    
    const diagnostics = results
      .filter((r): r is PromiseFulfilledResult<Diagnostic[]> => r.status === 'fulfilled')
      .flatMap(r => r.value);
    
    const errors = results
      .filter((r): r is PromiseRejectedResult => r.status === 'rejected')
      .map(r => this.createToolErrorDiagnostic(r.reason));
    
    return {
      project: await this.detectProject(path),
      diagnostics: [...diagnostics, ...errors],
      metadata: { toolsRun: this.getToolCommands().map(c => c.name) }
    };
  }
  
  private async runTool(cmd: ToolCommand, path: string, config?: AnalyzerConfig): Promise<Diagnostic[]> {
    // Timeout, parse output, normalize to Diagnostic[]
  }
}

interface ToolCommand {
  name: string;           // e.g., "qmllint"
  args: string[];         // e.g., ["--json", "."]
  parseOutput: (output: string, path: string) => Diagnostic[];
  required: boolean;      // If true, missing tool = error; else warning
}
```

### 5. Graceful Degradation
- **Missing required tool**: Return diagnostic with `severity: 'warning'`, code `TOOL_MISSING`
- **Tool execution error**: Return diagnostic with `severity: 'error'`, code `TOOL_EXECUTION_FAILED`
- **Tool timeout**: Return diagnostic with `severity: 'warning'`, code `TOOL_TIMEOUT`
- **Parse error**: Return diagnostic with `severity: 'warning'`, code `TOOL_PARSE_ERROR`
- **Never throw**: All failures captured as diagnostics

### 6. Parallel Execution
```typescript
// In CLI / MCP handler
async function runAnalyzers(path: string, analyzers: Analyzer[]): Promise<AnalyzerResult[]> {
  return Promise.all(
    analyzers.map(a => a.analyze(path).catch(err => ({
      project: { type: 'unknown', root: path, files: [], dependencies: [], issues: [] },
      diagnostics: [{ 
        severity: 'error', 
        code: 'ANALYZER_CRASH', 
        message: `Analyzer ${a.name} failed: ${err.message}`,
        location: { file: path },
        analyzer: a.name
      }],
      metadata: {}
    })))
  );
}
```

## Consequences

### Positive
- **Clean separation**: Each analyzer independent, testable in isolation
- **Ecosystem extensibility**: Add new analyzer without touching existing code
- **Unified output**: All diagnostics follow same schema for CLI/MCP
- **Resilience**: One analyzer's failure doesn't block others
- **Parallelism**: Natural fit for concurrent execution
- **Tool abstraction**: Easy to swap qmllint for alternative linter

### Negative
- **Registry overhead**: Slight indirection for analyzer lookup
- **Duplicate detection**: Multiple analyzers may report same issue (dedup in CLI)
- **Config complexity**: Per-analyzer options need management

## Alternatives Considered

| Alternative | Evaluation |
|-------------|------------|
| **Monolithic analyzer** | Single class with ecosystem switch; violates SRP, hard to test |
| **Function-based** | Simple functions; no lifecycle, no tool management, no config |
| **External process per analyzer** | Overhead of IPC; complex error handling; not needed for Node tools |
| **Language-specific packages** | Duplicates tool integration logic; harder to coordinate |

## Implementation Plan

### Phase 1: Core Infrastructure (Week 3, Day 1-2)
1. `Analyzer` interface + `AnalyzerRegistry` in `@nullroot/analyzers`
2. `ToolAnalyzer` base class with timeout, parsing, error handling
3. Diagnostic normalization utilities
4. Registry exports in `analyzers/src/index.ts`

### Phase 2: Quickshell + QML Analyzers (Week 3, Day 2-3)
1. `QuickshellAnalyzer` - extends `ToolAnalyzer`
   - Tools: qmllint (JSON), qmlformat (diff), qmlimportscanner (JSON)
   - Project detection: shell.qml, modules/, widgets/, services/
2. `QMLAnalyzer` - shared QML tool logic, Qt-specific checks
   - Reuses qmllint/qmlformat/qmlimportscanner parsing

### Phase 3: Hyprland Analyzer (Week 3, Day 3-4)
1. `HyprlandAnalyzer` - extends `ToolAnalyzer`
   - Tools: hyprctl (JSON for validation), config parser
   - Project detection: hyprland.conf, includes/
   - Config validation: syntax, deprecated options, rule structure

### Phase 4: Lua Analyzer (Week 3, Day 4)
1. `LuaAnalyzer` - extends `ToolAnalyzer`
   - Tools: luac (syntax), luacheck (JSON linting)
   - Project detection: *.lua, init.lua, rockspec
   - Module analysis: require graph, circular deps

### Phase 5: Wayland/Linux Detection (Week 3, Day 4-5)
1. Environment detection in `@nullroot/core` or `@nullroot/analyzers`
   - D-Bus introspection (busctl, gdbus)
   - systemd user units (systemctl --user)
   - PipeWire (pw-cli, pw-dump)
   - NetworkManager (nmcli)
   - No external tools required (uses system commands)

### Phase 6: Integration & Tests (Week 3, Day 5)
1. CLI `inspect` command uses registry
2. CLI `audit` command runs all applicable analyzers
3. MCP `inspect_project` and `run_diagnostics` use registry
4. Fixture projects for each ecosystem in `tests/fixtures/`
5. Unit tests for each analyzer with mocked tools

## Testing Strategy

### Unit Tests (per analyzer)
- Mock tool output → verify diagnostic parsing
- Missing tool → verify warning diagnostic
- Tool timeout → verify timeout diagnostic
- Malformed output → verify parse error diagnostic
- Valid project → verify project detection

### Integration Tests
- Fixture projects with known issues
- Run full analyzer suite → verify all expected diagnostics found
- Cross-analyzer deduplication (same issue reported twice)
- Performance: 5 analyzers on medium project < 10s

### Fixture Projects Structure
```
tests/fixtures/
├── quickshell/
│   ├── valid-project/
│   │   ├── shell.qml
│   │   └── modules/bar.qml
│   ├── missing-import/
│   │   └── shell.qml          // import NonExistentModule
│   └── formatting-issues/
│       └── shell.qml          // Bad formatting
├── hyprland/
│   ├── valid-config/
│   │   └── hyprland.conf
│   ├── deprecated-windowrule/
│   │   └── hyprland.conf      // Uses windowrule not windowrulev2
│   └── syntax-error/
│       └── hyprland.conf      // Invalid bind syntax
├── qml/
│   └── ...
├── lua/
│   └── ...
└── linux-desktop/
    └── ...
```

## Future Extensibility

This architecture supports:
- **Third-party analyzers**: npm packages can register analyzers
- **Language servers**: LSP integration as analyzer (future)
- **Custom rules**: User-defined diagnostic rules (future)
- **Fix providers**: `--fix` flag with analyzer-provided fixes (future)