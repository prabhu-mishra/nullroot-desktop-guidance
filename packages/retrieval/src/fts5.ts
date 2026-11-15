/**
 * SQLite FTS5 integration
 */

import Database from 'better-sqlite3';
import type { Result } from '@nullroot/shared';

export interface FTS5Config {
  tableName: string;
  columns: string[];
  tokenize?: string;
}

export class FTS5Index {
  private db: Database.Database;
  private tableName: string;
  private columns: string[];

  constructor(db: Database.Database, config: FTS5Config, createTable = true) {
    this.db = db;
    this.tableName = config.tableName;
    this.columns = config.columns;
    if (createTable) {
      this.createTable(config);
    }
  }

  private createTable(config: FTS5Config): void {
    const columns = config.columns.join(', ');
    const tokenize = config.tokenize ?? 'porter unicode61';

    this.db.exec(`
      CREATE VIRTUAL TABLE IF NOT EXISTS ${this.tableName} USING fts5(
        ${columns},
        tokenize = '${tokenize}'
      );
    `);
  }

  insert(docId: string, data: Record<string, string>): void {
    // Use the stored column order to ensure consistency with table definition
    // docId is stored in the 'id' column (not rowid, which must be integer)
    const placeholders = this.columns.map(() => '?').join(', ');
    const values = this.columns.map(col => data[col] ?? '');

    this.db
      .prepare(`INSERT INTO ${this.tableName} (${this.columns.join(', ')}) VALUES (${placeholders})`)
      .run(...values);
  }

  search(query: string, limit = 10): Array<{ id: string; rank: number }> {
    const rows = this.db
      .prepare(`SELECT id, rank FROM ${this.tableName} WHERE ${this.tableName} MATCH ? ORDER BY rank LIMIT ?`)
      .all(query, limit) as Array<{ id: string; rank: number }>;

    return rows;
  }

  delete(docId: string): void {
    this.db.prepare(`DELETE FROM ${this.tableName} WHERE id = ?`).run(docId);
  }

  clear(): void {
    this.db.prepare(`DELETE FROM ${this.tableName}`).run();
  }

  optimize(): void {
    this.db.prepare(`INSERT INTO ${this.tableName}(${this.tableName}) VALUES('optimize')`).run();
  }
}

export function createFTS5Index(db: Database.Database, config: FTS5Config): Result<FTS5Index, Error> {
  try {
    return { ok: true, value: new FTS5Index(db, config, true) };
  } catch (error) {
    return { ok: false, error: error as Error };
  }
}

export function connectFTS5Index(db: Database.Database, tableName: string): FTS5Index {
  // For readonly access, we need the column list. We'll use a default that matches the standard schema.
  return new FTS5Index(db, {
    tableName,
    columns: [
      'title',
      'explanation',
      'patterns',
      'examples',
      'mistakes',
      'compatibility',
      'performance',
      'debugging',
      'tags',
      'ecosystem',
      'category',
    ]
  }, false);
}