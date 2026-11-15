/**
 * Tests for @nullroot/shared
 */

import { describe, it, expect } from 'vitest';
import {
  ok,
  err,
  isOk,
  isErr,
  tryAsync,
  compareVersions,
  satisfiesVersion,
  normalizePath,
  joinPaths,
  slugify,
  truncate,
  pick,
  omit,
  deepClone,
  computeChecksum,
  measureTime,
  measureTimeAsync,
} from './index.ts';

describe('shared utilities', () => {
  describe('Result type', () => {
    it('creates ok result', () => {
      const result = ok(42);
      expect(isOk(result)).toBe(true);
      expect(result.value).toBe(42);
    });

    it('creates err result', () => {
      const result = err(new Error('test'));
      expect(isErr(result)).toBe(true);
      expect(result.error.message).toBe('test');
    });
  });

  describe('tryAsync', () => {
    it('handles successful promise', async () => {
      const result = await tryAsync(Promise.resolve('success'));
      expect(isOk(result)).toBe(true);
      expect(result.value).toBe('success');
    });

    it('handles failed promise', async () => {
      const result = await tryAsync(Promise.reject(new Error('fail')));
      expect(isErr(result)).toBe(true);
    });
  });

  describe('compareVersions', () => {
    it('compares versions correctly', () => {
      expect(compareVersions('1.0.0', '1.0.0')).toBe(0);
      expect(compareVersions('1.0.0', '2.0.0')).toBeLessThan(0);
      expect(compareVersions('2.0.0', '1.0.0')).toBeGreaterThan(0);
      expect(compareVersions('1.10.0', '1.2.0')).toBeGreaterThan(0);
    });
  });

  describe('satisfiesVersion', () => {
    it('checks version ranges', () => {
      expect(satisfiesVersion('1.5.0', '^1.0.0')).toBe(true);
      expect(satisfiesVersion('2.0.0', '^1.0.0')).toBe(false);
      expect(satisfiesVersion('1.2.5', '~1.2.0')).toBe(true);
      expect(satisfiesVersion('1.3.0', '~1.2.0')).toBe(false);
      expect(satisfiesVersion('1.5.0', '>=1.0.0')).toBe(true);
      expect(satisfiesVersion('0.9.0', '>=1.0.0')).toBe(false);
    });
  });

  describe('normalizePath', () => {
    it('normalizes paths', () => {
      expect(normalizePath('/home//user/')).toBe('/home/user');
      expect(normalizePath('home/user')).toBe('home/user');
      expect(normalizePath('///')).toBe('/');
    });
  });

  describe('joinPaths', () => {
    it('joins paths', () => {
      expect(joinPaths('home', 'user', 'file')).toBe('home/user/file');
      expect(joinPaths('/home', 'user', 'file')).toBe('/home/user/file');
    });
  });

  describe('slugify', () => {
    it('creates slugs', () => {
      expect(slugify('Hello World')).toBe('hello-world');
      expect(slugify('Test_String!')).toBe('test-string');
    });
  });

  describe('truncate', () => {
    it('truncates strings', () => {
      expect(truncate('hello world', 8)).toBe('hello…');
      expect(truncate('hi', 10)).toBe('hi');
    });
  });

  describe('pick and omit', () => {
    it('picks keys', () => {
      const obj = { a: 1, b: 2, c: 3 };
      expect(pick(obj, ['a', 'c'])).toEqual({ a: 1, c: 3 });
    });

    it('omits keys', () => {
      const obj = { a: 1, b: 2, c: 3 };
      expect(omit(obj, ['b'])).toEqual({ a: 1, c: 3 });
    });
  });

  describe('deepClone', () => {
    it('clones objects', () => {
      const obj = { a: { b: 1 } };
      const clone = deepClone(obj);
      clone.a.b = 2;
      expect(obj.a.b).toBe(1);
    });
  });

  describe('computeChecksum', () => {
    it('computes SHA-256 checksum', async () => {
      const checksum = await computeChecksum('test');
      expect(checksum).toHaveLength(64);
      expect(checksum).toMatch(/^[a-f0-9]+$/);
    });
  });

  describe('measureTime', () => {
    it('measures sync function time', () => {
      const { result, durationMs } = measureTime(() => {
        let sum = 0;
        for (let i = 0; i < 10000; i++) sum += i;
        return sum;
      });
      expect(result).toBe(49995000);
      expect(durationMs).toBeGreaterThanOrEqual(0);
    });
  });

  describe('measureTimeAsync', () => {
    it('measures async function time', async () => {
      const { result, durationMs } = await measureTimeAsync(async () => {
        await new Promise((r) => setTimeout(r, 10));
        return 'done';
      });
      expect(result).toBe('done');
      // Allow some margin for system scheduling
      expect(durationMs).toBeGreaterThanOrEqual(8);
    });
  });
});