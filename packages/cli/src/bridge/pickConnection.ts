// Resolves which connected Figma file a bridge request should target when the
// caller didn't pass --file explicitly. With 2+ connections and an interactive
// terminal, prompts the user to pick one instead of failing immediately —
// non-interactive callers (scripts, CI) keep today's fail-loud behavior so
// they never hang waiting on stdin.

import { createInterface } from 'readline';
import { getBridgeStatus, type BridgeConnection } from './client.js';

export function isAmbiguous(connections: BridgeConnection[]): boolean {
  return connections.length >= 2;
}

/** Converts a 1-based answer string to a 0-based index, or null if out of range/unparseable. */
export function parseSelection(answer: string, count: number): number | null {
  const idx = parseInt(answer.trim(), 10) - 1;
  return Number.isInteger(idx) && idx >= 0 && idx < count ? idx : null;
}

function promptForConnection(connections: BridgeConnection[]): Promise<string | undefined> {
  return new Promise((resolve) => {
    console.log('\nMultiple Figma files are connected:');
    connections.forEach((c, i) => {
      console.log(`  ${i + 1}) ${c.fileName ?? c.fileKey} (${c.fileKey})`);
    });

    const rl = createInterface({ input: process.stdin, output: process.stdout });
    rl.question(`Select a file [1-${connections.length}]: `, (answer) => {
      rl.close();
      const idx = parseSelection(answer, connections.length);
      if (idx === null) {
        console.error('Invalid selection.');
        resolve(undefined);
        return;
      }
      resolve(connections[idx].fileKey);
    });
  });
}

export interface ResolveFileKeyOptions {
  /** Override interactivity detection (for tests). Defaults to real stdin/stdout TTY state. */
  isTTY?: boolean;
  /** Override the status fetch (for tests). Defaults to getBridgeStatus(). */
  getStatus?: typeof getBridgeStatus;
  /** Override the prompt (for tests). Defaults to a readline-based picker. */
  prompt?: (connections: BridgeConnection[]) => Promise<string | undefined>;
}

/**
 * Returns the fileKey to target for a bridge request.
 * - An explicit fileKey passes through unchanged.
 * - Non-interactive (no TTY): returns undefined — the bridge server's own
 *   ambiguity/no-connection error surfaces from the actual request.
 * - Interactive with fewer than 2 connections: returns undefined — resolve()
 *   on the server picks the sole connection, or reports "none connected".
 * - Interactive with 2+ connections: prompts the user to choose.
 */
export async function resolveFileKey(explicit: string | undefined, opts: ResolveFileKeyOptions = {}): Promise<string | undefined> {
  if (explicit) return explicit;

  const isTTY = opts.isTTY ?? (!!process.stdin.isTTY && !!process.stdout.isTTY);
  if (!isTTY) return undefined;

  const getStatus = opts.getStatus ?? getBridgeStatus;
  let status;
  try {
    status = await getStatus();
  } catch {
    return undefined;
  }

  if (!isAmbiguous(status.connections)) return undefined;

  const prompt = opts.prompt ?? promptForConnection;
  return prompt(status.connections);
}
