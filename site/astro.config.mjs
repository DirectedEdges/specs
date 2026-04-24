import { defineConfig } from 'astro/config';
import starlight from '@astrojs/starlight';

const pro = { text: 'Pro', variant: 'tip' };

export default defineConfig({
  site: 'https://directededges.github.io',
  base: '/specs',
  integrations: [
    starlight({
      title: 'Specs',
      description: 'Generate structured, machine-readable UI component specifications from Figma.',
      social: {
        github: 'https://github.com/DirectedEdges/specs',
      },
      customCss: ['./src/custom.css'],
      sidebar: [
        { label: 'Introduction', slug: '' },
        { label: 'About Specs', slug: 'overview/aboutspecs' },
        { label: 'Getting Started', slug: 'cli/getting-started' },
        { label: 'Releases', slug: 'overview/releases' },
        { label: 'Licensing', slug: 'overview/licensing', badge: pro },
        {
          label: 'Schema (@specs-schema)',
          collapsed: true,
          items: [
            { label: 'Overview', slug: 'schema' },
{ label: 'Component', slug: 'schema/component' },
            { label: 'Anatomy', slug: 'schema/anatomy' },
            { label: 'Elements', slug: 'schema/elements' },
            { label: 'Layout', slug: 'schema/layout' },
            { label: 'Props', slug: 'schema/props' },
            { label: 'Styles', slug: 'schema/styles' },
            { label: 'Variants', slug: 'schema/variants' },
            { label: 'Subcomponents', slug: 'schema/subcomponents', badge: pro },
            { label: 'Metadata', slug: 'schema/metadata' },
            { label: 'Config', slug: 'schema/config' },
            { label: 'Token Reference', slug: 'schema/token-reference', badge: pro },
            { label: 'Prop Binding', slug: 'schema/prop-binding', badge: pro },
            { label: 'Prop Configurations', slug: 'schema/prop-configurations' },
            { label: 'Conditional', slug: 'schema/conditional' },
            { label: 'Gradient Value', slug: 'schema/gradient-value' },
            { label: 'Typography', slug: 'schema/typography' },
            { label: 'Effects', slug: 'schema/effects' },
            { label: 'Sides', slug: 'schema/sides' },
            { label: 'Corners', slug: 'schema/corners' },
          ],
        },
        {
          label: 'Commands (@specs-cli)',
          collapsed: true,
          items: [
            { label: 'Overview', slug: 'cli' },
            { label: 'Workflows', slug: 'cli/workflows' },
            { label: 'init', slug: 'cli/commands/init' },
            { label: 'fetch', slug: 'cli/commands/fetch' },
            { label: 'scan', slug: 'cli/commands/scan' },
            { label: 'generate', slug: 'cli/commands/generate' },
            { label: 'applyCustomTokens', slug: 'cli/commands/apply-custom-tokens' },
          ],
        },
        {
          label: 'Configuration',
          collapsed: true,
          items: [
            { label: 'Overview', slug: 'config' },
            { label: 'Folders', slug: 'config/folders' },
            { label: 'Data Sources', slug: 'config/data-sources' },
            { label: 'Output', slug: 'config/output' },
            { label: 'Examples', slug: 'config/examples' },
            {
              label: 'Processing',
              items: [
                { label: 'Subcomponents', slug: 'config/subcomponents' },
                { label: 'Variant Depth', slug: 'config/variant-depth' },
                { label: 'Details', slug: 'config/details' },
              ],
            },
            {
              label: 'Format',
              items: [
                { label: 'Output Format', slug: 'config/output-format' },
                { label: 'Keys', slug: 'config/keys' },
                { label: 'Layout', slug: 'config/layout' },
                { label: 'Tokens', slug: 'config/tokens', badge: pro },
              ],
            },
            {
              label: 'Include',
              items: [
                { label: 'Invalid Variants', slug: 'config/invalid-variants' },
                { label: 'Invalid Combinations', slug: 'config/invalid-combinations', badge: pro },
                { label: 'Empty Variants', slug: 'config/empty-variants' },
              ],
            },
          ],
        },
        {
          label: 'Guides',
          collapsed: true,
          items: [
            { label: 'Variant Depth', slug: 'guides/variant-depth' },
            { label: 'Variant Layering', slug: 'guides/variant-layering' },
            { label: 'Data Layout', slug: 'guides/data-layout' },
            { label: 'Token Format', slug: 'guides/token-format', badge: pro },
            { label: 'Key Formatting', slug: 'guides/key-formatting' },
            { label: 'Number Inference', slug: 'guides/number-inference' },
            { label: 'Slot Constraints', slug: 'guides/slot-constraints', badge: pro },
            { label: 'Icon Glyphs', slug: 'guides/glyph-name-pattern' },
            { label: 'Subcomponents', slug: 'guides/subcomponent-scoping', badge: pro },
            { label: 'Consolidating Props', slug: 'guides/consolidating-props' },
            { label: 'Code-Only Props', slug: 'guides/code-only-props' },
          ],
        },
        { label: 'License (Legal)', slug: 'overview/license' },
        { label: 'Terms of Service', slug: 'overview/terms-of-service' },
      ],
    }),
  ],
});
