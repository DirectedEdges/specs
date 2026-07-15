/**
 * ImageFillsResolver unit tests (ADR-063 --get-images)
 * Covers the pure pieces: placeholder collection, registry rewriting, and
 * magic-byte extension detection. Network/file steps are exercised by the
 * integration path.
 */

import { describe, it, expect } from 'vitest';
import { ImageFillsResolver, IMAGES_DIR_NAME } from '../../../src/utilities/ImageFillsResolver.js';

function component(images?: Record<string, string>): { spec: Record<string, unknown> } {
  return { spec: images ? { title: 'X', images } : { title: 'X' } };
}

describe('ImageFillsResolver.collectPlaceholderHashes', () => {
  it('collects distinct hashes across components', () => {
    const hashes = ImageFillsResolver.collectPlaceholderHashes([
      component({ a: 'figma:hash-1', b: 'figma:hash-2' }),
      component({ c: 'figma:hash-1' }),
      component(),
    ]);
    expect(hashes).toEqual(new Set(['hash-1', 'hash-2']));
  });

  it('ignores already-resolved values', () => {
    const hashes = ImageFillsResolver.collectPlaceholderHashes([
      component({ a: '_images/hash-1.png', b: 'figma:hash-2' }),
    ]);
    expect(hashes).toEqual(new Set(['hash-2']));
  });
});

describe('ImageFillsResolver.rewritePlaceholders', () => {
  it('rewrites placeholders to prefixed filenames and leaves unresolved ones', () => {
    const a = component({ hero: 'figma:hash-1', banner: 'figma:missing' });
    const count = ImageFillsResolver.rewritePlaceholders(
      [a],
      new Map([['hash-1', 'hash-1.png']]),
      `${IMAGES_DIR_NAME}/`
    );
    expect(count).toBe(1);
    expect(a.spec.images).toEqual({
      hero: '_images/hash-1.png',
      banner: 'figma:missing',
    });
  });

  it('uses the subfolder prefix when spec files live one level down', () => {
    const a = component({ hero: 'figma:hash-1' });
    ImageFillsResolver.rewritePlaceholders([a], new Map([['hash-1', 'hash-1.jpg']]), `../${IMAGES_DIR_NAME}/`);
    expect((a.spec.images as Record<string, string>).hero).toBe('../_images/hash-1.jpg');
  });

  it('does not touch already-resolved values', () => {
    const a = component({ hero: '_images/hash-1.png' });
    const count = ImageFillsResolver.rewritePlaceholders([a], new Map([['hash-1', 'hash-1.png']]), `${IMAGES_DIR_NAME}/`);
    expect(count).toBe(0);
    expect((a.spec.images as Record<string, string>).hero).toBe('_images/hash-1.png');
  });
});

describe('ImageFillsResolver.detectExtension', () => {
  it('detects PNG', () => {
    expect(ImageFillsResolver.detectExtension(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]))).toBe('png');
  });

  it('detects JPEG', () => {
    expect(ImageFillsResolver.detectExtension(Buffer.from([0xff, 0xd8, 0xff, 0xe0]))).toBe('jpg');
  });

  it('detects GIF', () => {
    expect(ImageFillsResolver.detectExtension(Buffer.from('GIF89a'))).toBe('gif');
  });

  it('detects WebP', () => {
    const webp = Buffer.concat([Buffer.from('RIFF'), Buffer.from([0, 0, 0, 0]), Buffer.from('WEBP')]);
    expect(ImageFillsResolver.detectExtension(webp)).toBe('webp');
  });

  it('falls back to png for unknown bytes', () => {
    expect(ImageFillsResolver.detectExtension(Buffer.from('not an image'))).toBe('png');
  });
});
