// `specs testing visual diff [--against figma|accepted]` — score pass/fail
// per pair and write the merged report (JSON + ranked markdown). The only
// stage that reads visual-ignore.yaml, so a tolerance edit re-scores in
// seconds with no browser.
//
// Compositions are advisory: captured, diffed, reported with pixel counts,
// but their pass/fail never decides the exit status. A composition's diff is
// dominated by its children — one leaf defect lights up every composition
// containing it — and the depth-ascending ranking already says fix leaves
// first; the exit code agrees with it.
import fs from 'fs-extra';
import path from 'path';
import YAML from 'yaml';
import { resolveSpecsLayout } from '../../utilities/specsLayout.js';
import type { VisualWorkspace } from './paths.js';
import { readJson, writeJson, sanitizeNodeId } from './paths.js';
import { loadPngjs, loadPixelmatch } from './deps.js';
import { createPngKit, type PngKit } from './png.js';
import { loadIgnore, scoringFor, SCORING_DEFAULTS } from './ignore.js';
import {
  manifestEntries,
  type DiffMode,
  type Manifest,
  type ManifestVariant,
  type SpecKind,
} from './types.js';

interface Ranking {
  depthOf(key: string): number;
  leaves: Set<string>;
  cycles: unknown[];
}

function loadRanking(vw: VisualWorkspace): Ranking | null {
  // ADR-096 puts analysis at specs/analysis/; the pre-ADR harness wrote
  // specs/_analysis/. Read whichever exists.
  const layout = resolveSpecsLayout(vw.ws.specsDir);
  const candidates = [layout.analysisDir(), path.join(vw.ws.specsDir, '_analysis')];
  const analysisDir = candidates.find((d) => fs.existsSync(d));
  if (!analysisDir) return null;

  const read = (base: string): any => {
    const file = ['yaml', 'json']
      .map((ext) => path.join(analysisDir, `${base}.${ext}`))
      .find((p) => fs.existsSync(p));
    if (!file) return null;
    return file.endsWith('.json')
      ? readJson(file)
      : YAML.parse(fs.readFileSync(file, 'utf8'));
  };

  const graph = read('dependencies.graph');
  if (!graph) return null;
  const byComponent = read('dependencies.byComponent') ?? {};

  const leaves = new Set<string>(graph?.summary?.leaves ?? []);
  const depthOf = (key: string): number => {
    if (leaves.has(key)) return 0;
    const deps = byComponent?.[key]?.transitiveDependencies ?? {};
    const depths = Object.values(deps) as number[];
    if (depths.length) return Math.max(...depths);
    return (byComponent?.[key]?.directDependencies?.length ?? 0) > 0 ? 1 : 0;
  };
  return { depthOf, leaves, cycles: graph?.summary?.cycles ?? [] };
}

/**
 * The crop that brings a Figma export back to its node's box, when the two
 * differ. Only meaningful against the figma baseline — accepted renders were
 * already cropped to the element box when they were shot.
 */
function nodeOverflow(
  variant: ManifestVariant,
  scale: number,
  figma: { width: number; height: number },
): { rect: [number, number, number, number]; by: [number, number] } | undefined {
  if (!variant.ink || !variant.size) return undefined;
  const [dx, dy, w, h] = variant.ink;
  // Figma rounds the exported pixel size up from fractional render bounds —
  // match with a pixel of slack or the very cases this exists for fail to be
  // recognised.
  if (Math.abs(figma.width - w * scale) > 1.5 || Math.abs(figma.height - h * scale) > 1.5) {
    return undefined;
  }
  return {
    rect: [dx * scale, dy * scale, variant.size[0] * scale, variant.size[1] * scale],
    by: [w - variant.size[0], h - variant.size[1]],
  };
}

export async function runDiff(
  vw: VisualWorkspace,
  opts: { components?: string[]; against?: DiffMode },
): Promise<any> {
  const manifest = readJson<Manifest>(vw.manifestPath);
  const ignore = loadIgnore(vw.ignorePath);
  const ranking = loadRanking(vw);
  const only = opts.components?.length ? new Set(opts.components) : null;
  const mode: DiffMode = opts.against ?? 'figma';
  const baselineTree = mode === 'accepted' ? 'accepted' : 'figma';

  if (mode === 'accepted' && !fs.existsSync(path.join(vw.root, 'accepted'))) {
    console.error(
      '✗ No accepted renders yet — regression mode diffs against renders you promoted.\n' +
        '  Shoot first, review, then `specs testing visual accept --all` (or --components …).',
    );
    process.exitCode = 1;
    return null;
  }

  // Every ignore entry suppresses real signal; the note is what separates a
  // permanent measurement fact from a temporary allowance. Warn, don't block.
  for (const entry of ignore.noteless) {
    console.warn(`! visual-ignore entry "${entry}" has no note: — say why, or it reads as a hidden bug`);
  }

  const { PNG } = await loadPngjs(vw);
  const pixelmatch = await loadPixelmatch(vw);
  const kit = createPngKit(PNG);

  const scale = manifest.$meta?.scale ?? 2;
  const reportPath = path.join(vw.reportDir, 'visual-report.json');
  const previousReport: any = fs.existsSync(reportPath) ? readJson(reportPath) : null;

  // Carry prior results forward for scoped runs, but only for specs the
  // manifest still knows — pruned spec dirs must not linger as stale rows —
  // and only within one mode: a figma-mode row carried into an accepted-mode
  // report would mix two different questions in one total and fail the run
  // on numbers this diff never produced.
  const sections: Record<'components' | 'compositions', Record<string, any>> = {
    components: {},
    compositions: {},
  };
  if ((previousReport?.mode ?? 'figma') === mode) {
    for (const section of ['components', 'compositions'] as const) {
      for (const [k, v] of Object.entries(previousReport?.[section] ?? {})) {
        if (k in (manifest[section] ?? {})) sections[section][k] = v;
      }
    }
  }

  for (const [kind, key, entry] of manifestEntries(manifest, only)) {
    const section = kind === 'composition' ? 'compositions' : 'components';
    const renderDir = vw.dirFor('render', kind, key);
    const baselineDir = vw.dirFor(baselineTree, kind, key);
    const diffDir = vw.dirFor('diff', kind, key);

    const shotsPath = path.join(renderDir, '.shots.json');
    const shotIndex = new Map<string, any>(
      (fs.existsSync(shotsPath) ? readJson<any>(shotsPath).shots : []).map((s: any) => [s.nodeId, s]),
    );

    const pairs: any[] = [];
    for (const variant of entry.children) {
      const scoring = scoringFor(ignore, kind, key, variant.config);
      const shot = shotIndex.get(variant.nodeId);
      const base = {
        nodeId: variant.nodeId,
        config: variant.config,
        storyId: shot?.storyId ?? null,
        url: shot?.url ?? null,
      };

      if (variant.status !== 'shootable') {
        pairs.push({ ...base, status: variant.status, pass: null });
        continue;
      }
      if (scoring.skip) {
        pairs.push({ ...base, status: 'skipped-ignored', pass: null, note: scoring.note });
        continue;
      }
      if (!shot || shot.status === 'no-story') {
        pairs.push({ ...base, status: 'no-story', pass: false });
        continue;
      }
      if (shot.status === 'shoot-failed') {
        pairs.push({ ...base, status: 'shoot-failed', pass: false, error: shot.error });
        continue;
      }
      // A variant the harness cannot pose is a coverage gap, not a failure.
      if (String(shot.status).startsWith('deferred')) {
        pairs.push({ ...base, status: shot.status, pass: null, note: shot.note });
        continue;
      }

      const nodeFile = `${sanitizeNodeId(variant.nodeId)}.png`;
      const baselinePath = path.join(baselineDir, nodeFile);
      const renderPath = path.join(renderDir, nodeFile);
      if (!fs.existsSync(baselinePath)) {
        pairs.push({ ...base, status: 'no-baseline', pass: null });
        continue;
      }
      if (!fs.existsSync(renderPath)) {
        pairs.push({ ...base, status: 'shoot-failed', pass: false });
        continue;
      }

      let baseline = kit.readPng(baselinePath);
      const render = kit.readPng(renderPath);
      // Figma exports a node at its render bounds, so a node whose content
      // escapes its frame comes back larger than the component. Crop it to
      // the node's own box — against accepted renders both sides are element
      // crops already and no correction applies.
      const overflow = mode === 'figma' ? nodeOverflow(variant, scale, baseline) : undefined;
      if (overflow) baseline = kit.crop(baseline, overflow.rect);
      const dims = {
        baseline: [baseline.width, baseline.height],
        render: [render.width, render.height],
        dw: render.width - baseline.width,
        dh: render.height - baseline.height,
      };
      const backdrop =
        mode === 'figma'
          ? kit.detectBackdrop(baseline, render, [255, 255, 255])
          : ([255, 255, 255] as [number, number, number]);
      const { a, b, width, height } = kit.padToUnion(baseline, render, backdrop);
      const diffPng = kit.makePng(width, height);
      const diffPixels = pixelmatch(a.data, b.data, diffPng.data, width, height, {
        threshold: scoring.threshold,
        includeAA: false,
      });
      const diffPct = (diffPixels / (width * height)) * 100;
      const dimsMatch =
        Math.abs(dims.dw) <= scoring.dimTolerancePx && Math.abs(dims.dh) <= scoring.dimTolerancePx;
      const pass = dimsMatch && diffPct <= scoring.passPct;
      // Slot hug (decided 2026-09-12): the design holds a taller frame than
      // the content the component ships while the render hugs its own height.
      // Width matches and the union diff is under the pass bar, so the
      // frame's extra height carries no real pixels — classified visibly
      // rather than failed. The triptych is kept for review.
      const slotHug =
        !pass &&
        dims.dh < -scoring.dimTolerancePx &&
        Math.abs(dims.dw) <= scoring.dimTolerancePx &&
        diffPct <= scoring.passPct;

      const diffFile = path.join(diffDir, nodeFile);
      kit.writePng(diffFile, diffPng);
      const triptychFile = path.join(diffDir, `${sanitizeNodeId(variant.nodeId)}.triptych.png`);
      kit.writePng(triptychFile, kit.triptych(baseline, render, diffPng));

      pairs.push({
        ...base,
        status: slotHug ? 'slot-hug' : 'diffed',
        pass: slotHug ? null : pass,
        dims,
        ...(overflow ? { nodeOverflow: overflow.by } : {}),
        diffPixels,
        diffPct: Number(diffPct.toFixed(2)),
        passPct: scoring.passPct,
        diffPng: path.relative(vw.root, diffFile),
        triptychPng: path.relative(vw.root, triptychFile),
      });
    }

    const diffed = pairs.filter((p) => p.status === 'diffed');
    const summary = {
      passPct: scoringFor(ignore, kind, key, {}).passPct,
      variants: pairs.length,
      diffed: diffed.length,
      pass: diffed.filter((p) => p.pass).length,
      fail: pairs.filter((p) => p.pass === false).length,
      noStory: pairs.filter((p) => p.status === 'no-story').length,
      noBaseline: pairs.filter((p) => p.status === 'no-baseline').length,
      deferred: pairs.filter((p) => String(p.status).startsWith('deferred')).length,
      unsupported: pairs.filter((p) => p.status === 'unsupported-combination').length,
      ignored: pairs.filter((p) => p.status === 'skipped-ignored').length,
      slotHug: pairs.filter((p) => p.status === 'slot-hug').length,
      meanDiffPct: diffed.length
        ? Number((diffed.reduce((s, p) => s + p.diffPct, 0) / diffed.length).toFixed(2))
        : null,
      maxDiffPct: diffed.length ? Math.max(...diffed.map((p) => p.diffPct)) : null,
      worstPair: diffed.length
        ? diffed.reduce((w, p) => (p.diffPct > w.diffPct ? p : w)).nodeId
        : null,
    };

    const prior = sections[section][key];
    sections[section][key] = {
      title: entry.storyTitle,
      priority: {
        depth: ranking ? ranking.depthOf(key) : null,
        leaf: ranking ? ranking.leaves.has(key) : null,
      },
      summary,
      previous: prior
        ? { ...prior.summary, generatedAt: previousReport?.generatedAt ?? null }
        : null,
      pairs,
    };
  }

  const rankingRows = (section: 'components' | 'compositions') =>
    Object.entries(sections[section])
      .map(([key, c]: [string, any]) => ({
        key,
        depth: c.priority.depth,
        pass: c.summary.pass,
        fail: c.summary.fail,
        diffed: c.summary.diffed,
        unsupported: c.summary.unsupported,
        ignored: c.summary.ignored,
        slotHug: c.summary.slotHug,
        passPct: c.summary.passPct,
        meanDiffPct: c.summary.meanDiffPct,
        maxDiffPct: c.summary.maxDiffPct,
      }))
      .sort((a, b) => a.key.localeCompare(b.key));

  const report = {
    generatedAt: new Date().toISOString(),
    workspace: manifest.$meta.workspace,
    mode,
    settings: { ...SCORING_DEFAULTS, scale, includeAA: false },
    analysis: ranking
      ? { cycles: ranking.cycles }
      : { warning: 'no analysis/dependencies.* found — run `specs analyze dependencies`' },
    ranking: rankingRows('components'),
    compositionRanking: rankingRows('compositions'),
    components: sections.components,
    compositions: sections.compositions,
  };
  writeJson(reportPath, report);
  writeMarkdown(vw, report);

  const tally = (rows: any[]) =>
    rows.reduce(
      (t, r) => ({ pass: t.pass + r.pass, fail: t.fail + r.fail }),
      { pass: 0, fail: 0 },
    );
  const comp = tally(report.ranking);
  const compn = tally(report.compositionRanking);
  console.log(
    `✓ diff (${mode}): components ${comp.pass} pass, ${comp.fail} fail` +
      (report.compositionRanking.length
        ? ` · compositions ${compn.pass} pass, ${compn.fail} fail (advisory)`
        : '') +
      ` → ${reportPath}`,
  );
  // Components decide the exit status; compositions never do.
  if (comp.fail > 0) process.exitCode = 1;
  return report;
}

/** Regenerate the markdown view from the stored JSON — never re-scores. */
export function writeMarkdown(vw: VisualWorkspace, report: any): void {
  const lines: string[] = [];
  // Display-only namespace strip; keys everywhere else keep the full spelling.
  const displayName = (key: string) => {
    const m = key.match(/^[a-z0-9]+(?=[A-Z])/);
    return m ? key.slice(m[0].length) : key;
  };
  lines.push('# Visual report');
  lines.push('');
  lines.push(
    `Generated ${report.generatedAt} · mode ${report.mode ?? 'figma'} · scale ${report.settings.scale} · ` +
      `default threshold ${report.settings.threshold} · default passPct ${report.settings.passPct}%`,
  );
  if (report.analysis?.warning) lines.push(`\n> ⚠ ${report.analysis.warning}`);
  if (report.analysis?.cycles?.length) {
    lines.push(`\n> Dependency cycles (no strict order): ${JSON.stringify(report.analysis.cycles)}`);
  }

  const table = (rows: any[], section: Record<string, any>) => {
    lines.push('');
    lines.push('| spec | depth | pass | fail | fail % | diffed | ignored | mean % | max % | pass at | Δ mean vs prev |');
    lines.push('|---|---|---|---|---|---|---|---|---|---|---|');
    for (const row of rows) {
      const c = section[row.key];
      const delta =
        c.previous?.meanDiffPct != null && c.summary.meanDiffPct != null
          ? (c.summary.meanDiffPct - c.previous.meanDiffPct).toFixed(2)
          : '—';
      lines.push(
        `| ${displayName(row.key)} | ${row.depth ?? '?'} | ${row.pass} | ${row.fail} | ` +
          `${c.summary.variants ? `${Math.round((row.fail / c.summary.variants) * 100)}%` : '—'} | ` +
          `${row.diffed} | ${row.ignored || ''} | ` +
          `${row.meanDiffPct ?? '—'} | ${row.maxDiffPct ?? '—'} | ${row.passPct}% | ${delta} |`,
      );
    }
  };

  lines.push('');
  lines.push('## Components');
  table(report.ranking, report.components);

  if (report.compositionRanking?.length) {
    lines.push('');
    lines.push('## Compositions (advisory)');
    lines.push('');
    lines.push(
      'Reported, never counted toward the exit status: a composition diff is dominated by the components inside it — fix leaves first.',
    );
    table(report.compositionRanking, report.compositions);
  }
  lines.push('');

  // Nodes whose content escapes their frame export larger than the component;
  // the baseline is cropped to the node box before scoring — a fact about the
  // design worth naming, not a failure.
  const overflowing = report.ranking
    .map((row: any) => {
      const pairs = report.components[row.key].pairs.filter((p: any) => p.nodeOverflow);
      if (!pairs.length) return null;
      const by = pairs.reduce(
        (m: [number, number], p: any) => [
          Math.max(m[0], p.nodeOverflow[0]),
          Math.max(m[1], p.nodeOverflow[1]),
        ],
        [0, 0],
      );
      return `- ${displayName(row.key)} — ${pairs.length} variant${pairs.length === 1 ? '' : 's'}, up to ${by[0]}×${by[1]}px beyond the node`;
    })
    .filter(Boolean);
  if (overflowing.length) {
    lines.push('## Nodes whose content overflows their frame');
    lines.push('');
    lines.push('Exported larger than the component; the baseline is cropped to the node box before scoring.');
    lines.push('');
    lines.push(...(overflowing as string[]));
    lines.push('');
  }

  for (const [sectionName, rows] of [
    ['components', report.ranking],
    ['compositions', report.compositionRanking ?? []],
  ] as const) {
    for (const row of rows) {
      const c = report[sectionName][row.key];
      const worst = c.pairs
        .filter((p: any) => p.status === 'diffed' && !p.pass)
        .sort((a: any, b: any) => b.diffPct - a.diffPct)
        .slice(0, 3);
      if (!worst.length) continue;
      lines.push(`## ${displayName(row.key)} — worst failures`);
      lines.push('');
      for (const p of worst) {
        lines.push(`- ${p.diffPct}% (dw ${p.dims.dw}, dh ${p.dims.dh}) — ${JSON.stringify(p.config)}`);
        lines.push(`  - ${p.triptychPng}`);
      }
      lines.push('');
    }
  }
  fs.mkdirSync(vw.reportDir, { recursive: true });
  fs.writeFileSync(path.join(vw.reportDir, 'visual-report.md'), lines.join('\n') + '\n');
}
