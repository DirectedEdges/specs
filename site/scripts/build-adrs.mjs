/**
 * Reads ACCEPTED ADRs from adr/ and emits one Starlight page each into
 * site/src/content/docs/adr/, plus an index page.  Run before `astro dev`
 * or `astro build`.
 *
 * Usage:  node scripts/build-adrs.mjs
 */

import { readdirSync, readFileSync, writeFileSync, mkdirSync, rmSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = resolve(__dirname, '..');
const repo = resolve(root, '..');

const srcDir = resolve(repo, 'adr');
const outDir = resolve(root, 'src/content/docs/adr');

/** Quote a string for a YAML double-quoted scalar. */
function yaml(text) {
  return `"${text.replace(/\\/g, '\\\\').replace(/"/g, '\\"')}"`;
}

/** `# ADR: Foo Bar` or `# ADR 058: Foo Bar` → `Foo Bar` */
function extractTitle(md) {
  const m = md.match(/^#\s+(?:ADR[\s-]*\d*\s*:\s*)?(.+)$/m);
  return m ? m[1].trim() : null;
}

/** `**Status**: ACCEPTED — because` → `ACCEPTED` */
function extractStatus(md) {
  const m = md.match(/^\*\*Status\*\*:\s*(\S+)/m);
  return m ? m[1].replace(/[^A-Z]/gi, '').toUpperCase() : null;
}

/** Escape text destined for raw HTML in the generated index. */
function escapeHtml(text) {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

/**
 * Markdown inside a raw HTML block is passed through untouched, so text
 * carrying `code spans` needs them rendered here.
 */
function renderInline(text) {
  return escapeHtml(text)
    .replace(/`([^`]+)`/g, '<code>$1</code>')
    .replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2">$1</a>')
    .replace(/\*([^*]+)\*/g, '<em>$1</em>');
}

/**
 * The `**Summary**:` line from the metadata block, authored at implementation
 * time. There is deliberately no fallback — an unwritten summary shows up as a
 * blank index row rather than as plausible-looking prose lifted from Context.
 */
function extractSummary(md) {
  const m = md.match(/^\*\*Summary\*\*:\s*(.+)$/m);
  if (!m) return null;
  const text = m[1].trim();
  return /^\*\(.*\)\*$/.test(text) ? null : text;
}

/** Drop the H1 — Starlight renders the title from frontmatter. */
function stripTitle(md) {
  return md.replace(/^#\s+.+$/m, '').replace(/^\n+/, '');
}

/**
 * The `**Key**: value` lines opening every ADR are consecutive, so markdown
 * joins them into one run-on paragraph. Render them as a label/value grid
 * instead, and drop the horizontal rule that followed the block.
 */
function formatMetadata(md) {
  return md.replace(
    /^((?:\*\*[A-Za-z]+\*\*:.*\n)+)(\n---\n)?/,
    (match, block) => {
      const rows = [...block.matchAll(/^\*\*([A-Za-z]+)\*\*:\s*(.*)$/gm)].map(
        ([, key, value]) =>
          `<div class="adr-meta-row"><dt>${key}</dt><dd>${renderInline(value.trim())}</dd></div>`,
      );
      return rows.length ? `<dl class="adr-meta">\n${rows.join('\n')}\n</dl>\n` : match;
    },
  );
}

const files = readdirSync(srcDir)
  .filter(f => /^\d{3}-.+\.md$/.test(f))
  .sort();

const adrs = [];

for (const file of files) {
  const md = readFileSync(resolve(srcDir, file), 'utf-8');
  if (extractStatus(md) !== 'ACCEPTED') continue;

  const number = file.slice(0, 3);
  const slug = file.replace(/\.md$/, '');
  const title = extractTitle(md);
  if (!title) {
    console.warn(`⚠ ${file}: no H1 title, skipped`);
    continue;
  }
  const summary = extractSummary(md);
  if (!summary) console.warn(`⚠ ${file}: no **Summary** in the metadata block`);
  adrs.push({ number, slug, title, summary, body: formatMetadata(stripTitle(md)) });
}

rmSync(outDir, { recursive: true, force: true });
mkdirSync(outDir, { recursive: true });

for (const adr of adrs) {
  const frontmatter = [
    '---',
    `title: ${yaml(adr.title)}`,
    adr.summary ? `description: ${yaml(adr.summary.replace(/`/g, ''))}` : null,
    '---',
  ]
    .filter(Boolean)
    .join('\n');

  writeFileSync(resolve(outDir, `${adr.slug}.md`), `${frontmatter}\n\n${adr.body}`);
}

const rows = [...adrs]
  .reverse()
  .map(a => {
    const summary = a.summary
      ? `\n<p class="adr-summary">${renderInline(a.summary)}</p>`
      : '';
    return `<tr>
<td class="adr-number">${a.number}</td>
<td class="adr-entry"><a href="/adr/${a.slug}/">${renderInline(a.title)}</a>${summary}</td>
</tr>`;
  })
  .join('\n');

const index = `---
title: "Decision Records (ADRs)"
description: "Accepted architecture decisions shaping the Specs schema, CLI, and plugin."
tableOfContents: false
---

Every field in the Specs schema exists because of a decision about what a design system needs to express and how Figma exposes it. An **Architecture Decision Record** captures one such decision: the problem, the options weighed, the choice made, and the designs rejected along the way.

Where [Schema](/schema/) and [Settings](/settings/) tell you what a field is, an ADR tells you why it looks that way — read one when a field's shape surprises you, or when you're weighing a change. Only accepted decisions appear here, newest first, each left as written, so later records may supersede earlier ones.

<table class="adr-index">
<tbody>
${rows}
</tbody>
</table>
`;

writeFileSync(resolve(outDir, 'index.md'), index);
console.log(`✓ Built ${adrs.length} ADR pages + index in site/src/content/docs/adr/`);
