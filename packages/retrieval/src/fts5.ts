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

  constructor(db: Database.Database, config: FTS5Config) {
    this.db = db;
    this.tableName = config.tableName;
    this.createTable(config);
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
    const columns = Object.keys(data);
    const placeholders = columns.map(() => '?').join(', ');
    const values = [docId, ...Object.values(data)];

    this.db
      .prepare(`INSERT INTO ${this.tableName} (rowid, ${columns.join(', ')}) VALUES (?, ${placeholders})`)
      .run(...values);
  }

  search(query: string, limit = 10): Array<{ rowid: string; rank: number }> {
    const rows = this.db
      .prepare(`SELECT rowid, rank FROM ${this.tableName} WHERE ${this.tableName} MATCH ? ORDER BY rank LIMIT ?`)
      .all(query, limit) as Array<{ rowid: string; rank: number }>;

    return rows;
  }

  delete(docId: string): void {
    this.db.prepare(`DELETE FROM ${this.tableName} WHERE rowid = ?`).run(docId);
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
    return { ok: true, value: new FTS5Index(db, config) };
  } catch (error) {
    return { ok: false, error: error as Error };
  }
}