import { defineConfig } from 'vitest/config';
import { resolve } from 'path';

export default defineConfig({
  test: {
    environment: 'node',
    include: ['src/**/*.test.ts'],
    passWithNoTests: true,
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
      exclude: ['node_modules/', 'dist/', '**/*.test.ts', '**/*.d.ts']
    },
    alias: {
      '@nullroot/shared': resolve(__dirname, '../../packages/shared/src'),
      '@nullroot/core': resolve(__dirname, '../../packages/core/src'),
      '@nullroot/knowledge': resolve(__dirname, '../../packages/knowledge/src'),
      '@nullroot/retrieval': resolve(__dirname, '../../packages/retrieval/src'),
      '@nullroot/compatibility': resolve(__dirname, '../../packages/compatibility/src'),
      '@nullroot/analyzers': resolve(__dirname, '../../packages/analyzers/src'),
      '@nullroot/integrations': resolve(__dirname, '../../packages/integrations/src'),
      '@nullroot/config': resolve(__dirname, '../../packages/config/src'),
    },
  },
});