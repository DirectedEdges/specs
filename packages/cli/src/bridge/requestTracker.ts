// Correlation-ID based request/response matching, so responses route to the
// right caller even with multiple connections and requests in flight.
// Extracted from server.ts for unit testability.

import { randomUUID } from 'crypto';

export class RequestTracker<T = unknown> {
  private pending = new Map<string, { resolve: (v: T) => void; reject: (e: unknown) => void }>();

  /**
   * Register a new pending request. Returns its requestId (to send alongside
   * the outgoing message) and a promise that resolves/rejects when `resolve()`
   * is called with that ID, or rejects on timeout if it never is.
   */
  create(timeoutMs: number, timeoutMessage: string): { requestId: string; promise: Promise<T> } {
    const requestId = randomUUID();
    const promise = new Promise<T>((resolve, reject) => {
      this.pending.set(requestId, { resolve, reject });
      setTimeout(() => {
        if (this.pending.has(requestId)) {
          this.pending.delete(requestId);
          reject(new Error(timeoutMessage));
        }
      }, timeoutMs);
    });
    return { requestId, promise };
  }

  /** Resolve a pending request by ID. Returns false if the ID is unknown (already resolved, timed out, or never registered). */
  resolve(requestId: string, value: T): boolean {
    const pending = this.pending.get(requestId);
    if (!pending) return false;
    this.pending.delete(requestId);
    pending.resolve(value);
    return true;
  }

  has(requestId: string): boolean {
    return this.pending.has(requestId);
  }

  get size(): number {
    return this.pending.size;
  }
}
