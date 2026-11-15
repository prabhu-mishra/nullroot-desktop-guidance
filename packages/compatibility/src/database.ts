/**
 * Compatibility database
 */

import Database from 'better-sqlite3';
import type { Result } from '@nullroot/shared';
import type { CompatibilityEntry, CompatibilityQuery } from './models.js';
import { satisfiesVersion } from '@nullroot/shared';

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
        notes TEXT,
        UNIQUE(ecosystem, component, api)
      );

      CREATE INDEX IF NOT EXISTS idx_compat_ecosystem ON compatibility(ecosystem);
      CREATE INDEX IF NOT EXISTS idx_compat_component ON compatibility(component);
      CREATE INDEX IF NOT EXISTS idx_compat_api ON compatibility(api);
      CREATE INDEX IF NOT EXISTS idx_compat_first_supported ON compatibility(first_supported);
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
    let sql = `
      SELECT
        id,
        ecosystem,
        component,
        api,
        first_supported AS firstSupported,
        deprecated_in AS deprecatedIn,
        removed_in AS removedIn,
        replacement,
        source,
        verified_date AS verifiedDate,
        notes
      FROM compatibility WHERE 1=1
    `;
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

  /**
   * Query entries compatible with a specific version
   * Returns entries where firstSupported <= version AND (removedIn is null OR version < removedIn)
   */
  queryCompatible(ecosystem: string, version: string): Result<CompatibilityEntry[], Error> {
    try {
      type Ecosystem = 'quickshell' | 'hyprland' | 'qt-qml' | 'lua' | 'wayland' | 'linux-desktop';
      const entries = this.query({ ecosystem: ecosystem as Ecosystem });

      const filtered = entries.filter(entry => {
        // Check if introduced (version >= firstSupported)
        if (!satisfiesVersion(version, `>=${entry.firstSupported}`)) {
          return false;
        }
        // Check if removed (version < removedIn, or removedIn is null)
        if (entry.removedIn && satisfiesVersion(version, `>=${entry.removedIn}`)) {
          return false;
        }
        return true;
      });

      return { ok: true, value: filtered };
    } catch (error) {
      return { ok: false, error: error as Error };
    }
  }

  checkCompatibility(
    ecosystem: string,
    component: string,
    api: string,
    version: string
  ): { compatible: boolean; entry?: CompatibilityEntry; notes?: string } {
    type Ecosystem = 'quickshell' | 'hyprland' | 'qt-qml' | 'lua' | 'wayland' | 'linux-desktop';
    const entries = this.query({ ecosystem: ecosystem as Ecosystem, component, api });
    if (entries.length === 0) {
      return { compatible: false };
    }

    const entry = entries[0]!; // Non-null assertion: we checked length > 0

    // 1. Check if introduced (target version >= firstSupported)
    if (!satisfiesVersion(version, `>=${entry.firstSupported}`)) {
      return {
        compatible: false,
        entry,
        notes: `API introduced in ${entry.firstSupported}, not available in ${version}`
      };
    }

    // 2. Check if removed (target version >= removedIn)
    if (entry.removedIn && satisfiesVersion(version, `>=${entry.removedIn}`)) {
      return {
        compatible: false,
        entry,
        notes: `API removed in ${entry.removedIn}, unavailable in ${version}` +
               (entry.replacement ? `. Use ${entry.replacement} instead.` : '')
      };
    }

    // 3. Check if deprecated (target version >= deprecatedIn)
    if (entry.deprecatedIn && satisfiesVersion(version, `>=${entry.deprecatedIn}`)) {
      return {
        compatible: true,  // Still works but deprecated
        entry,
        notes: `API deprecated in ${entry.deprecatedIn}` +
               (entry.replacement ? `. Consider migrating to ${entry.replacement}.` : '')
      };
    }

    // 4. Compatible
    return { compatible: true, entry, notes: 'API available and supported' };
  }

  close(): void {
    this.db.close();
  }
}

export function createCompatibilityDatabase(dbPath: string): CompatibilityDatabase {
  return new CompatibilityDatabase(dbPath);
}