// cssvars — library-level transform emitting CSS variable definitions from
// fetched library data, so the css transform's var() references resolve
// without hand-maintained token files. Free capability (no license seam).
//
// Output: <outputDirectory>/cssvars/cssvars.css + modes.json (mirroring the
// _images/ and icon folders that fetch/generate drop at library level).
//
// Sources, all discovered in the workspace data directory:
//   *.variables.json  — variable definitions incl. subscribed (remote)
//                       collections; multi-mode collections get
//                       :root[data-<collection>="<mode>"] override blocks
//   *.file.json       — style TABLES carry no definitions (REST limitation),
//                       so text/effect/fill style values are recovered from
//                       nodes in the file document that consume each style
//   *.styles.json     — style metadata (names for published styles)
//
// Effect styles emit one var per role — <name>-shadows / -layer-blur /
// -background-blur — matching how styleToCSS applies them (none fallbacks).

import fs from 'fs-extra';
import path from 'path';
import { writeAtomic } from './writeAtomic.js';
import type { Transformer, TransformerContext } from '../Types/Transformer.js';
import { kebabizePath, reportNameWarnings } from './css/values.js';
import { loadFoundations, type FoundationsData } from '../utilities/loadFoundations.js';

type Json = Record<string, any>;

const UNITLESS = /opacity|weight|z-index|line-height-multiplier/i;

const WEIGHTS: Record<string, number> = {
  thin: 100, extralight: 200, light: 300, regular: 400, normal: 400,
  medium: 500, semibold: 600, bold: 700, extrabold: 800, black: 900,
};

export class CssvarsTransformer implements Transformer {
  readonly name = 'cssvars';

  private dataDirectory?: string;

  async run(_apiYaml: Record<string, unknown>, context: TransformerContext): Promise<void> {
    // Library-level transform: the per-component pass only captures context;
    // all output is produced once, in finalize().
    this.dataDirectory = context.dataDirectory ?? this.dataDirectory;
  }

  async finalize(outputDir: string): Promise<void> {
    const dataDir = this.dataDirectory;
    if (!dataDir || !fs.existsSync(dataDir)) {
      console.warn('  [cssvars] no data directory found — skipping (run `specs fetch` first)');
      return;
    }
    const entries = fs.readdirSync(dataDir);
    const variablePaths = entries.filter(f => f.endsWith('.variables.json')).map(f => path.join(dataDir, f));
    const stylePaths = entries.filter(f => f.endsWith('.styles.json')).map(f => path.join(dataDir, f));
    const filePaths = entries.filter(f => f.endsWith('.file.json')).map(f => path.join(dataDir, f));
    if (variablePaths.length === 0 && filePaths.length === 0) {
      console.warn(`  [cssvars] no *.variables.json or *.file.json in ${dataDir} — skipping`);
      return;
    }

    const fileJsons: Json[] = await Promise.all(filePaths.map(p => fs.readJSON(p)));
    const foundations = await loadFoundations(variablePaths, stylePaths, fileJsons[0]);
    // Seed style tables from any additional file JSONs (loadFoundations takes one).
    for (const fj of fileJsons.slice(1)) {
      for (const [styleId, s] of Object.entries<Json>(fj.styles ?? {})) {
        const type = s?.styleType || s?.type;
        if (!styleId || !type || foundations.styles.has(styleId)) continue;
        foundations.styles.set(styleId, { id: styleId, name: s?.name || styleId, type });
      }
    }

    const defs = collectStyleDefs(fileJsons);
    const varName = (name: string) => `--${kebabizePath(name)}`;

    // ── Variables (including subscribed/remote collections) ─────────────────
    const varLines: string[] = [];
    const seen = new Set<string>();
    let skippedAliases = 0;
    for (const v of foundations.variables.values()) {
      const name = varName(fullName(v, foundations));
      if (seen.has(name)) continue;
      const rendered = renderValue(v, defaultModeValue(v, foundations), foundations, varName);
      if (rendered === null) {
        skippedAliases++;
        continue;
      }
      seen.add(name);
      varLines.push(`  ${name}: ${rendered};`);
    }

    // ── Collection modes (local multi-mode collections) ──────────────────────
    // Each non-default mode gets an attribute-scoped override block the
    // consumer switches by stamping data attributes on the root element.
    const modeBlocks: string[] = [];
    const modesManifest: Json = {};
    for (const coll of foundations.collections.values()) {
      if (coll.remote) continue;
      if (!Array.isArray(coll.modes) || coll.modes.length < 2) continue;
      const attr = `data-${kebabizePath(coll.name)}`;
      const defaultMode = coll.modes.find((m: Json) => m.modeId === coll.defaultModeId);
      modesManifest[coll.name] = {
        attr,
        modes: coll.modes.map((m: Json) => m.name),
        default: defaultMode?.name ?? coll.modes[0].name,
      };
      for (const mode of coll.modes) {
        if (mode.modeId === coll.defaultModeId) continue;
        const overrides: string[] = [];
        for (const vid of coll.variableIds ?? []) {
          const v = foundations.variables.get(vid);
          if (!v || v.remote) continue;
          const value = v.valuesByMode?.[mode.modeId];
          if (value === undefined) continue;
          const rendered = renderValue(v, value, foundations, varName);
          if (rendered === null) continue;
          overrides.push(`  ${varName(fullName(v, foundations))}: ${rendered};`);
        }
        if (overrides.length) {
          modeBlocks.push(`:root[${attr}="${kebabizePath(mode.name)}"] {\n${overrides.sort().join('\n')}\n}`);
        }
      }
    }

    // ── Text styles → font shorthands ────────────────────────────────────────
    const fontLines: string[] = [];
    const missingText: string[] = [];
    const textEntries = [...foundations.styles.values()].filter(s => s.type === 'TEXT');
    const defByName = new Map<string, Json>();
    for (const s of textEntries) {
      const def = defs.text.get(s.id);
      if (def) defByName.set(s.name, def);
    }
    const emittedText = new Set<string>();
    for (const s of textEntries) {
      const name = varName(s.name);
      if (emittedText.has(name)) continue;
      let def = defs.text.get(s.id);
      if (!def) {
        // Fallback: borrow metrics from a sibling style differing only by a
        // trailing weight word, then swap the weight.
        const m = s.name.match(/^(.*?)[\s/]*(\w+)$/);
        const weightWord = m && WEIGHTS[m[2].toLowerCase()] !== undefined ? m[2].toLowerCase() : 'regular';
        const base = m && WEIGHTS[m[2].toLowerCase()] !== undefined ? m[1].replace(/[\s/]+$/, '') : s.name;
        const sibling = [...defByName.entries()].find(([n]) => n.startsWith(base) && n !== s.name);
        if (sibling) def = { ...sibling[1], fontWeight: WEIGHTS[weightWord] };
      }
      if (!def) {
        missingText.push(s.name);
        continue;
      }
      emittedText.add(name);
      const family = def.fontFamily ? `"${def.fontFamily}", sans-serif` : 'sans-serif';
      const weight = def.fontWeight ?? 400;
      const size = round2(def.fontSize ?? 16);
      const lh = def.lineHeightPx ? `/${round2(def.lineHeightPx)}px` : '';
      const italic = def.italic || /italic/i.test(def.fontPostScriptName || '') ? 'italic ' : '';
      fontLines.push(`  ${name}: ${italic}${weight} ${size}px${lh} ${family};`);
      if (def.letterSpacing) {
        fontLines.push(`  ${name}-letter-spacing: ${round2(def.letterSpacing)}px;`);
      }
    }

    // ── Effect styles → per-role vars (-shadows / -layer-blur / -background-blur)
    const effectLines: string[] = [];
    const missingEffects: string[] = [];
    const emittedEffect = new Set<string>();
    const boundVar = (bv: Json | undefined): string | null => {
      if (!bv?.id) return null;
      const target = foundations.variables.get(bv.id);
      return target ? `var(${varName(fullName(target, foundations))})` : null;
    };
    for (const s of [...foundations.styles.values()].filter(x => x.type === 'EFFECT')) {
      const name = varName(s.name);
      if (emittedEffect.has(name)) continue;
      const effects = defs.effect.get(s.id);
      if (!effects) {
        missingEffects.push(s.name);
        continue;
      }
      emittedEffect.add(name);
      const shadows = effects.filter((e: Json) => (e.type === 'DROP_SHADOW' || e.type === 'INNER_SHADOW') && e.visible !== false);
      if (shadows.length) {
        const parts = shadows.map((e: Json) => {
          const bv = e.boundVariables ?? {};
          const x = boundVar(bv.offsetX) ?? px(e.offset?.x);
          const y = boundVar(bv.offsetY) ?? px(e.offset?.y);
          const r = boundVar(bv.radius) ?? px(e.radius);
          const sp = boundVar(bv.spread) ?? px(e.spread);
          const c = boundVar(bv.color) ?? colorToCss(e.color);
          return `${e.type === 'INNER_SHADOW' ? 'inset ' : ''}${x} ${y} ${r} ${sp} ${c}`;
        });
        effectLines.push(`  ${name}-shadows: ${parts.join(', ')};`);
      }
      for (const [type, suffix] of [['LAYER_BLUR', 'layer-blur'], ['BACKGROUND_BLUR', 'background-blur']] as const) {
        const blur = effects.find((e: Json) => e.type === type && e.visible !== false);
        if (blur) {
          effectLines.push(`  ${name}-${suffix}: blur(${boundVar(blur.boundVariables?.radius) ?? px(blur.radius)});`);
        }
      }
    }

    // ── Fill styles → colors / gradient functions ────────────────────────────
    const fillLines: string[] = [];
    const emittedFill = new Set<string>();
    for (const s of [...foundations.styles.values()].filter(x => x.type === 'FILL')) {
      const name = varName(s.name);
      if (emittedFill.has(name)) continue;
      const fills = defs.fill.get(s.id);
      if (!fills) continue;
      // Topmost visible paint is what renders (Figma paints bottom→top).
      const paint = [...fills].reverse().find((p: Json) => p.visible !== false);
      if (!paint) continue;
      const value = paint.type === 'SOLID' ? colorToCss(paint.color) : gradientCss(paint, boundVar);
      if (value) {
        emittedFill.add(name);
        fillLines.push(`  ${name}: ${value};`);
      }
    }

    const css = `/* Generated by \`specs transform cssvars\`. Do not edit — regenerate with \`specs transform\`. */
:root {
${varLines.sort().join('\n')}

  /* Text styles (font shorthands recovered from file document usage) */
${fontLines.sort().join('\n')}

  /* Effect styles (role vars: -shadows / -layer-blur / -background-blur) */
${effectLines.sort().join('\n')}

  /* Fill styles (colors / gradient functions recovered from file document usage) */
${fillLines.sort().join('\n')}
}

/* ── Collection modes (switch by stamping the data attribute on :root) ── */
${modeBlocks.join('\n\n')}
`;

    const cssvarsDir = path.join(outputDir, 'cssvars');
    await fs.ensureDir(cssvarsDir);
    await writeAtomic(path.join(cssvarsDir, 'cssvars.css'), css);
    await writeAtomic(path.join(cssvarsDir, 'modes.json'), JSON.stringify(modesManifest, null, 2) + '\n');

    const missing = missingText.length + missingEffects.length;
    console.log(
      `  [cssvars] ${varLines.length} variables, ${fontLines.length} text-style lines, ${effectLines.length} effect-style lines, ` +
      `${fillLines.length} fill-style lines, ${modeBlocks.length} mode blocks` +
      (skippedAliases ? `, ${skippedAliases} unresolvable aliases skipped` : '') +
      (missing ? `, ${missing} styles without usage (no definition recoverable)` : '')
    );
    reportNameWarnings('cssvars');
  }
}

// ---------------------------------------------------------------------------
// Style definition recovery — the REST styles endpoint carries no definitions,
// so they are recovered from nodes in the file document that consume each
// style (node.styles.text/effect/fill → node.style/effects/fills).
// ---------------------------------------------------------------------------

interface StyleDefs {
  text: Map<string, Json>;
  effect: Map<string, Json[]>;
  fill: Map<string, Json[]>;
}

function collectStyleDefs(fileJsons: Json[]): StyleDefs {
  const defs: StyleDefs = { text: new Map(), effect: new Map(), fill: new Map() };
  const walk = (node: Json | undefined): void => {
    if (!node) return;
    const styles = node.styles ?? {};
    if (styles.text && node.style && !defs.text.has(styles.text)) defs.text.set(styles.text, node.style);
    if (styles.effect && Array.isArray(node.effects) && node.effects.length && !defs.effect.has(styles.effect)) {
      defs.effect.set(styles.effect, node.effects);
    }
    if (styles.fill && Array.isArray(node.fills) && node.fills.length && !defs.fill.has(styles.fill)) {
      defs.fill.set(styles.fill, node.fills);
    }
    (node.children ?? []).forEach(walk);
  };
  for (const fj of fileJsons) walk(fj.document);
  return defs;
}

// ---------------------------------------------------------------------------
// Value rendering
// ---------------------------------------------------------------------------

/** Spec token paths are "<collection name>/<variable name>" — mirror that. */
function fullName(v: Json, foundations: FoundationsData): string {
  const coll = foundations.collections.get(v.variableCollectionId);
  return coll ? `${coll.name}/${v.name}` : v.name;
}

function defaultModeValue(v: Json, foundations: FoundationsData): unknown {
  const coll = foundations.collections.get(v.variableCollectionId);
  const modeId = coll?.defaultModeId ?? Object.keys(v.valuesByMode ?? {})[0];
  return v.valuesByMode?.[modeId] ?? Object.values(v.valuesByMode ?? {})[0];
}

function renderValue(
  v: Json,
  value: unknown,
  foundations: FoundationsData,
  varName: (name: string) => string,
): string | null {
  if (value && typeof value === 'object' && (value as Json).type === 'VARIABLE_ALIAS') {
    const target = foundations.variables.get((value as Json).id);
    if (target) return `var(${varName(fullName(target, foundations))})`;
    return null; // alias to a variable outside this workspace's payload
  }
  switch (v.resolvedType) {
    case 'COLOR':
      return colorToCss(value as Json);
    case 'FLOAT':
      if (UNITLESS.test(v.name) || (v.scopes ?? []).includes('OPACITY') || (v.scopes ?? []).includes('FONT_WEIGHT')) {
        return String(value);
      }
      return `${value}px`;
    default:
      return String(value);
  }
}

function colorToCss(c: Json | undefined): string {
  if (!c) return 'transparent';
  const r = Math.round(c.r * 255);
  const g = Math.round(c.g * 255);
  const b = Math.round(c.b * 255);
  const a = c.a === undefined ? 1 : c.a;
  if (a >= 1) {
    const hex = (n: number) => n.toString(16).padStart(2, '0');
    return `#${hex(r)}${hex(g)}${hex(b)}`;
  }
  return `rgba(${r}, ${g}, ${b}, ${Number(a.toFixed(4))})`;
}

const round2 = (n: number): number => Math.round(n * 100) / 100;
const px = (n: number | undefined): string => (n ? `${round2(n)}px` : '0');
const pct = (n: number): string => `${round2(n * 100)}%`;

/**
 * REST gradient paint → CSS gradient function. Angle from handles in Y-down
 * screen space: θ = atan2(dx, −dy). Angular sweeps start at Figma's 3 o'clock
 * (CSS `from 90deg`); rotation is an accepted limitation (no schema support).
 */
function gradientCss(p: Json, boundVar: (bv: Json | undefined) => string | null): string | null {
  const h = p.gradientHandlePositions;
  if (!h || !Array.isArray(p.gradientStops) || p.gradientStops.length < 2) return null;
  const stops = p.gradientStops
    .map((s: Json) => `${boundVar(s.boundVariables?.color) ?? colorToCss(s.color)} ${pct(s.position)}`)
    .join(', ');
  if (p.type === 'GRADIENT_LINEAR') {
    const raw = Math.atan2(h[1].x - h[0].x, -(h[1].y - h[0].y)) * 180 / Math.PI;
    const angle = round2(((raw % 360) + 360) % 360);
    return `linear-gradient(${angle}deg, ${stops})`;
  }
  const at = `at ${pct(h[0].x)} ${pct(h[0].y)}`;
  if (p.type === 'GRADIENT_RADIAL') return `radial-gradient(${at}, ${stops})`;
  if (p.type === 'GRADIENT_ANGULAR') return `conic-gradient(from 90deg ${at}, ${stops})`;
  return null;
}
