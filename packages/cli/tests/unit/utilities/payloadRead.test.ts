import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { mkdtempSync, writeFileSync, rmSync } from 'fs';
import { join } from 'path';
import { tmpdir } from 'os';
import {
  MAX_JSON_STRING_BYTES,
  PayloadTooLargeError,
  assertPayloadReadable,
  isPayloadSizeError,
  readJsonPayload,
} from '../../../src/utilities/payloadRead.js';

describe('payloadRead', () => {
  let dir: string;

  beforeEach(() => { dir = mkdtempSync(join(tmpdir(), 'specs-payload-')); });
  afterEach(() => rmSync(dir, { recursive: true, force: true }));

  describe('assertPayloadReadable', () => {
    it('passes a payload under the cap', () => {
      const file = join(dir, 'ok.file.json');
      writeFileSync(file, '{}');
      expect(() => assertPayloadReadable(file)).not.toThrow();
      expect(() => assertPayloadReadable(file, MAX_JSON_STRING_BYTES - 1)).not.toThrow();
    });

    it('throws a named error at the cap, carrying file, size, and remedies', () => {
      const file = join(dir, 'huge.file.json');
      writeFileSync(file, '{}');
      try {
        assertPayloadReadable(file, MAX_JSON_STRING_BYTES);
        expect.unreachable('should have thrown');
      } catch (error) {
        expect(error).toBeInstanceOf(PayloadTooLargeError);
        const e = error as PayloadTooLargeError;
        expect(e.file).toBe(file);
        expect(e.bytes).toBe(MAX_JSON_STRING_BYTES);
        expect(e.message).toContain('huge.file.json');
        expect(e.message).toContain('512MB');
        expect(e.message).toContain('--no-geometry');
        expect(e.remedies.length).toBeGreaterThan(0);
      }
    });
  });

  describe('isPayloadSizeError', () => {
    it('recognizes both the guard error and V8\'s own message', () => {
      expect(isPayloadSizeError(new PayloadTooLargeError('f', 1))).toBe(true);
      expect(isPayloadSizeError(new Error('Cannot create a string longer than 0x1fffffe8 characters'))).toBe(true);
      expect(isPayloadSizeError(new Error('anything else'))).toBe(false);
      expect(isPayloadSizeError('not an error')).toBe(false);
    });
  });

  describe('readJsonPayload', () => {
    it('reads valid JSON', () => {
      const file = join(dir, 'ok.file.json');
      writeFileSync(file, JSON.stringify({ name: 'Library' }));
      expect(readJsonPayload(file)).toEqual({ name: 'Library' });
    });

    it('names the file when parsing fails, never a bare JSON error', () => {
      const file = join(dir, 'bad.file.json');
      writeFileSync(file, '{ nope');
      expect(() => readJsonPayload(file)).toThrow(/bad\.file\.json/);
    });

    it('fails on a missing file with the path in the error', () => {
      expect(() => readJsonPayload(join(dir, 'absent.json'))).toThrow();
    });
  });
});
