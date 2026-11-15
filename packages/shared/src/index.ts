/**
 * @nullroot/shared - Shared utilities, types, and helpers
 */

// Result type for fallible operations
export type Result<T, E = Error> =
  | { ok: true; value: T }
  | { ok: false; error: E };

export function ok<T>(value: T): Result<T, never> {
  return { ok: true, value };
}

export function err<E>(error: E): Result<never, E> {
  return { ok: false, error };
}

export function isOk<T, E>(result: Result<T, E>): result is { ok: true; value: T } {
  return result.ok;
}

export function isErr<T, E>(result: Result<T, E>): result is { ok: false; error: E } {
  return !result.ok;
}

// Async result helpers
export async function tryAsync<T, E = Error>(
  promise: Promise<T>,
  mapError?: (error: unknown) => E
): Promise<Result<T, E>> {
  try {
    const value = await promise;
    return ok(value);
  } catch (error) {
    return err(mapError ? mapError(error) : (error as E));
  }
}

// Version comparison
export function compareVersions(a: string, b: string): number {
  const aParts = a.split('.').map(Number);
  const bParts = b.split('.').map(Number);
  const maxLen = Math.max(aParts.length, bParts.length);

  for (let i = 0; i < maxLen; i++) {
    const aNum = aParts[i] ?? 0;
    const bNum = bParts[i] ?? 0;
    if (aNum !== bNum) return aNum - bNum;
  }
  return 0;
}

export function satisfiesVersion(version: string, range: string): boolean {
  // Simple semver range checking (supports ^, ~, >=, <=, >, <, =)
  // For full semver, consider using a dedicated library
  const cleanVersion = version.replace(/^v/, '');
  const cleanRange = range.replace(/^v/, '');

  if (cleanRange.startsWith('^')) {
    const base = cleanRange.slice(1);
    const [major] = base.split('.').map(Number);
    const [vMajor] = cleanVersion.split('.').map(Number);
    return vMajor === major && compareVersions(cleanVersion, base) >= 0;
  }

  if (cleanRange.startsWith('~')) {
    const base = cleanRange.slice(1);
    const [major, minor] = base.split('.').map(Number);
    const [vMajor, vMinor] = cleanVersion.split('.').map(Number);
    return vMajor === major && vMinor === minor && compareVersions(cleanVersion, base) >= 0;
  }

  if (cleanRange.startsWith('>=')) {
    return compareVersions(cleanVersion, cleanRange.slice(2)) >= 0;
  }

  if (cleanRange.startsWith('<=')) {
    return compareVersions(cleanVersion, cleanRange.slice(2)) <= 0;
  }

  if (cleanRange.startsWith('>')) {
    return compareVersions(cleanVersion, cleanRange.slice(1)) > 0;
  }

  if (cleanRange.startsWith('<')) {
    return compareVersions(cleanVersion, cleanRange.slice(1)) < 0;
  }

  if (cleanRange.startsWith('=')) {
    return compareVersions(cleanVersion, cleanRange.slice(1)) === 0;
  }

  // Exact match
  return compareVersions(cleanVersion, cleanRange) === 0;
}

// Path utilities
export function normalizePath(path: string): string {
  return path.replace(/\/+/g, '/').replace(/\/$/, '') || '/';
}

export function joinPaths(...parts: string[]): string {
  return normalizePath(parts.filter(Boolean).join('/'));
}

// String utilities
export function slugify(text: string): string {
  return text
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, '')
    .replace(/[\s_-]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

export function truncate(text: string, maxLength: number, suffix = '…'): string {
  if (text.length <= maxLength) return text;
  const truncated = text.slice(0, maxLength - suffix.length);
  // Truncate at last word boundary if possible
  const lastSpace = truncated.lastIndexOf(' ');
  if (lastSpace > 0) {
    return truncated.slice(0, lastSpace) + suffix;
  }
  return truncated + suffix;
}

// Object utilities
export function pick<T extends object, K extends keyof T>(
  obj: T,
  keys: K[]
): Pick<T, K> {
  const result = {} as Pick<T, K>;
  for (const key of keys) {
    if (key in obj) result[key] = obj[key];
  }
  return result;
}

export function omit<T extends object, K extends keyof T>(
  obj: T,
  keys: K[]
): Omit<T, K> {
  const result = { ...obj };
  for (const key of keys) {
    delete result[key];
  }
  return result;
}

// Deep clone
export function deepClone<T>(value: T): T {
  return JSON.parse(JSON.stringify(value));
}

// Checksum utility
export async function computeChecksum(data: string | Uint8Array): Promise<string> {
  const encoder = new TextEncoder();
  const buffer = typeof data === 'string' ? encoder.encode(data) : data;
  const hashBuffer = await crypto.subtle.digest('SHA-256', buffer);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}

// Timing utility
export function measureTime<T>(fn: () => T): { result: T; durationMs: number } {
  const start = performance.now();
  const result = fn();
  const durationMs = performance.now() - start;
  return { result, durationMs };
}

export async function measureTimeAsync<T>(fn: () => Promise<T>): Promise<{ result: T; durationMs: number }> {
  const start = performance.now();
  const result = await fn();
  const durationMs = performance.now() - start;
  return { result, durationMs };
}