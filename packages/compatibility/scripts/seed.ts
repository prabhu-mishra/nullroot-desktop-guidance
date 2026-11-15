#!/usr/bin/env node
/**
 * Seed script for compatibility database
 * Loads seed data from seed-data.json into the SQLite database
 */

import { readFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { createCompatibilityDatabase } from '../src/database.js';
import type { CompatibilityEntry } from '../src/models.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const PROJECT_ROOT = join(__dirname, '..', '..', '..');

async function main() {
  const dbPath = process.argv[2] || join(PROJECT_ROOT, 'data', 'compatibility.db');
  const seedPath = process.argv[3] || join(__dirname, '..', 'seed-data.json');

  console.log(`Loading seed data from: ${seedPath}`);
  console.log(`Database path: ${dbPath}`);

  // Read seed data
  const seedData = JSON.parse(readFileSync(seedPath, 'utf-8')) as CompatibilityEntry[];
  console.log(`Found ${seedData.length} seed entries`);

  // Create database
  const db = createCompatibilityDatabase(dbPath);

  // Insert entries
  let inserted = 0;
  let failed = 0;
  const errors: string[] = [];

  for (const entry of seedData) {
    const result = db.insert(entry);
    if (result.ok) {
      inserted++;
    } else {
      failed++;
      errors.push(`${entry.id}: ${result.error.message}`);
    }
  }

  console.log(`Inserted: ${inserted}, Failed: ${failed}`);

  if (failed > 0) {
    console.error('Errors:');
    for (const err of errors) {
      console.error(`  - ${err}`);
    }
    process.exit(1);
  }

  // Verify
  const allEntries = db.query({});
  console.log(`Total entries in database: ${allEntries.length}`);

  db.close();
  console.log('Seed complete!');
}

main().catch((error) => {
  console.error('Seed script failed:', error);
  process.exit(1);
});