/**
 * Core type definitions for NullRoot Desktop Guidance
 */

/**
 * Supported ecosystems
 */
export type Ecosystem =
  | 'quickshell'
  | 'hyprland'
  | 'qt-qml'
  | 'lua'
  | 'wayland'
  | 'linux-desktop';

/**
 * Guide categories per ecosystem
 */
export type Category =
  // Quickshell
  | 'fundamentals'
  | 'components'
  | 'services'
  | 'integrations'
  | 'ipc'
  | 'performance'
  // Hyprland
  | 'configuration'
  | 'rules'
  | 'animations'
  | 'ipc'
  | 'plugins'
  | 'troubleshooting'
  // Qt/QML
  | 'properties'
  | 'signals'
  | 'models'
  | 'lifecycle'
  | 'imports'
  | 'rendering'
  | 'apis'
  // Lua
  | 'syntax'
  | 'tables'
  | 'metatables'
  | 'coroutines'
  | 'modules'
  | 'stdlib'
  // Wayland
  | 'protocols'
  | 'surfaces'
  | 'outputs'
  | 'input'
  | 'extensions'
  // Linux Desktop
  | 'dbus'
  | 'systemd'
  | 'power'
  | 'audio'
  | 'network'
  | 'media'
  | 'bluetooth'
  | 'portals';

/**
 * Verification status for guides
 */
export type VerificationStatus =
  | 'verified'
  | 'reviewed'
  | 'community'
  | 'unverified'
  | 'deprecated';

/**
 * Base metadata for all knowledge entries
 */
export interface BaseMetadata {
  id: string;
  title: string;
  ecosystem: Ecosystem;
  category: Category;
  versions: string[];
  sources: SourceReference[];
  status: VerificationStatus;
  lastVerified: string; // ISO 8601 date
  tags: string[];
  checksum?: string;
}

/**
 * Source reference for verification
 */
export interface SourceReference {
  url: string;
  title: string;
  ecosystem: Ecosystem;
  versionApplicability?: string;
  retrieved: string; // ISO 8601 date
  license?: string;
  verificationState: 'official' | 'community' | 'derived';
}

/**
 * Guide content structure
 */
export interface GuideContent {
  explanation: string;
  patterns: ImplementationPattern[];
  examples: CodeExample[];
  mistakes: CommonMistake[];
  compatibility: CompatibilityNote[];
  performance: PerformanceConsideration[];
  debugging: DebuggingGuidance[];
  references: Reference[];
}

/**
 * Implementation pattern
 */
export interface ImplementationPattern {
  name: string;
  description: string;
  code: string;
  language: 'qml' | 'hyprlang' | 'lua' | 'typescript' | 'javascript' | 'cpp' | 'json' | 'yaml';
  context?: string;
}

/**
 * Code example
 */
export interface CodeExample {
  name: string;
  description: string;
  code: string;
  language: 'qml' | 'hyprlang' | 'lua' | 'typescript' | 'javascript' | 'cpp' | 'json' | 'yaml' | 'bash';
  runnable: boolean;
  dependencies?: string[];
}

/**
 * Common mistake
 */
export interface CommonMistake {
  pattern: string;
  problem: string;
  solution: string;
  severity: 'error' | 'warning' | 'info';
}

/**
 * Compatibility note
 */
export interface CompatibilityNote {
  api: string;
  introduced: string;
  deprecated?: string;
  removed?: string;
  replacement?: string;
  notes?: string;
}

/**
 * Performance consideration
 */
export interface PerformanceConsideration {
  area: string;
  impact: 'high' | 'medium' | 'low';
  description: string;
  mitigation?: string;
}

/**
 * Debugging guidance
 */
export interface DebuggingGuidance {
  symptom: string;
  cause: string;
  diagnosis: string;
  resolution: string;
  tools?: string[];
}

/**
 * Reference link
 */
export interface Reference {
  title: string;
  url: string;
  type: 'official' | 'community' | 'tutorial' | 'specification';
}

/**
 * Complete guide entry
 */
export interface GuideEntry extends BaseMetadata {
  content: GuideContent;
}

/**
 * Search result
 */
export interface SearchResult {
  id: string;
  title: string;
  ecosystem: Ecosystem;
  category: Category;
  snippet: string;
  score: number;
  metadata: Pick<BaseMetadata, 'versions' | 'status' | 'lastVerified' | 'tags'>;
}

/**
 * Search query options
 */
export interface SearchOptions {
  query: string;
  ecosystems?: Ecosystem[];
  categories?: Category[];
  versions?: string[];
  status?: VerificationStatus[];
  limit?: number;
  offset?: number;
}

/**
 * Diagnostic severity
 */
export type DiagnosticSeverity = 'error' | 'warning' | 'info' | 'hint';

/**
 * Diagnostic location
 */
export interface DiagnosticLocation {
  file: string;
  line?: number;
  column?: number;
  endLine?: number;
  endColumn?: number;
}

/**
 * Diagnostic entry
 */
export interface Diagnostic {
  severity: DiagnosticSeverity;
  code: string;
  message: string;
  location: DiagnosticLocation;
  explanation?: string;
  fix?: string;
  references?: Reference[];
}

/**
 * Environment detection result
 */
export interface EnvironmentInfo {
  distribution?: {
    name: string;
    version: string;
    id?: string;
  };
  kernel: string;
  desktopSession?: string;
  hyprland?: {
    version: string;
    instanceSignature?: string;
  };
  quickshell?: {
    version: string;
  };
  qt?: {
    version: string;
    path?: string;
  };
  lua?: {
    version: string;
    path?: string;
  };
  tools: {
    qmllint?: boolean;
    qmlformat?: boolean;
    qmlimportscanner?: boolean;
    luac?: boolean;
    luacheck?: boolean;
  };
  configPaths: {
    hyprland?: string;
    quickshell?: string;
  };
}

/**
 * Project inspection result
 */
export interface ProjectInfo {
  type: 'quickshell' | 'hyprland' | 'qml' | 'lua' | 'mixed' | 'unknown';
  root: string;
  files: ProjectFile[];
  dependencies: ProjectDependency[];
  issues: Diagnostic[];
}

/**
 * Project file
 */
export interface ProjectFile {
  path: string;
  type: 'qml' | 'hyprlang' | 'lua' | 'json' | 'yaml' | 'ts' | 'js' | 'other';
  size: number;
  imports?: string[];
  exports?: string[];
}

/**
 * Project dependency
 */
export interface ProjectDependency {
  name: string;
  version?: string;
  type: 'runtime' | 'development' | 'peer' | 'optional';
  ecosystem?: Ecosystem;
}

/**
 * Compatibility check result
 */
export interface CompatibilityResult {
  compatible: boolean;
  api: string;
  requestedVersion: string;
  availableVersion?: string;
  introducedVersion?: string;
  deprecatedVersion?: string;
  removedVersion?: string;
  replacement?: string;
  notes?: string;
}