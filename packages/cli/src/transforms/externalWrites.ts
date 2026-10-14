// Files a transform writes outside the package it is emitting, reported once at
// the end of a run.
//
// A customer reading a transform's output sees what it produced for the target
// package and nothing else, so a file written beside that package — a stylesheet
// every emitted component depends on, a host module stories import by relative
// path — arrives invisibly. The failure is silent in both directions: a customer
// who never finds the file gets unstyled components with no indication why, and
// one who relocates the emitted package breaks an import nothing announced.
//
// The transform packages keep their own store and the CLI drains it across the
// package boundary, because the bundles do not share a module instance.

export interface ExternalWrite {
  /** Path as the customer should see it — relative to the workspace, not absolute. */
  path: string;
  /** What it is for, and what the customer has to do with it. One line. */
  note: string;
}

const externalWrites = new Map<string, ExternalWrite[]>();

/** Record a file written outside the target package. `label` names the transform. */
export function recordExternalWrite(label: string, write: ExternalWrite): void {
  const forLabel = externalWrites.get(label) ?? [];
  if (forLabel.some(w => w.path === write.path)) return;
  forLabel.push(write);
  externalWrites.set(label, forLabel);
}

/**
 * Drain and print everything recorded, here and in the transform packages.
 * No-op when nothing was recorded, so a run that writes only inside its own
 * package stays quiet.
 */
export async function reportExternalWrites(): Promise<void> {
  for (const pkg of ['@directededges/webcomponents-from-specs', '@directededges/react-from-specs']) {
    try {
      const mod = await import(pkg) as { drainExternalWrites?: () => Map<string, ExternalWrite[]> };
      for (const [label, entries] of mod.drainExternalWrites?.() ?? []) {
        for (const entry of entries) recordExternalWrite(label, entry);
      }
    } catch {
      // A package that is not installed, or an older one without the export, has
      // nothing to contribute — not an error.
    }
  }

  if (externalWrites.size === 0) return;
  console.log('');
  console.log('  Files written outside the emitted package:');
  for (const [label, entries] of externalWrites) {
    for (const { path, note } of [...entries].sort((a, b) => a.path.localeCompare(b.path))) {
      console.log(`    ${path}  [${label}]`);
      console.log(`      ${note}`);
    }
  }
  externalWrites.clear();
}
