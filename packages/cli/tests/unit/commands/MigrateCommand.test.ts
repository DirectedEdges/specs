/**
 * MigrateCommand unit tests
 *
 * Covers `specs migrate config` (v1 → v2, ADR-071) and the underlying
 * `migrateConfigV1` mapping: every member of the pre-split
 * `specs.config.yaml` shape lands in the right split file — conventions,
 * settings, or pipeline. These mappings used to be exercised through the
 * loader's in-memory migration; the loader now refuses legacy files
 * (ConfigLoader.test.ts) and the mapping lives here.
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import fs from 'fs-extra';
import path from 'path';
import yaml from 'yaml';
import { Migrate } from '../../../src/commands/MigrateCommand.js';
import { migrateConfigV1 } from '../../../src/Config/migrations/configV1.js';
import { ConfigLoader } from '../../../src/Config/ConfigLoader.js';

describe('migrateConfigV1 (config v1 → v2 mapping)', () => {
  beforeEach(() => {
    vi.spyOn(console, 'warn').mockImplementation(() => {});
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('returns nothing for an empty source (no section configured, no file written)', () => {
    const result = migrateConfigV1({});
    expect(result.conventions).toBeUndefined();
    expect(result.settings).toBeUndefined();
    expect(result.pipeline).toBeUndefined();
  });

  it('maps dataDirectory to settings.data.directory', () => {
    const result = migrateConfigV1({ dataDirectory: './data-in' });
    expect(result.settings).toEqual({ data: { directory: './data-in' } });
  });

  it('maps outputDirectory to settings.spec.directory', () => {
    const result = migrateConfigV1({ outputDirectory: './specs-out' });
    expect(result.settings).toEqual({ spec: { directory: './specs-out' } });
  });

  it('maps author to settings.author', () => {
    const result = migrateConfigV1({ author: 'Test Author' });
    expect(result.settings).toEqual({ author: 'Test Author' });
  });

  it('supports deprecated sourceDirectory as dataDirectory (with warning)', () => {
    const warn = vi.mocked(console.warn);
    const result = migrateConfigV1({ sourceDirectory: './old-data' });
    expect(result.settings).toEqual({ data: { directory: './old-data' } });
    expect(warn).toHaveBeenCalledWith(expect.stringContaining("'sourceDirectory' is deprecated"));
  });

  it('prefers dataDirectory over sourceDirectory when both are present', () => {
    const warn = vi.mocked(console.warn);
    const result = migrateConfigV1({ dataDirectory: './new', sourceDirectory: './old' });
    expect(result.settings).toEqual({ data: { directory: './new' } });
    expect(warn).not.toHaveBeenCalled();
  });

  it("maps sources, renaming each source's data array to fetch", () => {
    const result = migrateConfigV1({
      sources: {
        library: { key: 'ABC123', data: ['file', 'variables', 'styles'] },
        icons: { key: 'DEF456' },
      },
    });
    expect(result.settings).toEqual({
      data: {
        sources: {
          library: { key: 'ABC123', fetch: ['file', 'variables', 'styles'] },
          icons: { key: 'DEF456' },
        },
      },
    });
  });

  it('maps output split flags into settings.spec', () => {
    const result = migrateConfigV1({
      output: { splitComponents: true, splitConcerns: true, useSubfolders: true },
    });
    expect(result.settings).toEqual({
      spec: { splitComponents: true, splitConcerns: true, useSubfolders: true },
    });
  });

  it('maps config.format.output to settings.spec.format and passes keys/layout/tokens/color through', () => {
    const result = migrateConfigV1({
      config: {
        format: { output: 'YAML', keys: 'SNAKE', layout: 'BOTH', tokens: 'TOKEN_NAME', color: 'HEXA' },
      },
    });
    expect(result.settings).toEqual({
      spec: { format: 'YAML', keys: 'SNAKE', layout: 'BOTH', tokens: 'TOKEN_NAME', color: 'HEXA' },
    });
  });

  it('maps config.format.figmaKeys to conventions.figma.naming', () => {
    const result = migrateConfigV1({ config: { format: { figmaKeys: 'SENTENCE' } } });
    expect(result.conventions).toEqual({ figma: { naming: 'SENTENCE' } });
  });

  it('maps processing.glyphNamePattern to conventions.figma.glyphs.match', () => {
    const result = migrateConfigV1({ config: { processing: { glyphNamePattern: 'DS Icon Glyph /' } } });
    expect(result.conventions).toEqual({ figma: { glyphs: { match: 'DS Icon Glyph /' } } });
  });

  it('maps processing.codeOnlyPropsPattern to conventions.figma.codeOnlyProps.match', () => {
    const result = migrateConfigV1({ config: { processing: { codeOnlyPropsPattern: '^_' } } });
    expect(result.conventions).toEqual({ figma: { codeOnlyProps: { match: '^_' } } });
  });

  it('maps processing.images.imageComponent to conventions.figma.images.match', () => {
    const result = migrateConfigV1({
      config: {
        processing: {
          images: { imageComponent: 'DS Image', backgroundImage: true, sourceProps: ['imageSource'] },
        },
      },
    });
    expect(result.conventions).toEqual({
      figma: { images: { match: 'DS Image', backgroundImage: true, sourceProps: ['imageSource'] } },
    });
  });

  it('maps processing states/subcomponents/instanceExamples/slotConstraints/inferNumberProps to conventions.figma', () => {
    const states = { interaction: ['hover', 'pressed'] };
    const subcomponents = { match: ['{C} / {S}'] };
    const instanceExamples = { scope: 'FILE', match: ['{C} / Examples / {S}'] };
    const result = migrateConfigV1({
      config: {
        processing: {
          states,
          subcomponents,
          instanceExamples,
          slotConstraints: true,
          inferNumberProps: true,
        },
      },
    });
    expect(result.conventions).toEqual({
      figma: { states, subcomponents, instanceExamples, slotConstraints: true, inferNumberProps: true },
    });
  });

  it('maps processing variantDepth/details/collapsePrimitiveWrapper to settings.spec', () => {
    const result = migrateConfigV1({
      config: { processing: { variantDepth: 2, details: 'FULL', collapsePrimitiveWrapper: true } },
    });
    expect(result.settings).toEqual({
      spec: { variantDepth: 2, details: 'FULL', collapsePrimitiveWrapper: true },
    });
  });

  it('maps the config.include allowlist to settings.spec', () => {
    const result = migrateConfigV1({
      config: {
        include: {
          invalidVariants: false,
          invalidCombinations: true,
          emptyVariants: false,
          defaultSlotContent: true,
        },
      },
    });
    expect(result.settings).toEqual({
      spec: {
        invalidVariants: false,
        invalidCombinations: true,
        emptyVariants: false,
        defaultSlotContent: true,
      },
    });
  });

  it('strips unknown include keys (EOLed allowlist: imageData, instanceExamples)', () => {
    const result = migrateConfigV1({
      config: { include: { defaultSlotContent: true, imageData: true, instanceExamples: true } },
    });
    expect(result.settings).toEqual({ spec: { defaultSlotContent: true } });
    expect(result.conventions).toBeUndefined();
  });

  it('maps config.transformers to pipeline.transformers', () => {
    const result = migrateConfigV1({
      config: { transformers: [{ name: 'contract' }, { name: 'css', rules: ['layout'] }] },
    });
    expect(result.pipeline).toEqual({
      transformers: [{ name: 'contract' }, { name: 'css', rules: ['layout'] }],
    });
  });

  it('omits pipeline when the source declares no transformers', () => {
    const result = migrateConfigV1({ author: 'Test Author' });
    expect(result.pipeline).toBeUndefined();
  });
});

describe('MigrateCommand (specs migrate)', () => {
  let testDir: string;

  beforeEach(() => {
    testDir = path.join(process.cwd(), 'tests', 'tmp', `test-migrate-${Date.now()}`);
    fs.ensureDirSync(testDir);

    vi.spyOn(process, 'cwd').mockReturnValue(testDir);
    vi.spyOn(console, 'log').mockImplementation(() => {});
    vi.spyOn(console, 'warn').mockImplementation(() => {});
    vi.spyOn(console, 'error').mockImplementation(() => {});
    vi.spyOn(process, 'exit').mockImplementation((code?: number | string | null) => {
      throw new Error(`process.exit:${code}`);
    });

    // Commander accumulates option state across parses; reset between tests.
    Migrate.setOptionValue('from', undefined);
    Migrate.setOptionValue('dryRun', undefined);
    Migrate.setOptionValue('list', undefined);
    Migrate.setOptionValue('source', undefined);
  });

  afterEach(() => {
    vi.restoreAllMocks();
    if (fs.existsSync(testDir)) {
      fs.removeSync(testDir);
    }
  });

  /** Run `specs migrate <args>` against the mocked cwd. */
  async function runMigrate(...args: string[]) {
    await Migrate.parseAsync(['node', 'specs', ...args]);
  }

  /** All console.log output, joined. */
  function logged(): string {
    return vi.mocked(console.log).mock.calls.map(args => args.join(' ')).join('\n');
  }

  const LEGACY_FULL = `
dataDirectory: ./data-in
outputDirectory: ./specs-out
author: Test Author
config:
  format:
    figmaKeys: SENTENCE
  processing:
    variantDepth: 2
  transformers:
    - name: contract
`;

  it('writes the three files and renames the source to specs.config.yaml.migrated', async () => {
    fs.writeFileSync(path.join(testDir, 'specs.config.yaml'), LEGACY_FULL);

    await runMigrate('config');

    const conventions = yaml.parse(fs.readFileSync(path.join(testDir, 'config', 'conventions.yaml'), 'utf-8'));
    const settings = yaml.parse(fs.readFileSync(path.join(testDir, 'config', 'settings.yaml'), 'utf-8'));
    const pipeline = yaml.parse(fs.readFileSync(path.join(testDir, 'config', 'pipeline.yaml'), 'utf-8'));

    expect(conventions).toEqual({ figma: { naming: 'SENTENCE' } });
    expect(settings).toEqual({
      author: 'Test Author',
      data: { directory: './data-in' },
      spec: { directory: './specs-out', variantDepth: 2 },
    });
    expect(pipeline).toEqual({ transformers: [{ name: 'contract' }] });

    // Discovery must stop finding the source: renamed, not left in place.
    expect(fs.existsSync(path.join(testDir, 'specs.config.yaml'))).toBe(false);
    expect(fs.existsSync(path.join(testDir, 'specs.config.yaml.migrated'))).toBe(true);
    expect(fs.readFileSync(path.join(testDir, 'specs.config.yaml.migrated'), 'utf-8')).toBe(LEGACY_FULL);
  });

  it('renames a JSON source to specs.config.json.migrated', async () => {
    fs.writeFileSync(
      path.join(testDir, 'specs.config.json'),
      JSON.stringify({ author: 'Test Author' })
    );

    await runMigrate('config');

    expect(fs.existsSync(path.join(testDir, 'specs.config.json'))).toBe(false);
    expect(fs.existsSync(path.join(testDir, 'specs.config.json.migrated'))).toBe(true);
    const settings = yaml.parse(fs.readFileSync(path.join(testDir, 'config', 'settings.yaml'), 'utf-8'));
    expect(settings).toEqual({ author: 'Test Author' });
  });

  it('--dry-run writes nothing and renames nothing', async () => {
    fs.writeFileSync(path.join(testDir, 'specs.config.yaml'), LEGACY_FULL);

    await runMigrate('config', '--dry-run');

    expect(fs.existsSync(path.join(testDir, 'config'))).toBe(false);
    expect(fs.existsSync(path.join(testDir, 'specs.config.yaml'))).toBe(true);
    expect(fs.existsSync(path.join(testDir, 'specs.config.yaml.migrated'))).toBe(false);
    expect(logged()).toContain('Would write: config/conventions.yaml');
    expect(logged()).toContain('Would write: config/settings.yaml');
    expect(logged()).toContain('Would write: config/pipeline.yaml');
    expect(logged()).toContain('Would rename: specs.config.yaml → specs.config.yaml.migrated');
  });

  it.each(['conventions.yaml', 'settings.yaml', 'pipeline.yaml'])(
    'refuses (and writes nothing) when config/%s already exists',
    async existing => {
      fs.writeFileSync(path.join(testDir, 'specs.config.yaml'), LEGACY_FULL);
      fs.ensureDirSync(path.join(testDir, 'config'));
      fs.writeFileSync(path.join(testDir, 'config', existing), '# authored\n');

      await expect(runMigrate('config')).rejects.toThrow('process.exit:2');

      // Nothing written, nothing renamed
      expect(fs.readdirSync(path.join(testDir, 'config'))).toEqual([existing]);
      expect(fs.readFileSync(path.join(testDir, 'config', existing), 'utf-8')).toBe('# authored\n');
      expect(fs.existsSync(path.join(testDir, 'specs.config.yaml'))).toBe(true);
      expect(fs.existsSync(path.join(testDir, 'specs.config.yaml.migrated'))).toBe(false);
      expect(console.error).toHaveBeenCalledWith(expect.stringContaining('already contains'));
    }
  );

  it('writes no file for a section absent from the source (no transformers → no pipeline.yaml)', async () => {
    fs.writeFileSync(path.join(testDir, 'specs.config.yaml'), 'author: Test Author\n');

    await runMigrate('config');

    expect(fs.existsSync(path.join(testDir, 'config', 'settings.yaml'))).toBe(true);
    expect(fs.existsSync(path.join(testDir, 'config', 'conventions.yaml'))).toBe(false);
    expect(fs.existsSync(path.join(testDir, 'config', 'pipeline.yaml'))).toBe(false);
  });

  it('reports nothing to migrate when no legacy file exists', async () => {
    await runMigrate('config');
    expect(logged()).toContain('Nothing to migrate');
    expect(fs.existsSync(path.join(testDir, 'config'))).toBe(false);
  });

  it('exits for an unknown subject', async () => {
    await expect(runMigrate('nonsense')).rejects.toThrow('process.exit:2');
    expect(console.error).toHaveBeenCalledWith(
      expect.stringContaining("no migrations registered for 'nonsense'")
    );
  });

  it('exits for an unregistered source version', async () => {
    fs.writeFileSync(path.join(testDir, 'specs.config.yaml'), LEGACY_FULL);
    await expect(runMigrate('config', '--from', 'v9')).rejects.toThrow('process.exit:2');
    expect(console.error).toHaveBeenCalledWith(
      expect.stringContaining("no 'config' migration from 'v9'")
    );
  });

  it('round-trip: migrated output loads to the same resolved config the legacy file meant', async () => {
    fs.writeFileSync(path.join(testDir, 'specs.config.yaml'), `
dataDirectory: ./data-in
outputDirectory: ./specs-out
author: Test Author
sources:
  library:
    key: ABC123
    data: [file, variables, styles]
output:
  splitComponents: true
  useSubfolders: true
config:
  format:
    output: YAML
    keys: SNAKE
    figmaKeys: SENTENCE
  processing:
    variantDepth: 2
    details: FULL
    glyphNamePattern: 'DS Icon Glyph /'
    codeOnlyPropsPattern: '^_'
    slotConstraints: true
    subcomponents:
      match:
        - "{C} / {S}"
    instanceExamples:
      scope: FILE
      match:
        - "{C} / Examples / {S}"
    images:
      imageComponent: DS Image
      backgroundImage: true
      sourceProps: [imageSource]
  include:
    invalidVariants: false
    defaultSlotContent: true
  transformers:
    - name: contract
`);

    await runMigrate('config');

    const config = new ConfigLoader().load();

    // settings — directories resolve against the workspace root, exactly as
    // they did when the legacy file sat there
    expect(config.settings.author).toBe('Test Author');
    expect(config.settings.data?.directory).toBe(path.resolve(testDir, 'data-in'));
    expect(config.settings.spec.directory).toBe(path.resolve(testDir, 'specs-out'));
    expect(config.settings.data?.sources).toEqual({
      library: { key: 'ABC123', fetch: ['file', 'variables', 'styles'] },
    });
    expect(config.settings.spec.splitComponents).toBe(true);
    expect(config.settings.spec.useSubfolders).toBe(true);
    expect(config.settings.spec.format).toBe('YAML');
    expect(config.settings.spec.keys).toBe('SNAKE');
    expect(config.settings.spec.variantDepth).toBe(2);
    expect(config.settings.spec.details).toBe('FULL');
    expect(config.settings.spec.invalidVariants).toBe(false);
    expect(config.settings.spec.defaultSlotContent).toBe(true);
    expect(config.configDir).toBe(testDir);

    // conventions
    expect(config.conventions.figma.naming).toBe('SENTENCE');
    expect(config.conventions.figma.glyphs).toEqual({ match: 'DS Icon Glyph /' });
    expect(config.conventions.figma.codeOnlyProps).toEqual({ match: '^_' });
    expect(config.conventions.figma.slotConstraints).toBe(true);
    expect(config.conventions.figma.subcomponents).toEqual({ scope: 'NESTED', match: ['{C} / {S}'] });
    expect(config.conventions.figma.instanceExamples).toEqual({
      scope: 'FILE',
      match: ['{C} / Examples / {S}'],
    });
    expect(config.conventions.figma.images).toEqual({
      backgroundImage: true,
      match: 'DS Image',
      sourceProps: ['imageSource'],
    });

    // pipeline
    expect(config.pipeline.transformers).toEqual([{ name: 'contract' }]);
    expect(config.pipeline.analyses).toEqual([]);
  });
});

describe('MigrateCommand — --source (a file discovery would not find)', () => {
  let testDir: string;

  beforeEach(() => {
    testDir = path.join(process.cwd(), 'tests', 'tmp', `test-migrate-source-${Date.now()}`);
    fs.ensureDirSync(testDir);
    vi.spyOn(process, 'cwd').mockReturnValue(testDir);
    vi.spyOn(console, 'log').mockImplementation(() => {});
    vi.spyOn(console, 'error').mockImplementation(() => {});
    vi.spyOn(process, 'exit').mockImplementation((code?: number | string | null) => {
      throw new Error(`process.exit:${code}`);
    });
    Migrate.setOptionValue('from', undefined);
    Migrate.setOptionValue('dryRun', undefined);
    Migrate.setOptionValue('list', undefined);
    Migrate.setOptionValue('source', undefined);
  });

  afterEach(() => {
    vi.restoreAllMocks();
    if (fs.existsSync(testDir)) fs.removeSync(testDir);
  });

  it('converts a custom-named file and renames it', async () => {
    fs.writeFileSync(
      path.join(testDir, 'custom-config.yaml'),
      'dataDirectory: ./data\nconfig:\n  format:\n    keys: CAMEL\n'
    );

    await Migrate.parseAsync(['node', 'specs', 'config', '--source', 'custom-config.yaml']);

    expect(fs.existsSync(path.join(testDir, 'config', 'settings.yaml'))).toBe(true);
    expect(fs.existsSync(path.join(testDir, 'custom-config.yaml.migrated'))).toBe(true);
    expect(fs.existsSync(path.join(testDir, 'custom-config.yaml'))).toBe(false);
  });

  it('reports nothing to migrate when the named file does not exist', async () => {
    await Migrate.parseAsync(['node', 'specs', 'config', '--source', 'absent.yaml']);

    expect(fs.existsSync(path.join(testDir, 'config'))).toBe(false);
    expect(console.log).toHaveBeenCalledWith(expect.stringContaining('absent.yaml does not exist'));
  });
});

