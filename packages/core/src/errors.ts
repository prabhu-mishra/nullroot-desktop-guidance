/**
 * Core error classes for NullRoot Desktop Guidance
 */

export class NullRootError extends Error {
  constructor(
    message: string,
    public readonly code: string,
    public readonly context?: Record<string, unknown>
  ) {
    super(message);
    this.name = 'NullRootError';
    Error.captureStackTrace?.(this, this.constructor);
  }
}

export class ConfigurationError extends NullRootError {
  constructor(message: string, context?: Record<string, unknown>) {
    super(message, 'CONFIGURATION_ERROR', context);
    this.name = 'ConfigurationError';
  }
}

export class KnowledgeNotFoundError extends NullRootError {
  constructor(public readonly id: string) {
    super(`Knowledge entry not found: ${id}`, 'KNOWLEDGE_NOT_FOUND', { id });
    this.name = 'KnowledgeNotFoundError';
  }
}

export class SourceNotFoundError extends NullRootError {
  constructor(public readonly sourceId: string) {
    super(`Source not found: ${sourceId}`, 'SOURCE_NOT_FOUND', { sourceId });
    this.name = 'SourceNotFoundError';
  }
}

export class IndexBuildError extends NullRootError {
  constructor(message: string, context?: Record<string, unknown>) {
    super(message, 'INDEX_BUILD_ERROR', context);
    this.name = 'IndexBuildError';
  }
}

export class SearchError extends NullRootError {
  constructor(message: string, context?: Record<string, unknown>) {
    super(message, 'SEARCH_ERROR', context);
    this.name = 'SearchError';
  }
}

export class CompatibilityError extends NullRootError {
  constructor(message: string, context?: Record<string, unknown>) {
    super(message, 'COMPATIBILITY_ERROR', context);
    this.name = 'CompatibilityError';
  }
}

export class AnalyzerError extends NullRootError {
  constructor(message: string, public readonly analyzer: string, context?: Record<string, unknown>) {
    super(message, 'ANALYZER_ERROR', { analyzer, ...context });
    this.name = 'AnalyzerError';
  }
}

export class DetectionError extends NullRootError {
  constructor(message: string, public readonly target: string, context?: Record<string, unknown>) {
    super(message, 'DETECTION_ERROR', { target, ...context });
    this.name = 'DetectionError';
  }
}

export class ValidationError extends NullRootError {
  constructor(
    message: string,
    public readonly issues: Array<{ path: string; message: string }>,
    context?: Record<string, unknown>
  ) {
    super(message, 'VALIDATION_ERROR', { issues, ...context });
    this.name = 'ValidationError';
  }
}

export class StorageError extends NullRootError {
  constructor(message: string, public readonly operation: string, context?: Record<string, unknown>) {
    super(message, 'STORAGE_ERROR', { operation, ...context });
    this.name = 'StorageError';
  }
}

export class IntegrationError extends NullRootError {
  constructor(message: string, public readonly integration: string, context?: Record<string, unknown>) {
    super(message, 'INTEGRATION_ERROR', { integration, ...context });
    this.name = 'IntegrationError';
  }
}

export class MCPError extends NullRootError {
  constructor(message: string, public readonly method: string, context?: Record<string, unknown>) {
    super(message, 'MCP_ERROR', { method, ...context });
    this.name = 'MCPError';
  }
}

export function isNullRootError(error: unknown): error is NullRootError {
  return error instanceof NullRootError;
}

export function getErrorCode(error: unknown): string {
  if (isNullRootError(error)) return error.code;
  return 'UNKNOWN_ERROR';
}

export function getErrorContext(error: unknown): Record<string, unknown> | undefined {
  if (isNullRootError(error)) return error.context;
  return undefined;
}