/**
 * @nullroot/shared - Shared utilities, types, and helpers
 */
export type Result<T, E = Error> = {
    ok: true;
    value: T;
} | {
    ok: false;
    error: E;
};
export declare function ok<T>(value: T): Result<T, never>;
export declare function err<E>(error: E): Result<never, E>;
export declare function isOk<T, E>(result: Result<T, E>): result is {
    ok: true;
    value: T;
};
export declare function isErr<T, E>(result: Result<T, E>): result is {
    ok: false;
    error: E;
};
export declare function tryAsync<T, E = Error>(promise: Promise<T>, mapError?: (error: unknown) => E): Promise<Result<T, E>>;
export declare function compareVersions(a: string, b: string): number;
export declare function satisfiesVersion(version: string, range: string): boolean;
export declare function normalizePath(path: string): string;
export declare function joinPaths(...parts: string[]): string;
export declare function slugify(text: string): string;
export declare function truncate(text: string, maxLength: number, suffix?: string): string;
export declare function pick<T extends object, K extends keyof T>(obj: T, keys: K[]): Pick<T, K>;
export declare function omit<T extends object, K extends keyof T>(obj: T, keys: K[]): Omit<T, K>;
export declare function deepClone<T>(value: T): T;
export declare function computeChecksum(data: string | Uint8Array): Promise<string>;
export declare function measureTime<T>(fn: () => T): {
    result: T;
    durationMs: number;
};
export declare function measureTimeAsync<T>(fn: () => Promise<T>): Promise<{
    result: T;
    durationMs: number;
}>;
//# sourceMappingURL=index.d.ts.map