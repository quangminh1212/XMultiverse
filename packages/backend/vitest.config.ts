import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    environment: 'node',
    include: ['src/**/*.test.ts'],
    // Smoke E2E boots a real HTTP server — allow longer
    testTimeout: 30_000,
    hookTimeout: 30_000,
    env: {
      DEMO_MODE: 'true',
      DB_PATH: './data/test-worlds.db',
    },
    coverage: {
      provider: 'v8',
      reporter: ['text', 'lcov'],
      include: ['src/services/**/*.ts', 'src/middleware/**/*.ts', 'src/config/**/*.ts'],
      exclude: ['src/**/*.test.ts'],
    },
    // Run smoke file after unit tests when sequential; default is fine
    fileParallelism: false,
  },
});
