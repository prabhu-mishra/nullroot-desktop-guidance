/**
 * Configuration management for NullRoot Desktop Guidance
 */

import { z } from 'zod';
import type { Result } from '@nullroot/shared';
import { ConfigurationError } from './errors.js';

export const NRDGConfigSchema = z.object({
  version: z.number().int().positive().default(1),
  dataDir: z.string().optional(),
  knowledge: z.object({
    enabledEcosystems: z.array(z.string()).default([
      'quickshell',
      'hyprland',
      'qt-qml',
      'lua',
      'wayland',
      'linux-desktop',
    ]),
    autoIndex: z.boolean().default(true),
    indexInterval: z.number().int().positive().default(3600), // seconds
  }),
  retrieval: z.object({
    defaultLimit: z.number().int().positive().default(10),
    maxLimit: z.number().int().positive().default(100),
    enableSemantic: z.boolean().default(false),
    semanticProvider: z.string().optional(),
    semanticModel: z.string().optional(),
  }),
  cli: z.object({
    outputFormat: z.enum(['table', 'json', 'yaml']).default('table'),
    color: z.boolean().default(true),
    pager: z.boolean().default(true),
  }),
  mcp: z.object({
    enabled: z.boolean().default(false),
    port: z.number().int().positive().default(3000),
    host: z.string().default('localhost'),
  }),
  logging: z.object({
    level: z.enum(['debug', 'info', 'warn', 'error']).default('info'),
    file: z.string().optional(),
  }),
});

export type NRDGConfig = z.infer<typeof NRDGConfigSchema>;

export const defaultConfig: NRDGConfig = NRDGConfigSchema.parse({});

export function validateConfig(config: unknown): Result<NRDGConfig, ConfigurationError> {
  const result = NRDGConfigSchema.safeParse(config);
  if (result.success) {
    return { ok: true, value: result.data };
  }
  return {
    ok: false,
    error: new ConfigurationError('Invalid configuration', {
      issues: result.error.issues.map((i) => ({
        path: i.path.join('.'),
        message: i.message,
      })),
    }),
  };
}

export function mergeConfig(base: NRDGConfig, override: Partial<NRDGConfig>): NRDGConfig {
  return NRDGConfigSchema.parse({ ...base, ...override });
}

export function getConfigPath(): string {
  const home = process.env.HOME ?? process.env.USERPROFILE ?? '.';
  const configHome = process.env.XDG_CONFIG_HOME ?? joinPaths(home, '.config');
  return joinPaths(configHome, 'nullroot-desktop-guidance', 'config.json');
}

import { joinPaths } from '@nullroot/shared';