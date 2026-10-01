// Template access. Templates are inert text files the CLI never imports —
// init and publish read them from disk and write parameterized copies into
// the customer's workspace (ADR A).
import fs from 'fs-extra';
import path from 'path';
import { fileURLToPath } from 'url';

/**
 * Where the template files live. The published package carries them at
 * dist/storybook-templates/ (the build copies them beside the bundle);
 * running from a repo checkout finds them in src/.
 */
export function templatesDir(): string {
  const here = path.dirname(fileURLToPath(import.meta.url));
  const candidates = [
    path.join(here, 'storybook-templates'),
    path.join(here, '..', 'storybook-templates'),
    path.join(here, '..', 'src', 'storybook', 'templates'),
    path.join(here, 'templates'),
  ];
  for (const dir of candidates) {
    if (fs.existsSync(dir)) return dir;
  }
  throw new Error(`storybook templates not found — looked in:\n  ${candidates.join('\n  ')}`);
}

export function readTemplate(relPath: string): string {
  return fs.readFileSync(path.join(templatesDir(), relPath), 'utf-8');
}

/** Replace every `{{KEY}}` with its value. Unknown placeholders are an error. */
export function renderTemplate(template: string, vars: Record<string, string>): string {
  const rendered = template.replace(/\{\{([A-Z_]+)\}\}/g, (_, key: string) => {
    if (!(key in vars)) throw new Error(`template placeholder {{${key}}} has no value`);
    return vars[key];
  });
  return rendered;
}
