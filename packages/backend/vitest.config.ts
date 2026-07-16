import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    environment: 'node',
    include: ['src/**/*.test.ts'],
    env: {
      DEMO_MODE: 'true',
      DB_PATH: './data/test-worlds.db',
    },
    coverage: {
      provider: 'v8',
      reporter: ['text', 'lcov'],
      include: ['src/services/**/*.ts', 'src/middleware/**/*.ts'],
      exclude: ['src/**/*.test.ts'],
    },
  },
});
