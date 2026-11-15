# Evaluation Methodology Documentation

## Overview

NRDG includes a reproducible evaluation framework to measure the effectiveness of AI agents when using NRDG guidance vs. working without it. This document defines the methodology, tasks, metrics, and reporting standards.

## Evaluation Design

### Experimental Setup

**Two conditions compared:**
- **Condition A (Control)**: Agent works without NRDG guidance
- **Condition B (Treatment)**: Agent works with NRDG guidance (search, retrieve, compatibility, analyzers)

**Assignment**: Randomized per task iteration
**Blinding**: Evaluator blinded to condition where possible
**Replication**: Minimum 3 iterations per task per condition

### Environment Control

All evaluations run in controlled environment:
- Fixed Linux distribution (Arch Linux latest)
- Fixed Hyprland version
- Fixed Quickshell version
- Fixed Qt version
- Fixed Lua version
- Clean project directory per iteration
- No internet access (offline mode)

## Benchmark Tasks

### Task 1: Build a Quickshell Popup

**Specification**: Create a clickable popup menu with 3 items that executes shell commands.

**Requirements**:
- Proper `Popup` component usage
- Correct positioning relative to trigger
- Shell command execution via `Process`
- Cleanup on close

**Environment**: Quickshell 1.2+, Qt 6.8+

**Golden Solution**: Reference implementation in `evals/fixtures/quickshell-popup/`

**Failure Conditions**:
- Popup doesn't appear
- Commands don't execute
- Memory leak (popup not destroyed)
- Incorrect anchoring

### Task 2: Create a Workspace Indicator

**Specification**: Build a workspace indicator showing current/occupied workspaces with click-to-switch.

**Requirements**:
- `WorkspaceIndicator` or custom implementation
- Real-time workspace state via Hyprland IPC
- Click handling for workspace switching
- Visual distinction for active/occupied/empty

**Environment**: Hyprland 0.45+, Quickshell 1.2+

**Golden Solution**: Reference implementation in `evals/fixtures/workspace-indicator/`

**Failure Conditions**:
- Doesn't reflect current workspace
- Click doesn't switch workspace
- Flickering/performance issues
- Hyprland IPC errors

### Task 3: Diagnose Unresolved QML Import

**Specification**: Given a QML file with unresolved import, identify the cause and provide fix.

**Test Case**: File imports `NonExistentModule` and uses `QuickShell` incorrectly.

**Requirements**:
- Identify missing import
- Distinguish between Qt modules, QuickShell modules, and user modules
- Suggest correct import path
- Explain module resolution rules

**Environment**: qmllint, qmlimportscanner available

**Golden Solution**: Diagnostic with exact line/column, explanation, fix

**Failure Conditions**:
- Misses the import error
- Suggests wrong module
- Doesn't explain resolution

### Task 4: Validate Hyprland Configuration

**Specification**: Given a Hyprland config with syntax errors and deprecated options, produce diagnostics.

**Test Case**: Config with `windowrule` (deprecated), invalid `bind` syntax, missing `monitor` section.

**Requirements**:
- Detect deprecated `windowrule` → `windowrulev2`
- Identify syntax errors with line numbers
- Validate monitor configuration
- Check keybind conflicts

**Environment**: Hyprland config validator (if available) or manual parsing

**Golden Solution**: Structured diagnostics with severity, location, fix

**Failure Conditions**:
- Misses deprecation
- False positive on valid syntax
- No line numbers

### Task 5: Analyze a Lua Module

**Specification**: Given a Lua module with metatable issues and stdlib misuse, identify problems.

**Test Case**: Module with `__index` recursion, `table.insert` on non-array, missing `require` guards.

**Requirements**:
- Detect metatable recursion risk
- Identify stdlib misuse
- Check module structure
- Suggest idiomatic patterns

**Environment**: luac, luacheck available

**Golden Solution**: Diagnostics with explanations

**Failure Conditions**:
- Misses recursion
- False positive on valid patterns
- No actionable fix

### Task 6: Detect Unsupported API

**Specification**: Given a target version (Hyprland 0.40), check if `windowrulev2` is available.

**Requirements**:
- Query compatibility database
- Return compatibility result with version info
- Suggest alternative if incompatible
- Explain migration path

**Environment**: NRDG compatibility database

**Golden Solution**: `compatible: true, introduced: 0.35, deprecated: null, removed: null`

**Failure Conditions**:
- Wrong compatibility result
- Missing version info
- No replacement suggestion

### Task 7: Diagnose System Integration Issue

**Specification**: Given a Quickshell widget that should show battery status but shows "N/A", diagnose the cause.

**Test Case**: Widget uses `UPower` service but battery not detected.

**Requirements**:
- Check UPower daemon status
- Verify battery device exists
- Check D-Bus permissions
- Suggest debug commands

**Environment**: UPower, D-Bus, systemd user services

**Golden Solution**: Step-by-step diagnosis with commands

**Failure Conditions**:
- Doesn't check UPower
- Misses D-Bus permission issue
- Generic "check logs" advice

## Evaluation Metrics

### Primary Metrics

| Metric | Definition | Target |
|--------|------------|--------|
| **Correctness** | Solution meets all functional requirements (0-1) | ≥0.9 |
| **Compatibility** | Solution works on target version without deprecated APIs (0-1) | 1.0 |
| **Runtime Behavior** | Solution executes without crashes/errors (0-1) | 1.0 |

### Secondary Metrics

| Metric | Definition | Target |
|--------|------------|--------|
| **Time to Solution** | Wall-clock time from start to working solution | < Baseline |
| **Iterations to Success** | Number of fix-verify cycles | < Baseline |
| **Regression Count** | Features broken during development | 0 |
| **Code Quality** | Linting/style compliance (0-1) | ≥0.8 |

### Composite Score

```
Effectiveness = 0.4 * Correctness + 0.3 * Compatibility + 0.2 * Runtime + 0.1 * Quality
Improvement = (Effectiveness_B - Effectiveness_A) / Effectiveness_A
```

## Grading Protocol

### Automated Grader

Each task has an automated grader (`evals/graders/<task>.ts`):

```typescript
interface GraderResult {
  passed: boolean;
  score: number;        // 0-1
  details: {
    correctness: number;
    compatibility: number;
    runtime: number;
    quality: number;
  };
  failures: string[];   // Specific failure reasons
  evidence: string[];   // Supporting output/logs
}
```

### Manual Review

For subjective criteria (code quality, explanation clarity):
- Two independent reviewers
- Rubric-based scoring
- Inter-rater reliability measured (Cohen's κ ≥ 0.8)

## Statistical Analysis

### Sample Size
- Minimum 30 iterations per condition per task (10 tasks × 3 agents × 3 iterations = 90)
- Power analysis: 80% power to detect 15% improvement at α=0.05

### Tests
- **Paired t-test** for within-agent comparison (A vs B)
- **ANOVA** for between-agent comparison
- **Wilcoxon signed-rank** if non-normal distribution
- **Bonferroni correction** for multiple comparisons

### Effect Size Reporting
- Cohen's d for mean differences
- 95% confidence intervals
- Practical significance (not just statistical)

## Reporting Standards

### Per-Task Report
```json
{
  "task": "build-quickshell-popup",
  "conditionA": {
    "agent": "claude",
    "iterations": 3,
    "metrics": { "correctness": 0.67, "compatibility": 1.0, "runtime": 0.67, "quality": 0.5 },
    "avgTimeMs": 180000
  },
  "conditionB": {
    "agent": "claude",
    "iterations": 3,
    "metrics": { "correctness": 1.0, "compatibility": 1.0, "runtime": 1.0, "quality": 0.9 },
    "avgTimeMs": 90000
  },
  "improvement": { "effectiveness": 0.45, "pValue": 0.02, "cohensD": 1.2 }
}
```

### Aggregate Report
- Overall effectiveness improvement
- Per-agent breakdown
- Per-task breakdown
- Failure mode analysis
- Limitations and threats to validity

## Reproducibility

### Artifacts
All evaluation artifacts versioned:
- Task specifications (`evals/tasks/`)
- Fixtures (`evals/fixtures/`)
- Graders (`evals/graders/`)
- Baseline results (`evals/baseline/`)
- Raw results (`evals/reports/`)

### Execution
```bash
# Run full evaluation suite
nrdg eval --agent claude --iterations 5

# Run specific task
nrdg eval --task build-quickshell-popup --agent codex --iterations 3

# Compare conditions
nrdg eval --compare --task build-quickshell-popup
```

### CI Integration
- Nightly evaluation runs
- Regression detection (effectiveness drop > 10%)
- Automated report generation
- Artifact storage (30 days)

## Limitations

1. **Agent variability**: Different agents have different base capabilities
2. **Task representativeness**: 7 tasks may not cover all use cases
3. **Environment specificity**: Results tied to specific versions
4. **Grader completeness**: Automated graders may miss subtle issues
5. **Learning effects**: Agents may improve across iterations

## Ethical Considerations

- No user data collected
- No benchmark gaming (tasks fixed, not optimized for)
- Transparent reporting of all results (positive and negative)
- Clear labeling of AI-generated vs human-verified content