import { defineConfig } from 'astro/config';
import starlight from '@astrojs/starlight';

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
        { label: 'Claude Code Onboarding', slug: 'cli/claude-onboarding' },
        { label: 'Licensing', slug: 'overview/licensing' },
        {
          label: 'Schema',
          collapsed: true,
          items: [
            { label: 'Schema Reference', slug: 'schema' },
            { label: 'Component', slug: 'schema/component' },
            { label: 'Anatomy', slug: 'schema/anatomy' },
            { label: 'Elements', slug: 'schema/elements' },
            { label: 'Layout', slug: 'schema/layout' },
            { label: 'Props', slug: 'schema/props' },
            { label: 'Styles', slug: 'schema/styles' },
            { label: 'Variants', slug: 'schema/variants' },
            { label: 'Subcomponents', slug: 'schema/subcomponents' },
            { label: 'Metadata', slug: 'schema/metadata' },
            { label: 'Config', slug: 'schema/config' },
            { label: 'Token Reference', slug: 'schema/token-reference' },
            { label: 'Prop Binding', slug: 'schema/prop-binding' },
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
          label: 'Command Line (CLI)',
          collapsed: true,
          items: [
            { label: 'Overview', slug: 'cli' },
            { label: 'Workflows', slug: 'cli/workflows' },
            { label: '1. init (one time)', slug: 'cli/commands/init' },
            { label: '2. fetch', slug: 'cli/commands/fetch' },
            { label: '2.a. applyCustomTokens', slug: 'cli/commands/apply-custom-tokens' },
            { label: '3. scan (one time)', slug: 'cli/commands/scan' },
            { label: '4. generate', slug: 'cli/commands/generate' },
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
                { label: 'Tokens', slug: 'config/tokens' },
              ],
            },
            {
              label: 'Include',
              items: [
                { label: 'Invalid Variants', slug: 'config/invalid-variants' },
                { label: 'Invalid Combinations', slug: 'config/invalid-combinations' },
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
            { label: 'Token Format', slug: 'guides/token-format' },
            { label: 'Key Formatting', slug: 'guides/key-formatting' },
            { label: 'Number Inference', slug: 'guides/number-inference' },
            { label: 'Slot Constraints', slug: 'guides/slot-constraints' },
            { label: 'Icon Glyphs', slug: 'guides/glyph-name-pattern' },
            { label: 'Subcomponents', slug: 'guides/subcomponent-scoping' },
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
