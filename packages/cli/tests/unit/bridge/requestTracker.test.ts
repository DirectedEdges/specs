import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { RequestTracker } from '../../../src/bridge/requestTracker.js';

describe('RequestTracker', () => {
  it('create() returns a unique requestId per call', () => {
    const tracker = new RequestTracker();
    const a = tracker.create(1000, 'timeout');
    const b = tracker.create(1000, 'timeout');
    expect(a.requestId).not.toBe(b.requestId);
  });

  it('resolve() resolves the matching promise with the given value', async () => {
    const tracker = new RequestTracker<string>();
    const { requestId, promise } = tracker.create(1000, 'timeout');

    const resolved = tracker.resolve(requestId, 'hello');

    expect(resolved).toBe(true);
    await expect(promise).resolves.toBe('hello');
  });

  it('resolve() with an unknown requestId returns false and does not throw', () => {
    const tracker = new RequestTracker();
    expect(tracker.resolve('unknown-id', 'value')).toBe(false);
  });

  it('resolve() only fires once per requestId — a second call is a no-op', async () => {
    const tracker = new RequestTracker<string>();
    const { requestId, promise } = tracker.create(1000, 'timeout');

    tracker.resolve(requestId, 'first');
    const secondCallResult = tracker.resolve(requestId, 'second');

    expect(secondCallResult).toBe(false);
    await expect(promise).resolves.toBe('first');
  });

  it('two concurrent requests resolve independently without cross-talk', async () => {
    // This is the concrete regression the correlation-ID design replaced a
    // single global pending-slot to fix: two in-flight requests (e.g. to two
    // different connected Figma files) must not resolve each other.
    const tracker = new RequestTracker<string>();
    const first = tracker.create(1000, 'timeout');
    const second = tracker.create(1000, 'timeout');

    tracker.resolve(second.requestId, 'second-result');
    tracker.resolve(first.requestId, 'first-result');

    await expect(first.promise).resolves.toBe('first-result');
    await expect(second.promise).resolves.toBe('second-result');
  });

  describe('timeouts', () => {
    beforeEach(() => vi.useFakeTimers());
    afterEach(() => vi.useRealTimers());

    it('rejects with the given message if never resolved before the timeout', async () => {
      const tracker = new RequestTracker();
      const { promise } = tracker.create(1000, 'Timed out waiting for result.');

      const assertion = expect(promise).rejects.toThrow('Timed out waiting for result.');
      await vi.advanceTimersByTimeAsync(1000);
      await assertion;
    });

    it('does not reject if resolved before the timeout fires', async () => {
      const tracker = new RequestTracker<string>();
      const { requestId, promise } = tracker.create(1000, 'Timed out.');

      tracker.resolve(requestId, 'in time');
      await vi.advanceTimersByTimeAsync(1000);

      await expect(promise).resolves.toBe('in time');
    });

    it('has() and size reflect pending requests and clear after resolve or timeout', async () => {
      const tracker = new RequestTracker<string>();
      const { requestId, promise } = tracker.create(1000, 'timeout');

      expect(tracker.has(requestId)).toBe(true);
      expect(tracker.size).toBe(1);

      tracker.resolve(requestId, 'done');
      await promise;

      expect(tracker.has(requestId)).toBe(false);
      expect(tracker.size).toBe(0);
    });
  });
});
