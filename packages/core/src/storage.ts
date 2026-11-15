/**
 * Storage abstraction for NullRoot Desktop Guidance
 */

import Database from 'better-sqlite3';
import { joinPaths } from '@nullroot/shared';
import type { Result } from '@nullroot/shared';
import { StorageError } from './errors.js';

export interface StorageConfig {
  path: string;
  readonly?: boolean;
  walMode?: boolean;
}

export interface Migration {
  version: number;
  up: (db: Database.Database) => void;
  down?: (db: Database.Database) => void;
}

export class Storage {
  private db: Database.Database;
  private migrations: Migration[] = [];
  private currentVersion = 0;

  constructor(private config: StorageConfig) {
    this.db = new Database(config.path, {
      readonly: config.readonly ?? false,
    });

    if (config.walMode !== false) {
      this.db.pragma('journal_mode = WAL');
    }

    this.initializeMigrations();
    this.runMigrations();
  }

  private initializeMigrations(): void {
    this.migrations = [
      {
        version: 1,
        up: (db) => {
          db.exec(`
            CREATE TABLE IF NOT EXISTS metadata (
              key TEXT PRIMARY KEY,
              value TEXT NOT NULL
            );
          `);
        },
      },
    ];
  }

  private runMigrations(): void {
    const storedVersion = this.getMetadata('schema_version') ?? 0;
    this.currentVersion = storedVersion;

    for (const migration of this.migrations) {
      if (migration.version > this.currentVersion) {
        this.db.transaction(() => {
          migration.up(this.db);
          this.setMetadata('schema_version', String(migration.version));
        })();
        this.currentVersion = migration.version;
      }
    }
  }

  getDatabase(): Database.Database {
    return this.db;
  }

  getVersion(): number {
    return this.currentVersion;
  }

  getMetadata(key: string): string | undefined {
    const row = this.db.prepare('SELECT value FROM metadata WHERE key = ?').get(key) as
      | { value: string }
      | undefined;
    return row?.value;
  }

  setMetadata(key: string, value: string): void {
    this.db
      .prepare('INSERT OR REPLACE INTO metadata (key, value) VALUES (?, ?)')
      .run(key, value);
  }

  deleteMetadata(key: string): void {
    this.db.prepare('DELETE FROM metadata WHERE key = ?').run(key);
  }

  transaction<T>(fn: () => T): T {
    return this.db.transaction(fn)();
  }

  prepare(sql: string): Database.Statement {
    return this.db.prepare(sql);
  }

  exec(sql: string): void {
    this.db.exec(sql);
  }

  close(): void {
    this.db.close();
  }

  static async create(config: StorageConfig): Promise<Result<Storage, StorageError>> {
    try {
      const storage = new Storage(config);
      return { ok: true, value: storage };
    } catch (error) {
      return {
        ok: false,
        error: new StorageError(
          'Failed to create storage',
          'create',
          { path: config.path, error: String(error) }
        ),
      };
    }
  }

  static getDefaultPath(): string {
    const home = process.env.HOME ?? process.env.USERPROFILE ?? '.';
    return joinPaths(home, '.local', 'share', 'nullroot-desktop-guidance', 'nrdg.db');
  }
}

export function createStorage(config?: Partial<StorageConfig>): Result<Storage, StorageError> {
  const fullConfig: StorageConfig = {
    path: config?.path ?? Storage.getDefaultPath(),
    readonly: config?.readonly ?? false,
    walMode: config?.walMode ?? true,
  };
  return Storage.create(fullConfig);
}