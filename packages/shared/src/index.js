/**
 * @nullroot/shared - Shared utilities, types, and helpers
 */
export function ok(value) {
    return { ok: true, value };
}
export function err(error) {
    return { ok: false, error };
}
export function isOk(result) {
    return result.ok;
}
export function isErr(result) {
    return !result.ok;
}
// Async result helpers
export async function tryAsync(promise, mapError) {
    try {
        const value = await promise;
        return ok(value);
    }
    catch (error) {
        return err(mapError ? mapError(error) : error);
    }
}
// Version comparison
export function compareVersions(a, b) {
    const aParts = a.split('.').map(Number);
    const bParts = b.split('.').map(Number);
    const maxLen = Math.max(aParts.length, bParts.length);
    for (let i = 0; i < maxLen; i++) {
        const aNum = aParts[i] ?? 0;
        const bNum = bParts[i] ?? 0;
        if (aNum !== bNum)
            return aNum - bNum;
    }
    return 0;
}
export function satisfiesVersion(version, range) {
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
export function normalizePath(path) {
    return path.replace(/\/+/g, '/').replace(/\/$/, '') || '/';
}
export function joinPaths(...parts) {
    return normalizePath(parts.filter(Boolean).join('/'));
}
// String utilities
export function slugify(text) {
    return text
        .toLowerCase()
        .trim()
        .replace(/[^\w\s-]/g, '')
        .replace(/[\s_-]+/g, '-')
        .replace(/^-+|-+$/g, '');
}
export function truncate(text, maxLength, suffix = '…') {
    if (text.length <= maxLength)
        return text;
    const truncated = text.slice(0, maxLength - suffix.length);
    // Truncate at last word boundary if possible
    const lastSpace = truncated.lastIndexOf(' ');
    if (lastSpace > 0) {
        return truncated.slice(0, lastSpace) + suffix;
    }
    return truncated + suffix;
}
// Object utilities
export function pick(obj, keys) {
    const result = {};
    for (const key of keys) {
        if (key in obj)
            result[key] = obj[key];
    }
    return result;
}
export function omit(obj, keys) {
    const result = { ...obj };
    for (const key of keys) {
        delete result[key];
    }
    return result;
}
// Deep clone
export function deepClone(value) {
    return JSON.parse(JSON.stringify(value));
}
// Checksum utility
export async function computeChecksum(data) {
    const encoder = new TextEncoder();
    const buffer = typeof data === 'string' ? encoder.encode(data) : data;
    const hashBuffer = await crypto.subtle.digest('SHA-256', buffer);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}
// Timing utility
export function measureTime(fn) {
    const start = performance.now();
    const result = fn();
    const durationMs = performance.now() - start;
    return { result, durationMs };
}
export async function measureTimeAsync(fn) {
    const start = performance.now();
    const result = await fn();
    const durationMs = performance.now() - start;
    return { result, durationMs };
}
//# sourceMappingURL=index.js.map