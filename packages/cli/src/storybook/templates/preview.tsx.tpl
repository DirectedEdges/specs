// Scaffolded by `specs storybook init`. Yours after that — publish never
// touches it.
import type { Preview } from '@storybook/react';
import { addons } from 'storybook/internal/preview-api';
import { ComponentDocs } from './ComponentDocs.js';
{{CSSVARS_IMPORT}}
// Mode toolbar controls (specs#636): published from conventions/storybook.yaml
// `modes.collections`, driving the attributes the emitted stylesheet switches on.
import modesJson from '../content/components/modes.json';

interface ModeControl {
  name: string;
  attr: string;
  modes: Array<{ name: string; value: string }>;
  default: string;
}
const modeControls: ModeControl[] = (modesJson as { controls: ModeControl[] }).controls ?? [];

const globalTypes: NonNullable<Preview['globalTypes']> = {};
for (const control of modeControls) {
  globalTypes[`mode_${control.attr}`] = {
    description: `${control.name} mode`,
    toolbar: {
      title: control.name,
      icon: 'paintbrush',
      dynamicTitle: true,
      items: control.modes.map((m) => ({ value: m.value, title: m.name })),
    },
  };
}

const initialGlobals: Record<string, string> = {};
for (const control of modeControls) {
  const def = control.modes.find((m) => m.name === control.default);
  initialGlobals[`mode_${control.attr}`] = def?.value ?? control.modes[0].value;
}

/** Apply each selected mode as its attribute on <html>; the default clears it. */
const applyModes = (globals: Record<string, string>) => {
  for (const control of modeControls) {
    const value = globals[`mode_${control.attr}`];
    const def = control.modes.find((m) => m.name === control.default)?.value;
    const root = document.documentElement;
    if (!value || value === def) root.removeAttribute(control.attr);
    else root.setAttribute(control.attr, value);
  }
};

// Globals reach a *story* through decorators, but a custom docs page (the
// generated foundations and analysis pages) renders no story — so modes are
// applied off the channel, which fires on every toolbar change regardless of
// what the page shows.
if (modeControls.length) {
  applyModes(initialGlobals);
  addons.getChannel().on('globalsUpdated', ({ globals }: { globals: Record<string, string> }) => applyModes(globals));
}

const withModes = (Story: any, context: { globals: Record<string, string> }) => {
  applyModes(context.globals);
  return Story();
};

const preview: Preview = {
  ...(modeControls.length ? { globalTypes, initialGlobals, decorators: [withModes] } : {}),
  // Autodocs: a per-component Docs page listing every story, labeled.
  tags: ['autodocs'],
  parameters: {
    // Sections in reading order; entries alphabetical within each.
    options: {
      storySort: {
        method: 'alphabetical',
        order: ['Overview', 'Foundations', 'Components', 'Analysis', 'Versions'],
      },
    },
    // Composed slot content is one long JSX expression; dedent preserves the
    // serializer's tree structure without prettier re-splitting attributes
    // onto one line each.
    docs: {
      // Component pages get React / Web Components / Specs as in-page tabs;
      // every other page supplies its own docs.page and is untouched.
      page: ComponentDocs,
      source: { format: 'dedent' },
      // Give every story on the Docs page the canvas toolbar, not just the primary.
      canvas: {
        // The zoom bar adds a row above every story for controls nobody uses on
        // a docs page; the action bar below still carries Show code and full screen.
        withToolbar: false,
        // The toolbar has no story context, so recover the id from the Canvas
        // block's own anchor and open that story full screen.
        additionalActions: [
          {
            title: 'Open full screen',
            onClick: (e: any) => {
              const anchor = (e.currentTarget as HTMLElement).closest('[id^="anchor--"]');
              const id = anchor?.id.replace('anchor--', '');
              if (id) {
                window.parent.location.href = `${window.parent.location.origin}/?path=/story/${id}&full=1`;
              }
            },
          },
        ],
      },
    },
    // "Show code" serializer: keep attributes inline like the emitted source,
    // print fragments short, and drop React's internal keys.
    jsx: {
      maxInlineAttributesLineLength: 200,
      useFragmentShortSyntax: true,
      filterProps: ['key'],
    },
    layout: 'centered',
    controls: {
      matchers: {
        color: /(background|color)$/i,
        date: /Date$/i,
      },
    },
  },
};

export default preview;
