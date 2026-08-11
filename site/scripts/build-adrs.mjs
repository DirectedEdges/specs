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

function truncate(text) {
  return text.length > 300 ? `${text.slice(0, 297)}…` : text;
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
    'sidebar:',
    `  label: ${yaml(`${adr.number} — ${adr.title}`)}`,
    `  order: ${Number(adr.number)}`,
    '---',
  ]
    .filter(Boolean)
    .join('\n');

  writeFileSync(resolve(outDir, `${adr.slug}.md`), `${frontmatter}\n\n${adr.body}`);
}

const rows = [...adrs]
  .reverse()
  .map(a => `| [${a.number}](/adr/${a.slug}/) | [${a.title}](/adr/${a.slug}/) | ${(a.summary ?? '').replace(/\|/g, '\\|')} |`)
  .join('\n');

const index = `---
title: "Architecture Decision Records"
description: "Accepted decisions shaping the Specs schema, CLI, and plugin."
tableOfContents: false
sidebar:
  label: "Overview"
  order: 0
---

Each record captures one decision about the Specs schema and tooling — the context that forced it, the options weighed, and what was chosen. Only accepted decisions are published here; the newest appear first.

| # | Title | Summary |
|---|-------|---------|
${rows}
`;

writeFileSync(resolve(outDir, 'index.md'), index);
console.log(`✓ Built ${adrs.length} ADR pages + index in site/src/content/docs/adr/`);
