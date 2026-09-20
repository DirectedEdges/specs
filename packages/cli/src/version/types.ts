/**
 * Spec versioning — shared types.
 *
 * The unit of comparison is the assembled component: every concern file in the
 * component's spec folder parsed into one object, keyed by concern name, so each
 * change knows which file it came from and classification can key off the concern
 * boundary (the concern split is the semver boundary — see semver-rules).
 */

/** A parsed concern document (api.yaml, variants.yaml, examples.yaml, …). */
export type ConcernDoc = Record<string, unknown>;

export interface AssembledComponent {
  /** Spec folder name — `deButton`. The ledger file key. */
  name: string;
  /** Declared title from api.yaml — `DE Button`. The primary identity. */
  title: string;
  /** Concern name (`api`, `variants`, `examples`) → parsed document. */
  concerns: Record<string, ConcernDoc>;
}

export type Operation = 'added' | 'removed' | 'modified' | 'renamed' | 'reordered';

/**
 * Rule-assigned severity. BREAKING/ADDITIVE/PATCH/IGNORE in the design docs map to
 * major/minor/patch/ignore here; `unclassified` marks a change no rule covers —
 * surfaced for a human read, never silently graded.
 */
export type Impact = 'major' | 'minor' | 'patch' | 'ignore' | 'unclassified';

export type Bump = 'major' | 'minor' | 'patch' | 'none';

/** One atomic change. */
export interface DiffEntry {
  /** Path within the concern document: `props.size.enum`, `variants[size="S"].elements.root.styles.backgroundColor`. */
  path: string;
  /** Source concern file: `api.yaml`, `variants.yaml`, `examples.yaml`, or the virtual `assets` / `run` / `component` concerns. */
  concernFile: string;
  operation: Operation;
  oldValue?: unknown;
  newValue?: unknown;
  /** Assigned by the classifier from the rules data. */
  impact: Impact;
  /** Rule id that graded this entry. */
  rule?: string;
  /** The rule's factual sentence. */
  why?: string;
  /**
   * Semantic facts the diff engine computed that rules match on:
   * `optional` / `required` (prop additions), `loosened` / `tightened` (nullable),
   * `schemaMajor` (run metadata), `referenced` / `unreferenced` (asset removals).
   */
  flags?: string[];
  /** Orphaned variant configurations / dangling bindings attached to the api-side change that caused them. */
  defects?: string[];
}

export interface ComponentDiff {
  name: string;
  title: string;
  /** Set when the component arrived under a different identity. */
  previousTitle?: string;
  entries: DiffEntry[];
  /** Suggested bump for this component: highest class present. */
  bump: Bump;
  warnings: string[];
  counts: Record<Impact, number>;
}

export interface Classification {
  bump: Bump;
  reasons: DiffEntry[];
  warnings: string[];
}

// ---------------------------------------------------------------- ledger

export interface LedgerRun {
  generatorVersion?: string;
  schemaVersion?: string;
}

export interface LedgerGit {
  commit: string | null;
  tag: string | null;
  branch: string | null;
}

export interface LedgerOverride {
  class: 'major' | 'minor' | 'patch';
  reason: string;
}

export interface ComponentLedgerEntry {
  version: string;
  libraryVersion: string;
  timestamp: string;
  author: string;
  git: LedgerGit;
  run: LedgerRun;
  /**
   * The classified diff that produced this version. Full content lives in the
   * `versions/<libraryVersion>/specs/` folder, not here — the ledger keeps the
   * change record for history queries and changelogs.
   */
  diff: DiffEntry[];
  changeType: 'initial' | 'major' | 'minor' | 'patch' | 'removed';
  reason: string;
  override: LedgerOverride | null;
}

export interface ComponentLedger {
  component: { title: string; createdAt: string };
  versions: ComponentLedgerEntry[];
}

export interface LibraryLedgerEntry {
  version: string;
  timestamp: string;
  author: string;
  git: LedgerGit;
  run: LedgerRun;
  /** Per-component roll-up for this release. */
  components: Record<string, { from: string | null; to: string | null; changeType: string }>;
  /** Asset manifest at this version: relative path → content hash. Assets themselves live only in `versions/latest/assets/`. */
  assets: Record<string, string>;
  /** Asset changes classified for this release. */
  assetDiff: DiffEntry[];
  /** Run-metadata changes (latest.metadata.yaml), diffed once per run. */
  runDiff: DiffEntry[];
  changeType: 'initial' | 'major' | 'minor' | 'patch';
  reason: string;
  override: LedgerOverride | null;
}

export interface LibraryLedger {
  library: { createdAt: string };
  versions: LibraryLedgerEntry[];
}

// ---------------------------------------------------------------- renames

export interface RenameEvent {
  at?: string;
  kind: string;
  kindNote?: string;
  scope: string;
  from?: string;
  to?: string;
  version?: string;
  reason?: string;
  mappings?: Array<{ scope: string; from: string; to: string }>;
}

/** Flattened, scope-keyed lookups the diff engine consults before key-set comparison. */
export interface RenameMap {
  /** Component-level: matches by title or slug. */
  components: Array<{ from: string; to: string; event: RenameEvent }>;
  /** `<component>.props` scope: componentKey → (fromProp → toProp). */
  props: Map<string, Map<string, string>>;
  /** `<component>.props.<prop>.enum` scope: `componentKey.prop` → (fromValue → toValue). */
  enums: Map<string, Map<string, string>>;
  events: RenameEvent[];
}
