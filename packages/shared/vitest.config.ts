import { defineConfig } from 'vitest/config';
import { resolve } from 'path';

export default defineConfig({
  test: {
    environment: 'node',
    include: ['src/**/*.test.ts'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
      exclude: ['node_modules/', 'dist/', '**/*.test.ts', '**/*.d.ts']
    },
    alias: {
      '@nullroot/shared': resolve(__dirname, 'src'),
      '@nullroot/core': resolve(__dirname, '../core/src'),
      '@nullroot/knowledge': resolve(__dirname, '../knowledge/src'),
      '@nullroot/retrieval': resolve(__dirname, '../retrieval/src'),
      '@nullroot/compatibility': resolve(__dirname, '../compatibility/src'),
      '@nullroot/analyzers': resolve(__dirname, '../analyzers/src'),
      '@nullroot/integrations': resolve(__dirname, '../integrations/src'),
      '@nullroot/config': resolve(__dirname, '../config/src'),
    },
  },
});