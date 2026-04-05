/**
 * Type-level tests for Metadata.
 * These files are intentionally never executed — they are compiled with tsc
 * to assert that the type shape is correct.
 */
import type { Metadata } from '../types/index.js';

const baseConfig: Metadata['config'] = {
  processing: { subcomponents: { match: ['{C} / _ / {S}'] }, variantDepth: 9999, details: 'LAYERED' },
  format: { output: 'JSON', keys: 'SAFE', layout: 'LAYOUT', tokens: 'TOKEN' },
  include: { variantNames: false, invalidVariants: false, invalidCombinations: true },
};

// Minimal valid Metadata — license absent (optional field)
const withoutLicense: Metadata = {
  author: 'test',
  lastUpdated: '2026-02-24T00:00:00Z',
  generator: { url: 'https://example.com', version: 1, name: 'test' },
  schema: { url: 'https://example.com/schema', version: '1.0.0' },
  source: { pageId: 'p1', nodeId: 'n1', nodeType: 'COMPONENT' },
  config: baseConfig,
};

// With generator.license present — both subfields required
const withLicense: Metadata = {
  ...withoutLicense,
  generator: {
    url: 'https://example.com',
    version: 1,
    name: 'test',
    license: {
      status: 'VALID',
      level: 'PRO',
    },
  },
};

// status and level are strings
const _status: string = withLicense.generator.license!.status;
const _level: string = withLicense.generator.license!.level;

// generator.license is optional — can be undefined
const _optional: { status: string; level: string } | undefined = withoutLicense.generator.license;

// ─── schema.latest — optional discovery URL (ADR 023) ───────────────────────

// latest is optional — absent is valid
const withoutLatest: Metadata = {
  ...withoutLicense,
  schema: { url: 'https://example.com/schema/v0.13.0/component.schema.json', version: '0.13.0' },
};

// latest can be provided
const withLatest: Metadata = {
  ...withoutLicense,
  schema: { url: 'https://example.com/schema/v0.13.0/component.schema.json', version: '0.13.0', latest: 'https://example.com/schema/main/component.schema.json' },
};

// latest is a string when present
const _latestVal: string | undefined = withLatest.schema.latest;
