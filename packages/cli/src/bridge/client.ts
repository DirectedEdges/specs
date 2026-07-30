// Thin HTTP client for talking to a running bridge server (see bridge/server.ts).

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
  manifestPath?: string;
  pageId?: string;
  returnSpec?: boolean;
  fileKey?: string;
}

export interface RenderResponse {
  success: boolean;
  nodeId?: string;
  specData?: unknown;
  written?: number;
  failed?: number;
  results?: Array<{ name: string; nodeId?: string; error?: string }>;
  error?: unknown;
}

export async function postRender(body: RenderRequestBody): Promise<RenderResponse> {
  const res = await fetch(`http://localhost:${HTTP_PORT}/render`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  return (await res.json()) as RenderResponse;
}
