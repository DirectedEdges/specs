import fs from 'fs-extra';

/**
 * Write a generated file atomically: write to a temp sibling, then rename.
 * Rename is atomic on POSIX, so file watchers (Storybook's story indexer,
 * Vite HMR) only ever observe complete files — plain writeFile lets a watcher
 * read a half-written module and cache the parse failure, breaking the story
 * index until the dev server restarts.
 *
 * Additionally skips the write entirely when content is unchanged, so
 * re-running `specs transform` doesn't trigger watcher churn for untouched
 * components.
 */
export async function writeAtomic(filePath: string, content: string): Promise<void> {
  try {
    const existing = await fs.readFile(filePath, 'utf-8');
    if (existing === content) return;
  } catch {
    // absent or unreadable — proceed to write
  }
  const tmpPath = `${filePath}.tmp-${process.pid}`;
  try {
    await fs.writeFile(tmpPath, content, 'utf-8');
    await fs.rename(tmpPath, filePath);
  } catch (err) {
    await fs.remove(tmpPath).catch(() => {});
    throw err;
  }
}
