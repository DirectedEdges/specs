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

/** Clip to a word boundary so summaries stay scannable in the index. */
function truncate(text, limit = 160) {
  if (text.length <= limit) return text;
  const clipped = text.slice(0, limit);
  const lastSpace = clipped.lastIndexOf(' ');
  return `${clipped.slice(0, lastSpace > 0 ? lastSpace : limit).replace(/[.,;:—-]$/, '')}…`;
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
 * Markdown inside a raw HTML block is passed through untouched, so titles
 * carrying `code spans` need them rendered here.
 */
function escapeTitle(title) {
  return escapeHtml(title).replace(/`([^`]+)`/g, '<code>$1</code>');
}

/**
 * First sentence of the Context section, flattened to plain text, for use as
 * the page description and the index summary.
 */
function extractSummary(md) {
  const after = md.split(/^##\s+Context\s*$/m)[1];
  if (!after) return null;
  const section = after.split(/^##\s+/m)[0];

  // Fenced blocks and tables read as prose once flattened — drop them first.
  const prose = section
    .replace(/^```[\s\S]*?^```/gm, '')
    .replace(/^\|.*$/gm, '');

  let leadIn = null;

  for (const raw of prose.split('\n\n')) {
    const para = raw.trim();
    if (!para || para.startsWith('#') || para.startsWith('-') || para.startsWith('>')) continue;

    const flat = para
      .replace(/\s+/g, ' ')
      .replace(/`([^`]*)`/g, '$1')
      .replace(/\*\*([^*]*)\*\*/g, '$1')
      .replace(/\[([^\]]*)\]\([^)]*\)/g, '$1')
      .trim();

    // A paragraph ending in a colon introduces a list or block — its sentence
    // is only half the thought, so keep looking.
    if (flat.endsWith(':')) {
      leadIn ??= flat;
      continue;
    }

    const sentence = flat.match(/^.*?\.(?=\s|$)/)?.[0];
    if (!sentence || sentence.length < 30) continue;
    return truncate(sentence);
  }

  // Some Contexts are only a lead-in followed by a list or code block.
  return leadIn ? truncate(leadIn.replace(/:$/, '.')) : null;
}

/** Drop the H1 — Starlight renders the title from frontmatter. */
function stripTitle(md) {
  return md.replace(/^#\s+.+$/m, '').replace(/^\n+/, '');
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
  adrs.push({ number, slug, title, summary: extractSummary(md), body: stripTitle(md) });
}

rmSync(outDir, { recursive: true, force: true });
mkdirSync(outDir, { recursive: true });

for (const adr of adrs) {
  const frontmatter = [
    '---',
    `title: ${yaml(adr.title)}`,
    adr.summary ? `description: ${yaml(adr.summary)}` : null,
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
      ? `\n<p class="adr-summary">${escapeHtml(a.summary)}</p>`
      : '';
    return `<tr>
<td class="adr-number">${a.number}</td>
<td class="adr-entry"><a href="/adr/${a.slug}/">${escapeTitle(a.title)}</a>${summary}</td>
</tr>`;
  })
  .join('\n');

const index = `---
title: "Decision Records (ADRs)"
description: "Accepted architecture decisions shaping the Specs schema, CLI, and plugin."
tableOfContents: false
---

Specs is defined by its schema — the shape of the component data that the Figma plugin and the CLI both produce. Every field in that schema exists because of a decision: what a design system needs to express, how Figma exposes it, and which of several possible designs best survives contact with real component libraries. An **Architecture Decision Record** captures one such decision in full. It states the problem, lays out the options considered, records which one was chosen, and explains the reasoning — including the designs that were rejected and why.

These records are the reasoning behind the reference documentation. Where the [Schema](/schema/) and [Settings](/settings/) sections tell you what a field is and how to use it, an ADR tells you why it looks the way it does. Read them when you want the history behind a design, when a field's shape seems surprising, or when you are weighing a change and want to know what ground has already been covered. Only accepted decisions appear here, newest first; each one remains as written when it was accepted, so later records may supersede earlier ones.

<table class="adr-index">
<tbody>
${rows}
</tbody>
</table>
`;

writeFileSync(resolve(outDir, 'index.md'), index);
console.log(`✓ Built ${adrs.length} ADR pages + index in site/src/content/docs/adr/`);
