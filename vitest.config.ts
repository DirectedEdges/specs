import { defineConfig } from 'vitest/config';
import path from 'path';

export default defineConfig({
  define: {
    __SPECS_CLI_VERSION__: JSON.stringify('test'),
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  test: {
    environment: 'node',
    globals: true,
    include: ['packages/*/tests/**/*.test.ts'],
    typecheck: {
      include: ['packages/*/tests/**/*.test-d.ts'],
    },
    exclude: ['node_modules'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
      include: ['packages/*/src/**/*.ts'],
      exclude: ['packages/*/src/**/*.test.ts', 'packages/*/src/**/types.ts'],
    },
  },
});
