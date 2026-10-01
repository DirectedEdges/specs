// The foundations concern: Color, Typography, Icons — data artifacts plus the
// default pages that read them (specs#608/#609/#632). All reading and joining
// happens here at publish time; the pages are dumb views of the JSON beside them.
import fs from 'fs-extra';
import path from 'path';
import type { Concern, BuiltFile } from '../types.js';
import type { Workspace } from '../../workspace.js';
import { sourcePayloads } from '../../workspace.js';
import { readTemplate } from '../../templates.js';
import { buildColorData, type ColorSourceInput } from './color.js';
import { buildTypographyData, type TypographySourceInput } from './typography.js';
import { buildIconsData } from './icons.js';

interface FileSample {
  styleMap: Record<string, { name: string; key: string; styleType: string; description?: string; remote?: boolean }>;
  /** style id → sampled node.style (text styles). */
  text: Record<string, Record<string, unknown>>;
  /** style id → sampled node.fills (fill styles). */
  fills: Record<string, unknown[]>;
}

/**
 * One pass over a source's page payloads, sampling a usage per style id.
 * Every node bound to a style reports the same resolved properties, so the
 * first sample is the join.
 */
function sampleFile(dir: string): FileSample {
  const root = JSON.parse(fs.readFileSync(path.join(dir, 'root.json'), 'utf-8')) as Record<string, unknown>;
  const styleMap = (root.styles ?? {}) as FileSample['styleMap'];
  const text: FileSample['text'] = {};
  const fills: FileSample['fills'] = {};

  const pages = fs.readdirSync(dir).filter((f) => f.startsWith('page-') && f.endsWith('.json')).sort();
  for (const page of pages) {
    const stack: unknown[] = [JSON.parse(fs.readFileSync(path.join(dir, page), 'utf-8'))];
    while (stack.length) {
      const node = stack.pop();
      if (Array.isArray(node)) {
        for (const item of node) if (item && typeof item === 'object') stack.push(item);
        continue;
      }
      if (!node || typeof node !== 'object') continue;
      const record = node as Record<string, unknown>;
      const styles = record.styles as Record<string, string> | undefined;
      if (styles) {
        const textStyle = styles.text;
        if (textStyle && record.style && !text[textStyle]) text[textStyle] = record.style as Record<string, unknown>;
        const fillStyle = styles.fill ?? styles.fills;
        if (fillStyle && Array.isArray(record.fills) && !fills[fillStyle]) fills[fillStyle] = record.fills as unknown[];
      }
      for (const value of Object.values(record)) {
        if (value && typeof value === 'object') stack.push(value);
      }
    }
  }
  return { styleMap, text, fills };
}

export const foundations: Concern = {
  name: 'foundations',

  detect(ws: Workspace): boolean {
    const payloads = sourcePayloads(ws);
    return (
      payloads.variables.length > 0 ||
      payloads.fileDirs.length > 0 ||
      fs.existsSync(path.join(ws.assetsDir, 'icons')) ||
      fs.existsSync(ws.specsDir)
    );
  },

  async build(ws: Workspace): Promise<BuiltFile[]> {
    const out: BuiltFile[] = [];
    const payloads = sourcePayloads(ws);

    // One sampling pass per source file dir, shared by colour styles and typography.
    const samples = new Map<string, FileSample>();
    for (const { alias, dir } of payloads.fileDirs) samples.set(alias, sampleFile(dir));

    // Colour: variables payloads plus each source's FILL styles.
    const colorSources: ColorSourceInput[] = [];
    for (const source of ws.sources) {
      const variablesEntry = payloads.variables.find((v) => v.alias === source.alias);
      const stylesEntry = payloads.styles.find((s) => s.alias === source.alias);
      const sample = samples.get(source.alias);
      let fillStyles: ColorSourceInput['fillStyles'] = [];
      if (stylesEntry) {
        const parsed = JSON.parse(fs.readFileSync(stylesEntry.file, 'utf-8')) as {
          meta?: { styles?: Array<{ node_id: string; name: string; style_type: string; description?: string }> };
        };
        fillStyles = (parsed.meta?.styles ?? []).filter((s) => s.style_type === 'FILL');
      }
      if (!variablesEntry && fillStyles.length === 0) continue;
      colorSources.push({
        alias: source.alias,
        variablesPayload: variablesEntry ? JSON.parse(fs.readFileSync(variablesEntry.file, 'utf-8')) : null,
        fillStyles,
        sampledFills: sample?.fills ?? {},
      });
    }
    const colors = buildColorData(colorSources);
    if (colors) {
      out.push({ path: 'data/colors.json', content: JSON.stringify(colors, null, 2) + '\n' });
      out.push({ path: 'Color.stories.tsx', content: readTemplate('pages/Color.stories.tsx.tpl') });
    }

    // Typography: style map × sampled type properties, per source.
    const typographySources: TypographySourceInput[] = payloads.fileDirs.map(({ alias }) => ({
      alias,
      styleMap: samples.get(alias)?.styleMap ?? {},
      sampledText: samples.get(alias)?.text ?? {},
    }));
    const typography = buildTypographyData(typographySources);
    if (typography) {
      out.push({ path: 'data/typography.json', content: JSON.stringify(typography, null, 2) + '\n' });
      out.push({ path: 'Typography.stories.tsx', content: readTemplate('pages/Typography.stories.tsx.tpl') });
    }

    // Icons: fetched glyphs against spec references.
    const icons = buildIconsData(ws.specsDir, path.join(ws.assetsDir, 'icons'));
    if (icons) {
      out.push({ path: 'data/icons.json', content: JSON.stringify(icons, null, 2) + '\n' });
      out.push({ path: 'Icons.stories.tsx', content: readTemplate('pages/Icons.stories.tsx.tpl') });
    }

    return out;
  },
};
