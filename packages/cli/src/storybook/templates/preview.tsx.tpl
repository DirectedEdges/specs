// Scaffolded by `specs storybook init`. Yours after that — publish never
// touches it.
import type { Preview } from '@storybook/react';
{{CSSVARS_IMPORT}}

const preview: Preview = {
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
