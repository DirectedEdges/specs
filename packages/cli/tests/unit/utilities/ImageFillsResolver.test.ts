/**
 * ImageFillsResolver unit tests (ADR-063 --get-images)
 * Covers the pure pieces: placeholder collection, registry rewriting, and
 * magic-byte extension detection. Network/file steps are exercised by the
 * integration path.
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import fs from 'fs-extra';
import path from 'path';
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

  it('collects from subcomponent registries too', () => {
    const spec = {
      title: 'Main',
      images: { root: 'figma:hash-main' },
      subcomponents: {
        media: { title: 'Main / Media', images: { root: 'figma:hash-sub' } },
      },
    } as Record<string, unknown>;
    expect(ImageFillsResolver.collectPlaceholderHashes([{ spec }])).toEqual(new Set(['hash-main', 'hash-sub']));
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

  it('rewrites subcomponent registry values too', () => {
    const spec = {
      images: { root: 'figma:hash-main' },
      subcomponents: {
        media: { images: { root: 'figma:hash-sub' } },
      },
    } as Record<string, unknown>;
    const count = ImageFillsResolver.rewritePlaceholders(
      [{ spec }],
      new Map([['hash-main', 'hash-main.png'], ['hash-sub', 'hash-sub.jpg']]),
      `${IMAGES_DIR_NAME}/`
    );
    expect(count).toBe(2);
    expect((spec.subcomponents as Record<string, { images: Record<string, string> }>).media.images.root)
      .toBe('_images/hash-sub.jpg');
  });

  it('does not touch already-resolved values', () => {
    const a = component({ hero: '_images/hash-1.png' });
    const count = ImageFillsResolver.rewritePlaceholders([a], new Map([['hash-1', 'hash-1.png']]), `${IMAGES_DIR_NAME}/`);
    expect(count).toBe(0);
    expect((a.spec.images as Record<string, string>).hero).toBe('_images/hash-1.png');
  });
});

describe('ImageFillsResolver.findExisting', () => {
  let testDir: string;

  beforeEach(() => {
    testDir = path.join(process.cwd(), 'tests', 'tmp', `images-${Date.now()}`);
    fs.ensureDirSync(path.join(testDir, IMAGES_DIR_NAME));
  });

  afterEach(() => {
    fs.removeSync(testDir);
  });

  it('reuses hash-named files already in _images/, regardless of extension', async () => {
    fs.writeFileSync(path.join(testDir, IMAGES_DIR_NAME, 'hash-1.png'), 'x');
    fs.writeFileSync(path.join(testDir, IMAGES_DIR_NAME, 'hash-2.jpg'), 'x');

    const existing = await ImageFillsResolver.findExisting(new Set(['hash-1', 'hash-2', 'hash-3']), testDir);
    expect(existing).toEqual(new Map([
      ['hash-1', 'hash-1.png'],
      ['hash-2', 'hash-2.jpg'],
    ]));
  });

  it('returns empty when _images/ does not exist', async () => {
    const existing = await ImageFillsResolver.findExisting(new Set(['hash-1']), path.join(testDir, 'nowhere'));
    expect(existing.size).toBe(0);
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
