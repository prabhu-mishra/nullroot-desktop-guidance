/**
 * BM25 ranking implementation
 */

export interface BM25Config {
  k1: number;
  b: number;
}

export const DEFAULT_BM25_CONFIG: BM25Config = {
  k1: 1.2,
  b: 0.75,
};

export function computeBM25(
  termFreq: number,
  docLength: number,
  avgDocLength: number,
  docCount: number,
  docFreq: number,
  config: BM25Config = DEFAULT_BM25_CONFIG
): number {
  const { k1, b } = config;

  const idf = Math.log((docCount - docFreq + 0.5) / (docFreq + 0.5) + 1);
  const numerator = termFreq * (k1 + 1);
  const denominator = termFreq + k1 * (1 - b + b * (docLength / avgDocLength));

  return idf * (numerator / denominator);
}

/**
 * Splits camelCase and PascalCase identifiers into space-separated words.
 * Also handles snake_case, kebab-case, and mixed separators.
 *
 * Examples:
 *   'WorkspaceIndicator' -> 'workspace indicator'
 *   'workspaceIndicator' -> 'workspace indicator'
 *   'workspace_indicator' -> 'workspace indicator'
 *   'workspace-indicator' -> 'workspace indicator'
 *   'XMLHttpRequest' -> 'xml http request'
 *   'getHTTPResponse' -> 'get http response'
 */
export function splitCamelCase(text: string): string {
  return text
    // Insert space before uppercase letters that follow lowercase letters or digits
    .replace(/([a-z0-9])([A-Z])/g, '$1 $2')
    // Insert space before uppercase letter followed by lowercase (for consecutive caps like XML)
    .replace(/([A-Z])([A-Z][a-z])/g, '$1 $2')
    // Replace underscores and hyphens with spaces
    .replace(/[_-]/g, ' ')
    // Convert to lowercase
    .toLowerCase()
    // Normalize multiple spaces
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * Tokenizes text for BM25 scoring, including camelCase splitting.
 * This ensures identifiers like 'WorkspaceIndicator' are searchable as 'workspace indicator'.
 */
export function tokenize(text: string): string[] {
  // First split camelCase, then tokenize normally
  const expandedText = splitCamelCase(text);
  return expandedText
    .toLowerCase()
    .replace(/[^\w\s]/g, ' ')
    .split(/\s+/)
    .filter((token) => token.length > 0);
}