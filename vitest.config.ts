import { defineConfig } from 'vitest/config';
import path from 'path';
import fs from 'fs';

/**
 * Skill sources are markdown imported as strings. The CLI build does this with
 * esbuild's `--loader:.md=text`; vite has no equivalent default, so a test importing
 * `src/skills/index.ts` fails parsing the markdown as JS. This mirrors the build's
 * loader so the two agree — a skill is text in both.
 */
const markdownAsText = {
  name: 'markdown-as-text',
  transform(_code: string, id: string) {
    if (!id.endsWith('.md')) return null;
    return { code: `export default ${JSON.stringify(fs.readFileSync(id, 'utf8'))};`, map: null };
  },
};

export default defineConfig({
  plugins: [markdownAsText],
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
