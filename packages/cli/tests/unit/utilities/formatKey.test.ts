import { describe, it, expect } from 'vitest';
import { formatKey } from '../../../src/utilities/formatKey.js';

/**
 * `formatKey` is a deliberate duplicate of `Utilities.formatKey` in specs-from-figma, which
 * the CLI cannot import. These cases pin the behaviour: if the two drift, the bridge's
 * component lookups silently stop matching rather than failing, so the drift has to be
 * caught here.
 */
describe('formatKey', () => {
  describe('CAMEL', () => {
    it('lowercases the first word and TitleCases the rest', () => {
      expect(formatKey('Action 1 appearance', 'CAMEL')).toBe('action1Appearance');
      expect(formatKey('Header overlaid', 'CAMEL')).toBe('headerOverlaid');
    });

    it('treats "/" as a word separator, which is why the transform has no inverse', () => {
      expect(formatKey('DS Link/On overlay/M/False/Rest/Start', 'CAMEL')).toBe('dsLinkOnOverlayMFalseRestStart');
      expect(formatKey('DS Toolbar/Android/S/Close/True/Base/Tertiary', 'CAMEL')).toBe('dsToolbarAndroidSCloseTrueBaseTertiary');
    });

    it('collapses distinct names onto the same key — the reason matching is done forward', () => {
      expect(formatKey('DS Link/On overlay/M', 'CAMEL')).toBe(formatKey('DS Link On Overlay M', 'CAMEL'));
      expect(formatKey('DS Link-On_overlay M', 'CAMEL')).toBe(formatKey('DS Link/On/overlay/M', 'CAMEL'));
    });

    it('lowercases only the first character of a single word, preserving camelCase input', () => {
      expect(formatKey('effectStyle', 'CAMEL')).toBe('effectStyle');
      expect(formatKey('Button', 'CAMEL')).toBe('button');
    });

    it('lowercases the tail of each subsequent word', () => {
      expect(formatKey('DS CARD header', 'CAMEL')).toBe('dsCardHeader');
    });
  });

  describe('other formats', () => {
    const name = 'DS Card /_ / Header';

    it('SAFE strips unsafe characters and keeps everything else', () => {
      expect(formatKey('Card "A" [1].b', 'SAFE')).toBe('Card A 1b');
      expect(formatKey(name, 'SAFE')).toBe(name);
    });

    it('SNAKE, KEBAB, PASCAL and TRAIN work from the same word split', () => {
      expect(formatKey('Header overlaid', 'SNAKE')).toBe('header_overlaid');
      expect(formatKey('Header overlaid', 'KEBAB')).toBe('header-overlaid');
      expect(formatKey('Header overlaid', 'PASCAL')).toBe('HeaderOverlaid');
      expect(formatKey('Header overlaid', 'TRAIN')).toBe('Header-Overlaid');
    });

    it('defaults to SAFE when the format is unset or unknown', () => {
      expect(formatKey('Header overlaid')).toBe('Header overlaid');
      expect(formatKey('Header overlaid', 'NONSENSE')).toBe('Header overlaid');
    });

    it('accepts lowercase format names', () => {
      expect(formatKey('Header overlaid', 'camel')).toBe('headerOverlaid');
    });
  });

  describe('edge cases', () => {
    it('returns an empty string when nothing survives the split', () => {
      expect(formatKey('///', 'CAMEL')).toBe('');
      expect(formatKey('   ', 'CAMEL')).toBe('');
      expect(formatKey('', 'CAMEL')).toBe('');
    });

    it('drops non-alphanumeric characters inside words', () => {
      expect(formatKey('Size=M, State=Rest', 'CAMEL')).toBe('sizeMStateRest');
    });
  });
});
