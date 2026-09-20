import { describe, it, expect, vi, afterEach } from 'vitest';
import { postGenerateFromSelection } from '../../../src/bridge/client.js';

describe('postGenerateFromSelection', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('posts to /generate with an empty body when no fileKey is given', async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      json: () => Promise.resolve({ success: true, nodeId: '1:2', name: 'Alert', specData: { title: 'Alert' } }),
    });
    vi.stubGlobal('fetch', fetchMock);

    const result = await postGenerateFromSelection();

    expect(fetchMock).toHaveBeenCalledWith(
      expect.stringMatching(/\/generate$/),
      expect.objectContaining({ method: 'POST', body: JSON.stringify({}) })
    );
    expect(result).toEqual({ success: true, nodeId: '1:2', name: 'Alert', specData: { title: 'Alert' } });
  });

  it('includes fileKey in the request body when provided', async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      json: () => Promise.resolve({ success: false, error: 'No plugin connected for file "fileA".' }),
    });
    vi.stubGlobal('fetch', fetchMock);

    const result = await postGenerateFromSelection({ fileKey: 'fileA' });

    expect(fetchMock).toHaveBeenCalledWith(
      expect.stringMatching(/\/generate$/),
      expect.objectContaining({ body: JSON.stringify({ fileKey: 'fileA' }) })
    );
    expect(result.success).toBe(false);
    expect(result.error).toContain('fileA');
  });
});
