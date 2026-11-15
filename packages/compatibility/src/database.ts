/**
 * Compatibility database
 */

import Database from 'better-sqlite3';
import type { Result } from '@nullroot/shared';
import type { CompatibilityEntry, CompatibilityQuery } from './models.js';

export class CompatibilityDatabase {
  private db: Database.Database;

  constructor(dbPath: string) {
    this.db = new Database(dbPath);
    this.initialize();
  }

  private initialize(): void {
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS compatibility (
        id TEXT PRIMARY KEY,
        ecosystem TEXT NOT NULL,
        component TEXT NOT NULL,
        api TEXT NOT NULL,
        first_supported TEXT NOT NULL,
        deprecated_in TEXT,
        removed_in TEXT,
        replacement TEXT,
        source TEXT NOT NULL,
        verified_date TEXT NOT NULL,
        notes TEXT
      );

      CREATE INDEX IF NOT EXISTS idx_compat_ecosystem ON compatibility(ecosystem);
      CREATE INDEX IF NOT EXISTS idx_compat_component ON compatibility(component);
      CREATE INDEX IF NOT EXISTS idx_compat_api ON compatibility(api);
    `);
  }

  insert(entry: CompatibilityEntry): Result<void, Error> {
    try {
      this.db.prepare(`
        INSERT OR REPLACE INTO compatibility
        (id, ecosystem, component, api, first_supported, deprecated_in, removed_in, replacement, source, verified_date, notes)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `).run(
        entry.id,
        entry.ecosystem,
        entry.component,
        entry.api,
        entry.firstSupported,
        entry.deprecatedIn ?? null,
        entry.removedIn ?? null,
        entry.replacement ?? null,
        entry.source,
        entry.verifiedDate,
        entry.notes ?? null
      );
      return { ok: true, value: undefined };
    } catch (error) {
      return { ok: false, error: error as Error };
    }
  }

  query(query: CompatibilityQuery): CompatibilityEntry[] {
    let sql = 'SELECT * FROM compatibility WHERE 1=1';
    const params: unknown[] = [];

    if (query.ecosystem) {
      sql += ' AND ecosystem = ?';
      params.push(query.ecosystem);
    }
    if (query.component) {
      sql += ' AND component = ?';
      params.push(query.component);
    }
    if (query.api) {
      sql += ' AND api = ?';
      params.push(query.api);
    }

    return this.db.prepare(sql).all(...params) as CompatibilityEntry[];
  }

  checkCompatibility(
    ecosystem: string,
    component: string,
    api: string,
    version: string
  ): { compatible: boolean; entry?: CompatibilityEntry } {
    const entries = this.query({ ecosystem: ecosystem as any, component, api });
    if (entries.length === 0) {
      return { compatible: false };
    }

    const entry = entries[0];
    // Version comparison logic would go here
    return { compatible: true, entry };
  }

  close(): void {
    this.db.close();
  }
}

export function createCompatibilityDatabase(dbPath: string): CompatibilityDatabase {
  return new CompatibilityDatabase(dbPath);
}