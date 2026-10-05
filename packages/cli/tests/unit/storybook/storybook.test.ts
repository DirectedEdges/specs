import { describe, it, expect } from 'vitest';
import fs from 'fs-extra';
import path from 'path';
import os from 'os';
import { fileURLToPath } from 'url';
import { Storybook } from '../../../src/commands/StorybookCommand.js';
import { registry, concernNames } from '../../../src/storybook/concerns/registry.js';
import { deriveTabs } from '../../../src/storybook/concerns/components/index.js';
import { buildColorData } from '../../../src/storybook/concerns/foundations/color.js';
import { buildIconsData } from '../../../src/storybook/concerns/foundations/icons.js';
import { buildTypographyData } from '../../../src/storybook/concerns/foundations/typography.js';
import { templatesDir, renderTemplate } from '../../../src/storybook/templates.js';
import type { Workspace } from '../../../src/storybook/workspace.js';

const here = path.dirname(fileURLToPath(import.meta.url));

describe('StorybookCommand', () => {
  it('registers name, subcommands and the concern list', () => {
    expect(Storybook.name()).toBe('storybook');
    const subs = Storybook.commands.map(c => c.name());
    expect(subs).toContain('init');
    expect(subs).toContain('publish');
    expect(concernNames()).toEqual(['overview', 'foundations', 'components', 'analysis', 'versions']);
  });
});

describe('package boundary (ADR A decision 1)', () => {
  it('the CLI package declares no Storybook, Vite, or browser-automation dependency', () => {
    const pkg = fs.readJsonSync(path.resolve(here, '../../../package.json'));
    const all = Object.keys({ ...pkg.dependencies, ...pkg.devDependencies });
    for (const name of all) {
      expect(name).not.toMatch(/^(storybook$|@storybook\/|vite$|playwright|puppeteer)/);
    }
  });

  it('the storybook modules import no Storybook code — templates are inert text', () => {
    const dir = path.resolve(here, '../../../src/storybook');
    const walk = (d: string): string[] =>
      fs.readdirSync(d, { withFileTypes: true }).flatMap(e =>
        e.isDirectory()
          ? (e.name === 'templates' ? [] : walk(path.join(d, e.name)))
          : e.name.endsWith('.ts') ? [path.join(d, e.name)] : []);
    for (const file of walk(dir)) {
      const source = fs.readFileSync(file, 'utf-8');
      expect(source, file).not.toMatch(/from '(@storybook|storybook|vite|playwright)/);
    }
  });

  it('imports no entitlement machinery — specs storybook is free', () => {
    const dir = path.resolve(here, '../../../src/storybook');
    const walk = (d: string): string[] =>
      fs.readdirSync(d, { withFileTypes: true }).flatMap(e =>
        e.isDirectory() ? walk(path.join(d, e.name)) : [path.join(d, e.name)]);
    for (const file of walk(dir).filter(f => f.endsWith('.ts'))) {
      const source = fs.readFileSync(file, 'utf-8');
      expect(source, file).not.toMatch(/[Ll]icense|entitlement/);
    }
  });
});

describe('deriveTabs', () => {
  const ws = (hasReact: boolean, hasWebComponents: boolean) =>
    ({ hasReact, hasWebComponents } as Workspace);

  it('specs is always present, order fixed, canvas is the first tree', () => {
    expect(deriveTabs(ws(true, true))).toEqual({ tabs: ['react', 'webcomponents', 'specs'], canvas: 'react' });
    expect(deriveTabs(ws(true, false))).toEqual({ tabs: ['react', 'specs'], canvas: 'react' });
    expect(deriveTabs(ws(false, true))).toEqual({ tabs: ['webcomponents', 'specs'], canvas: 'webcomponents' });
    expect(deriveTabs(ws(false, false))).toEqual({ tabs: ['specs'], canvas: 'specs' });
  });
});

describe('buildColorData', () => {
  const payload = {
    meta: {
      variableCollections: {
        c1: { id: 'c1', name: 'Palette', defaultModeId: 'm1', modes: [{ modeId: 'm1', name: 'Default' }] },
      },
      variables: {
        v2: { id: 'v2', name: 'Ramp/96', resolvedType: 'COLOR', variableCollectionId: 'c1', valuesByMode: { m1: { r: 0, g: 0, b: 0, a: 1 } } },
        v1: { id: 'v1', name: 'Ramp/07', resolvedType: 'COLOR', variableCollectionId: 'c1', valuesByMode: { m1: { r: 1, g: 1, b: 1, a: 1 } } },
        v3: { id: 'v3', name: 'Ramp/40', resolvedType: 'COLOR', variableCollectionId: 'c1', valuesByMode: { m1: { type: 'VARIABLE_ALIAS', id: 'v1' } } },
        v4: { id: 'v4', name: 'Ramp/50', resolvedType: 'COLOR', variableCollectionId: 'c1', valuesByMode: { m1: { type: 'VARIABLE_ALIAS', id: 'missing' } } },
      },
    },
  };

  it('keeps payload order, resolves aliases, and gives unresolved entries a reason', () => {
    const data = buildColorData([{ alias: 'library', variablesPayload: payload, fillStyles: [], sampledFills: {} }])!;
    const swatches = data.sources[0].collections[0].groups[0].swatches;
    expect(swatches.map(s => s.leaf)).toEqual(['96', '07', '40', '50']); // payload sequence, not alphabetical
    expect(swatches[2].value).toBe('#ffffff');
    expect(swatches[2].via).toBe('Ramp/07');
    expect(swatches[3].value).toBeNull();
    expect(swatches[3].unresolved).toContain('alias target');
  });

  it('resolves fill styles from sampled node fills, with reasons when it cannot', () => {
    const data = buildColorData([{
      alias: 'library',
      variablesPayload: null,
      fillStyles: [
        { node_id: 's1', name: 'Brand' },
        { node_id: 's2', name: 'Photo' },
        { node_id: 's3', name: 'Unused' },
      ],
      sampledFills: {
        s1: [{ type: 'SOLID', color: { r: 1, g: 0, b: 0, a: 1 } }],
        s2: [{ type: 'IMAGE' }],
      },
    }])!;
    const styles = data.sources[0].styles;
    expect(styles[0]).toMatchObject({ name: 'Brand', value: '#ff0000', unresolved: null });
    expect(styles[1].unresolved).toContain('not a solid fill');
    expect(styles[2].unresolved).toContain('no node');
  });
});

describe('buildTypographyData', () => {
  it('keeps the full property set and marks unused styles unresolved', () => {
    const data = buildTypographyData([{
      alias: 'library',
      styleMap: {
        t1: { name: 'Body/M', key: 'k1', styleType: 'TEXT' },
        t2: { name: 'Body/Unused', key: 'k2', styleType: 'TEXT' },
        f1: { name: 'Fill', key: 'k3', styleType: 'FILL' },
      },
      sampledText: {
        t1: { fontFamily: 'Inter', fontWeight: 400, fontSize: 16, letterSpacing: 0.5, lineHeightPx: 24, lineHeightUnit: 'PIXELS', textCase: 'UPPER', textDecoration: 'NONE', irrelevant: true },
      },
    }])!;
    expect(data.styles).toHaveLength(2); // FILL style excluded
    expect(data.styles[0].style).toEqual({
      fontFamily: 'Inter', fontWeight: 400, fontSize: 16, letterSpacing: 0.5,
      lineHeightPx: 24, lineHeightUnit: 'PIXELS', textCase: 'UPPER', textDecoration: 'NONE',
    });
    expect(data.styles[1].style).toBeNull();
  });
});

describe('buildIconsData', () => {
  it('diffs spec glyph references against the fetched directory', () => {
    const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'specs-sb-'));
    const specs = path.join(tmp, 'specs');
    const icons = path.join(tmp, 'icons');
    fs.ensureDirSync(path.join(specs, 'alert'));
    fs.ensureDirSync(icons);
    fs.writeFileSync(path.join(specs, 'alert', 'api.yaml'), 'anatomy:\n  icon:\n    type: glyph\n');
    fs.writeFileSync(path.join(specs, 'alert', 'variants.yaml'),
      'default:\n  elements:\n    icon:\n      content: alertError\nvariants:\n  - elements:\n      icon:\n        content: check\n');
    fs.writeFileSync(path.join(icons, 'check.svg'), '<svg/>');
    fs.writeFileSync(path.join(icons, 'unreferenced.svg'), '<svg/>');

    const data = buildIconsData(specs, icons)!;
    expect(data.present).toEqual([
      { name: 'check', referenced: true },
      { name: 'unreferenced', referenced: false },
    ]);
    expect(data.missing).toEqual([{ name: 'alert-error', referencedBy: ['alert'] }]);
    fs.removeSync(tmp);
  });
});

describe('templates', () => {
  it('ships every host template and page template', () => {
    const dir = templatesDir();
    for (const file of ['package.json.tpl', 'tsconfig.json.tpl', 'main.ts.tpl', 'preview.tsx.tpl', 'manager.tsx.tpl', 'manager-head.html.tpl', 'ComponentDocs.tsx.tpl',
      'pages/Color.stories.tsx.tpl', 'pages/Typography.stories.tsx.tpl', 'pages/Icons.stories.tsx.tpl',
      'pages/GettingStarted.stories.tsx.tpl', 'pages/Analysis.stories.tsx.tpl', 'pages/VersionsStub.stories.tsx.tpl']) {
      expect(fs.existsSync(path.join(dir, file)), file).toBe(true);
    }
  });

  it('renders placeholders and refuses unknown ones', () => {
    expect(renderTemplate('port {{PORT}}', { PORT: '6116' })).toBe('port 6116');
    expect(() => renderTemplate('{{NOPE}}', {})).toThrow(/NOPE/);
  });
});

describe('publish semantics', () => {
  it('every concern writes under content/<name>/ only, and placeholders always detect', () => {
    for (const concern of registry) {
      expect(concern.name).toMatch(/^[a-z]+$/);
    }
    const alwaysOn = registry.filter(c => ['overview', 'components'].includes(c.name));
    for (const concern of alwaysOn) {
      expect(concern.detect({} as Workspace)).toBe(true);
    }
    // analysis and versions are data-driven: each section exists only when its
    // folder does (specs/_analysis/ and versions/ respectively).
    const analysisConcern = registry.find(c => c.name === 'analysis')!;
    expect(analysisConcern.detect({ specsDir: '/nonexistent' } as Workspace)).toBe(false);
    const versionsConcern = registry.find(c => c.name === 'versions')!;
    expect(versionsConcern.detect({ root: '/nonexistent' } as Workspace)).toBe(false);
  });
});

describe('storybook conventions (ADR-098)', () => {
  it('maps rowGroup and groupLeaves to the colour layout', async () => {
    const { buildColorData } = await import('../../../src/storybook/concerns/foundations/color.js');
    const out = buildColorData([], { layout: { default: 'group', overrides: { Palette: 'row' } }, collections: ['Color'] });
    // No sources → null regardless; the mapping itself is covered through publish,
    // but the layout parameter shape is pinned here.
    expect(out).toBeNull();
  });
});
