/**
 * Configuration manager
 */

import { readFile, writeFile, mkdir } from 'fs/promises';
import { joinPaths } from '@nullroot/shared';
import type { Result } from '@nullroot/shared';
import { NRDGConfigSchema, type NRDGConfig, defaultConfig, getConfigPath, validateConfig } from '@nullroot/core';
import { ConfigurationError } from '@nullroot/core';

export class ConfigManager {
  private config: NRDGConfig;
  private configPath: string;

  constructor(config?: Partial<NRDGConfig>, configPath?: string) {
    this.configPath = configPath ?? getConfigPath();
    this.config = NRDGConfigSchema.parse({ ...defaultConfig, ...config });
  }

  getConfig(): NRDGConfig {
    return this.config;
  }

  get<T>(key: string): T | undefined {
    const keys = key.split('.');
    let value: unknown = this.config;
    for (const k of keys) {
      if (value && typeof value === 'object' && k in value) {
        value = (value as Record<string, unknown>)[k];
      } else {
        return undefined;
      }
    }
    return value as T;
  }

  set(key: string, value: unknown): Result<void, ConfigurationError> {
    const keys = key.split('.');
    const newConfig = { ...this.config };
    let target: Record<string, unknown> = newConfig;

    for (let i = 0; i < keys.length - 1; i++) {
      const k = keys[i];
      if (!(k in target) || typeof target[k] !== 'object') {
        target[k] = {};
      }
      target = target[k] as Record<string, unknown>;
    }

    target[keys[keys.length - 1]] = value;

    const validation = validateConfig(newConfig);
    if (!validation.ok) {
      return { ok: false, error: validation.error };
    }

    this.config = validation.value;
    return { ok: true, value: undefined };
  }

  async load(): Promise<Result<void, Error>> {
    try {
      const content = await readFile(this.configPath, 'utf-8');
      const parsed = JSON.parse(content);
      const validation = validateConfig(parsed.config ?? parsed);
      if (validation.ok) {
        this.config = validation.value;
      }
      return { ok: true, value: undefined };
    } catch {
      // Config file doesn't exist, use defaults
      return { ok: true, value: undefined };
    }
  }

  async save(): Promise<Result<void, Error>> {
    try {
      await mkdir(this.configPath.split('/').slice(0, -1).join('/'), { recursive: true });
      const configFile = {
        version: 1,
        config: this.config,
      };
      await writeFile(this.configPath, JSON.stringify(configFile, null, 2));
      return { ok: true, value: undefined };
    } catch (error) {
      return { ok: false, error: error as Error };
    }
  }

  reset(): void {
    this.config = defaultConfig;
  }
}

export function createConfigManager(config?: Partial<NRDGConfig>, configPath?: string): ConfigManager {
  return new ConfigManager(config, configPath);
}