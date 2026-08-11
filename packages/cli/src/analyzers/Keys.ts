import fs from 'fs-extra';
import path from 'path';
import yaml from 'yaml';
import type { Transformer, TransformerContext } from '../Types/Transformer.js';

/**
 * Reports Figma layer and property names that a formatted key cannot reconstruct
 * (ADR-066), so they can be tidied at the source.
 *
 * Reads generated specs, and therefore sees a name only where the producer recorded it
 * in `$extensions['com.figma'].name`. That happens when `format.figmaKeys` declares a
 * source convention — under the `NONE` default nothing diverges and this report is
 * empty, which is correct: no convention was declared, so no name departed from one.
 *
 * A recorded name is NOT by itself a naming problem. The field has two independent
 * triggers: format divergence (ADR-066) and wrapper-collapse provenance (ADR-058), and
 * the latter fires on the `root` key regardless of `figmaKeys` or of how well-formed
 * the name is. `Text` on a collapsed root is perfectly safe under SENTENCE and
 * round-trips unaided. So each recorded name is re-tested against the safe key grammar
 * here, and only genuine failures are reported.
 */

type Surface = 'anatomy' | 'prop';

type DeclaredConvention = 'SENTENCE' | 'TITLE';

/**
 * The safe key grammar. These mirror the `SafeKeySentence` and `SafeKeyTitle`
 * definitions in `component.schema.json`, which remain the contract — kept as literals
 * here because the CLI bundles to a single file and reading the schema JSON at runtime
 * would make the report depend on a resolvable package path. If the schema patterns
 * change, change these.
 */
const SAFE_KEY_PATTERNS: Record<DeclaredConvention, RegExp> = {
  SENTENCE: /^[A-Z][a-z]*( ([a-z]+|[0-9]+))*$/,
  TITLE: /^[A-Z][a-z]*( ([A-Z][a-z]*|[0-9]+))*$/,
};

/** Why a Figma name falls outside the safe key grammar. First match wins. */
type Cause =
  | 'separator'
  | 'symbol'
  | 'non-ascii'
  | 'mixed-letter-digit'
  | 'digit-initial'
  | 'casing'
  | 'already-a-key';

interface NameEntry {
  key: string;
  figmaName: string;
  cause: Cause;
}

/** Empty surfaces are omitted rather than emitted as `[]`, to keep the checklist quiet. */
interface ComponentEntry {
  divergent: number;
  props?: NameEntry[];
  anatomy?: NameEntry[];
}

interface CauseEntry {
  cause: Cause;
  occurrences: number;
  names: string[];
}

interface NameFrequencyEntry {
  figmaName: string;
  occurrences: number;
  components: string[];
  cause: Cause;
}

interface KeysAggregate {
  summary: {
    totalComponents: number;
    componentsWithDivergence: number;
    totalNames: number;
    divergentNames: number;
    causeDistribution: Record<string, number>;
  };
  byComponent: Record<string, ComponentEntry>;
  byCause: CauseEntry[];
  byName: NameFrequencyEntry[];
}

interface Collected extends NameEntry {
  component: string;
  surface: Surface;
}

export class KeysAnalyzer implements Transformer {
  readonly name = 'keys';

  private readonly _divergent: Collected[] = [];
  private readonly _components = new Set<string>();
  private _totalNames = 0;
  private _outputFormat: 'JSON' | 'YAML' = 'JSON';
  /** Read from each spec's own `metadata.config`; undefined means no convention declared. */
  private _convention: DeclaredConvention | undefined;

  async run(apiYaml: Record<string, unknown>, context: TransformerContext): Promise<void> {
    const { componentKey, outputFormat } = context;
    this._outputFormat = outputFormat;
    this._components.add(componentKey);
    this._convention = declaredConvention(apiYaml) ?? this._convention;

    this.collect(componentKey, apiYaml);

    const subcomponents = (apiYaml.subcomponents ?? {}) as Record<string, unknown>;
    for (const [subName, subRaw] of Object.entries(subcomponents)) {
      this.collect(`${componentKey}.${subName}`, subRaw as Record<string, unknown>);
    }
  }

  /**
   * Walks a component's anatomy and props. Compositions and slot content carry their own
   * nested anatomy, so those are walked too — the producer records names at every depth.
   */
  private collect(component: string, comp: Record<string, unknown>): void {
    this.collectAnatomy(component, comp.anatomy);
    this.collectProps(component, comp.props);

    const slotContent = (comp.slotContentExamples ?? {}) as Record<string, unknown>;
    for (const entry of Object.values(slotContent)) {
      this.collectAnatomy(component, (entry as Record<string, unknown>)?.anatomy);
    }

    const compositions = (comp.compositions ?? {}) as Record<string, unknown>;
    for (const entry of Object.values(compositions)) {
      this.collectAnatomy(component, (entry as Record<string, unknown>)?.anatomy);
    }
  }

  private collectAnatomy(component: string, anatomy: unknown): void {
    for (const [key, raw] of Object.entries((anatomy ?? {}) as Record<string, unknown>)) {
      this._totalNames++;
      this.record(component, key, 'anatomy', figmaNameOf(raw));
    }
  }

  private collectProps(component: string, props: unknown): void {
    for (const [key, raw] of Object.entries((props ?? {}) as Record<string, unknown>)) {
      this._totalNames++;
      this.record(component, key, 'prop', figmaNameOf(raw));
    }
  }

  /**
   * Records a name only if it actually fails the declared grammar. A recorded name that
   * passes was written for the other reason the field exists — wrapper-collapse
   * provenance — and is not a naming problem: it reconstructs from its key unaided.
   */
  private record(component: string, key: string, surface: Surface, figmaName: string | undefined): void {
    if (!figmaName || !this._convention) return;
    if (SAFE_KEY_PATTERNS[this._convention].test(figmaName)) return;
    this._divergent.push({ component, key, figmaName, surface, cause: causeOf(figmaName) });
  }

  async finalize(outputDir: string, analysisDir?: string): Promise<void> {
    if (this._totalNames === 0) return;

    const outDir = analysisDir ?? path.join(outputDir, '_analysis');
    await fs.ensureDir(outDir);

    const aggregate = this.buildAggregate();
    const ext = this._outputFormat === 'JSON' ? 'json' : 'yaml';
    const content = this._outputFormat === 'JSON'
      ? JSON.stringify(aggregate, null, 2) + '\n'
      : yaml.stringify(aggregate, { lineWidth: 120 });
    await fs.writeFile(path.join(outDir, `keys.${ext}`), content, 'utf-8');
  }

  private buildAggregate(): KeysAggregate {
    const surfaces = new Map<string, { props: NameEntry[]; anatomy: NameEntry[] }>();
    for (const entry of this._divergent) {
      const bucket = surfaces.get(entry.component)
        ?? surfaces.set(entry.component, { props: [], anatomy: [] }).get(entry.component)!;
      const list = entry.surface === 'prop' ? bucket.props : bucket.anatomy;
      list.push({ key: entry.key, figmaName: entry.figmaName, cause: entry.cause });
    }
    const byComponent: Record<string, ComponentEntry> = {};
    for (const [component, { props, anatomy }] of surfaces) {
      props.sort((a, b) => a.figmaName.localeCompare(b.figmaName));
      anatomy.sort((a, b) => a.figmaName.localeCompare(b.figmaName));
      byComponent[component] = {
        divergent: props.length + anatomy.length,
        ...(props.length ? { props } : {}),
        ...(anatomy.length ? { anatomy } : {}),
      };
    }

    const causeDistribution: Record<string, number> = {};
    const causeNames = new Map<Cause, Set<string>>();
    for (const entry of this._divergent) {
      causeDistribution[entry.cause] = (causeDistribution[entry.cause] ?? 0) + 1;
      (causeNames.get(entry.cause) ?? causeNames.set(entry.cause, new Set()).get(entry.cause)!).add(entry.figmaName);
    }
    const byCause: CauseEntry[] = [...causeNames.entries()]
      .map(([cause, names]) => ({ cause, occurrences: causeDistribution[cause], names: [...names].sort() }))
      .sort((a, b) => b.occurrences - a.occurrences);

    // A name wrong in twelve components is one decision, not twelve — which is what a
    // per-component checklist cannot show on its own.
    const frequency = new Map<string, { components: Set<string>; occurrences: number; cause: Cause }>();
    for (const entry of this._divergent) {
      const record = frequency.get(entry.figmaName)
        ?? { components: new Set<string>(), occurrences: 0, cause: entry.cause };
      record.components.add(entry.component);
      record.occurrences++;
      frequency.set(entry.figmaName, record);
    }
    const byName: NameFrequencyEntry[] = [...frequency.entries()]
      .map(([figmaName, r]) => ({
        figmaName,
        occurrences: r.occurrences,
        components: [...r.components].sort(),
        cause: r.cause,
      }))
      .sort((a, b) => b.occurrences - a.occurrences || a.figmaName.localeCompare(b.figmaName));

    return {
      summary: {
        totalComponents: this._components.size,
        componentsWithDivergence: Object.keys(byComponent).length,
        totalNames: this._totalNames,
        divergentNames: this._divergent.length,
        causeDistribution,
      },
      byComponent: Object.fromEntries(Object.entries(byComponent).sort(([a], [b]) => a.localeCompare(b))),
      byCause,
      byName,
    };
  }
}

function figmaNameOf(raw: unknown): string | undefined {
  const extensions = (raw as Record<string, unknown>)?.$extensions as Record<string, unknown> | undefined;
  const figma = extensions?.['com.figma'] as Record<string, unknown> | undefined;
  const name = figma?.name;
  return typeof name === 'string' ? name : undefined;
}

/**
 * Classifies why a name diverged. Ordered most-specific first: a name with both a
 * symbol and odd casing is reported as a symbol problem, because that is the edit to
 * make. `already-a-key` is last — it is not a defect, just a name authored in the
 * spec's own convention rather than as a Figma display name.
 */
function causeOf(name: string): Cause {
  if (/[\-_]/.test(name) && !/\s/.test(name)) return 'already-a-key';
  if (/[^\x20-\x7E]/.test(name)) return 'non-ascii';
  if (/[^A-Za-z0-9 ]/.test(name)) return 'symbol';
  if (/\s\s|^\s|\s$|[\t\n]/.test(name)) return 'separator';
  if (/[A-Za-z][0-9]|[0-9][A-Za-z]/.test(name)) return 'mixed-letter-digit';
  if (/^[0-9]/.test(name)) return 'digit-initial';
  // Characters and word shape are all fine, so the only rule left to fail is casing.
  // Reached only for names that already failed the grammar, so this is a verdict rather
  // than a catch-all — a well-formed name never gets here.
  return 'casing';
}

/** The convention the spec was generated under, from its own `metadata.config`. */
function declaredConvention(apiYaml: Record<string, unknown>): DeclaredConvention | undefined {
  const metadata = apiYaml.metadata as Record<string, unknown> | undefined;
  const config = metadata?.config as Record<string, unknown> | undefined;
  const format = config?.format as Record<string, unknown> | undefined;
  const value = format?.figmaKeys;
  return value === 'SENTENCE' || value === 'TITLE' ? value : undefined;
}
