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

export function tokenize(text: string): string[] {
  return text
    .toLowerCase()
    .replace(/[^\w\s]/g, ' ')
    .split(/\s+/)
    .filter((token) => token.length > 0);
}