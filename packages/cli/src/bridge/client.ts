// Thin HTTP client for talking to a running bridge server (see bridge/server.ts).

import type { ResolvedConfig } from '@directededges/specs-schema';
import { HTTP_PORT } from './config.js';

export interface BridgeConnection {
  fileKey: string;
  fileName?: string;
  connected: boolean;
}

export interface BridgeStatus {
  connections: BridgeConnection[];
}

export async function getBridgeStatus(timeoutMs = 1500): Promise<BridgeStatus> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const res = await fetch(`http://localhost:${HTTP_PORT}/status`, { signal: controller.signal });
    return (await res.json()) as BridgeStatus;
  } finally {
    clearTimeout(timer);
  }
}

export interface RenderRequestBody {
  specPath?: string;
  /** Pre-parsed, pre-merged component spec. When present, the bridge relays
   * it as-is instead of reading/parsing specPath itself. specPath is still
   * required alongside it to derive the workspace (specsDir/dataDir). */
  spec?: Record<string, unknown>;
  pageId?: string;
  fileKey?: string;
  /** Delete a same-titled page node before rendering, instead of erroring on the collision. */
  overwrite?: boolean;
  /**
   * The workspace config, as a fallback for a spec that carries no `metadata.config` —
   * a hand-authored one, say. The spec's own config still wins: it records how the spec
   * was produced, which is what render has to reverse.
   */
  config?: ResolvedConfig;
}

// Render reports success/failure only — the round-trip spec read is a second,
// explicit call (`specs generate --from-bridge`), not a render side effect.
export interface RenderResponse {
  success: boolean;
  nodeId?: string;
  /** Non-fatal render degradations reported by the plugin (font fallbacks, skipped keys). */
  warnings?: string[];
  error?: unknown;
  /** Phase durations inside the plugin render. */
  timings?: { total: number; phases: Array<{ label: string; ms: number; count: number }> };
  /** Phase durations on the bridge — manifest builds and the plugin round-trip. */
  bridgeTimings?: Array<{ label: string; ms: number }>;
  payloadKB?: number;
}

export async function postRender(body: RenderRequestBody): Promise<RenderResponse> {
  const res = await fetch(`http://localhost:${HTTP_PORT}/render`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  return (await res.json()) as RenderResponse;
}

export interface GenerateFromSelectionRequestBody {
  fileKey?: string;
  /** Generate from this node instead of the current selection (the plugin selects it first). */
  nodeId?: string;
  /**
   * The config to process the node under. Without it the plugin builds the spec under its
   * own UI settings, so the same node in the same file yields different specs depending on
   * how someone last left the panel — and a round trip compares a baseline made under one
   * config against a read made under another. Applies to this request only; it must never
   * be stored as the plugin's settings.
   */
  config?: ResolvedConfig;
  /**
   * Testing utility: delete the node once its spec has been read. A catalogue sweep that
   * renders and reads every component otherwise leaves all of them on the page.
   */
  remove?: boolean;
}

export interface GenerateFromSelectionResponse {
  success: boolean;
  nodeId?: string;
  name?: string;
  specData?: unknown;
  error?: unknown;
}

export async function postGenerateFromSelection(body: GenerateFromSelectionRequestBody = {}): Promise<GenerateFromSelectionResponse> {
  const res = await fetch(`http://localhost:${HTTP_PORT}/generate`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  return (await res.json()) as GenerateFromSelectionResponse;
}
