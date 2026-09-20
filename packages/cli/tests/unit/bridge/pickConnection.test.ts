import { describe, it, expect, vi } from 'vitest';
import { isAmbiguous, parseSelection, resolveFileKey } from '../../../src/bridge/pickConnection.js';
import type { BridgeConnection } from '../../../src/bridge/client.js';

const twoConnections: BridgeConnection[] = [
  { fileKey: 'fileA', fileName: 'Design System', connected: true },
  { fileKey: 'fileB', fileName: 'Prototype', connected: true },
];

describe('isAmbiguous', () => {
  it('is false for 0 or 1 connections', () => {
    expect(isAmbiguous([])).toBe(false);
    expect(isAmbiguous([twoConnections[0]])).toBe(false);
  });

  it('is true for 2+ connections', () => {
    expect(isAmbiguous(twoConnections)).toBe(true);
  });
});

describe('parseSelection', () => {
  it('converts a valid 1-based answer to a 0-based index', () => {
    expect(parseSelection('1', 2)).toBe(0);
    expect(parseSelection('2', 2)).toBe(1);
  });

  it('returns null for out-of-range answers', () => {
    expect(parseSelection('0', 2)).toBeNull();
    expect(parseSelection('3', 2)).toBeNull();
  });

  it('returns null for unparseable answers', () => {
    expect(parseSelection('abc', 2)).toBeNull();
    expect(parseSelection('', 2)).toBeNull();
  });

  it('trims whitespace before parsing', () => {
    expect(parseSelection('  2  ', 2)).toBe(1);
  });
});

describe('resolveFileKey', () => {
  it('returns the explicit fileKey unchanged without checking status', async () => {
    const getStatus = vi.fn();
    const result = await resolveFileKey('explicitKey', { getStatus });
    expect(result).toBe('explicitKey');
    expect(getStatus).not.toHaveBeenCalled();
  });

  it('returns undefined when not interactive (no TTY), without prompting', async () => {
    const prompt = vi.fn();
    const result = await resolveFileKey(undefined, { isTTY: false, prompt });
    expect(result).toBeUndefined();
    expect(prompt).not.toHaveBeenCalled();
  });

  it('returns undefined when interactive but fewer than 2 connections', async () => {
    const getStatus = vi.fn().mockResolvedValue({ connections: [twoConnections[0]] });
    const prompt = vi.fn();
    const result = await resolveFileKey(undefined, { isTTY: true, getStatus, prompt });
    expect(result).toBeUndefined();
    expect(prompt).not.toHaveBeenCalled();
  });

  it('prompts and returns the chosen fileKey when interactive with 2+ connections', async () => {
    const getStatus = vi.fn().mockResolvedValue({ connections: twoConnections });
    const prompt = vi.fn().mockResolvedValue('fileB');
    const result = await resolveFileKey(undefined, { isTTY: true, getStatus, prompt });
    expect(result).toBe('fileB');
    expect(prompt).toHaveBeenCalledWith(twoConnections);
  });

  it('returns undefined when the status fetch fails (bridge not running)', async () => {
    const getStatus = vi.fn().mockRejectedValue(new Error('ECONNREFUSED'));
    const prompt = vi.fn();
    const result = await resolveFileKey(undefined, { isTTY: true, getStatus, prompt });
    expect(result).toBeUndefined();
    expect(prompt).not.toHaveBeenCalled();
  });
});
