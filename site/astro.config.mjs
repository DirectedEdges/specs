import { defineConfig } from 'astro/config';
import starlight from '@astrojs/starlight';

const pro = { text: 'Pro', variant: 'tip' };
const experimental = { text: 'Experimental', variant: 'default' };

export default defineConfig({
  site: 'https://directededges.github.io',
  base: '/specs',
  server: { port: 4323 },
  integrations: [
    starlight({
      title: 'Specs',
      description: 'Generate structured, machine-readable UI component specifications from Figma.',
      social: {
        github: 'https://github.com/DirectedEdges/specs',
      },
      components: {
        SocialIcons: './src/components/SocialIcons.astro',
        ThemeSelect: './src/components/ThemeSelect.astro',
        Sidebar: './src/components/Sidebar.astro',
      },
      customCss: ['./src/custom.css'],
      head: [
        {
          tag: 'script',
          content: `
            // Exclusive accordion: only one top-level sidebar section open at a time.
            // Uses ul.top-level > li > details to target only top-level groups,
            // not nested subsections like Processing/Format/Include.
            document.addEventListener('DOMContentLoaded', () => {
              const tops = [...document.querySelectorAll('ul.top-level > li > details')];
              for (const d of tops) {
                d.querySelector(':scope > summary')?.addEventListener('click', () => {
                  requestAnimationFrame(() => {
                    if (!d.open) return;
                    for (const o of tops) {
                      if (o !== d && o.open) {
                        o.open = false;
                        const idx = o.querySelector('sl-sidebar-restore')?.dataset.index;
                        if (idx == null) continue;
                        try {
                          const k = 'sl-sidebar-state';
                          const s = JSON.parse(sessionStorage.getItem(k) || '{}');
                          if (Array.isArray(s.open)) {
                            s.open[parseInt(idx)] = false;
                            sessionStorage.setItem(k, JSON.stringify(s));
                          }
                        } catch {}
                      }
                    }
                  });
                });
              }
            });
          `,
        },
      ],
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
            { label: 'Anatomy', slug: 'schema/anatomy' },
            { label: 'Children', slug: 'schema/children' },
            { label: 'Component', slug: 'schema/component' },
            { label: 'Composition', slug: 'schema/composition', badge: pro },
            { label: 'Conditional', slug: 'schema/conditional' },
            { label: 'Config', slug: 'schema/config' },
            { label: 'Corners', slug: 'schema/corners' },
            { label: 'Effects', slug: 'schema/effects' },
            { label: 'Elements', slug: 'schema/elements' },
            { label: 'Gradient Value', slug: 'schema/gradient-value' },
            { label: 'Instance Examples', slug: 'schema/instance-examples', badge: pro },
            { label: 'Layout', slug: 'schema/layout' },
            { label: 'Metadata', slug: 'schema/metadata' },
            { label: 'Prop Binding', slug: 'schema/prop-binding', badge: pro },
            { label: 'Prop Configurations', slug: 'schema/prop-configurations' },
            { label: 'Props', slug: 'schema/props' },
            { label: 'Sides', slug: 'schema/sides' },
            { label: 'Slot Content', slug: 'schema/slot-content', badge: pro },
            { label: 'Slot Content Reference', slug: 'schema/slot-content-ref', badge: pro },
            { label: 'Styles', slug: 'schema/styles' },
            { label: 'Subcomponents', slug: 'schema/subcomponents', badge: pro },
            { label: 'Token Reference', slug: 'schema/token-reference', badge: pro },
            { label: 'Typography', slug: 'schema/typography' },
            { label: 'Variants', slug: 'schema/variants' },
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
            { label: 'applyCustomTokens', slug: 'cli/commands/apply-custom-tokens' },
            { label: 'generate', slug: 'cli/commands/generate' },
            { label: 'transform', slug: 'cli/commands/transform' },
          ],
        },
        {
          label: 'Transforms',
          collapsed: true,
          badge: experimental,
          items: [
            { label: 'Overview', slug: 'cli/transforms' },
            { label: 'contract', slug: 'cli/transforms/contract' },
            { label: 'css', slug: 'cli/transforms/css' },
          ],
        },
        {
          label: 'Analyze',
          collapsed: true,
          badge: experimental,
          items: [
            { label: 'Overview', slug: 'cli/analyze' },
            { label: 'props', slug: 'cli/analyze/props' },
            { label: 'styling', slug: 'cli/analyze/styling' },
          ],
        },
        {
          label: 'Configuration',
          collapsed: true,
          items: [
            { label: 'Overview', slug: 'config' },
            { label: 'Folders', slug: 'config/folders' },
            { label: 'sources', slug: 'config/data-sources' },
            { label: 'Output', slug: 'config/output' },
            { label: 'Examples', slug: 'config/examples' },
            {
              label: 'Processing',
              items: [
                { label: 'subcomponents', slug: 'config/subcomponents' },
                { label: 'variantDepth', slug: 'config/variant-depth' },
                { label: 'details', slug: 'config/details' },
                { label: 'glyphNamePattern', slug: 'config/glyph-name-pattern' },
                { label: 'codeOnlyPropsPattern', slug: 'config/code-only-props-pattern' },
                { label: 'slotConstraints', slug: 'config/slot-constraints', badge: pro },
                { label: 'inferNumberProps', slug: 'config/infer-number-props' },
                { label: 'collapsePrimitiveWrapper', slug: 'config/collapse-primitive-wrapper' },
                { label: 'instanceExamples', slug: 'config/instance-examples', badge: pro },
              ],
            },
            {
              label: 'Format',
              items: [
                { label: 'output', slug: 'config/output-format' },
                { label: 'keys', slug: 'config/keys' },
                { label: 'layout', slug: 'config/layout' },
                { label: 'tokens', slug: 'config/tokens', badge: pro },
              ],
            },
            {
              label: 'Transform',
              collapsed: true,
              items: [
                { label: 'transformers', slug: 'config/transform', badge: experimental },
              ],
            },
            {
              label: 'Include',
              items: [
                { label: 'invalidVariants', slug: 'config/invalid-variants' },
                { label: 'invalidCombinations', slug: 'config/invalid-combinations', badge: pro },
                { label: 'emptyVariants', slug: 'config/empty-variants' },
                { label: 'defaultSlotContent', slug: 'config/default-slot-content', badge: pro },
              ],
            },
          ],
        },
        {
          label: 'Guides',
          collapsed: true,
          items: [
            { label: 'Absolute Positioning', slug: 'guides/absolute-positioning' },
            { label: 'Code-Only Props', slug: 'guides/code-only-props' },
            { label: 'Consolidating Props', slug: 'guides/consolidating-props' },
            { label: 'Data Layout', slug: 'guides/data-layout' },
            { label: 'Default Slot Content', slug: 'guides/default-slot-content', badge: pro },
            { label: 'Icon Glyphs', slug: 'guides/glyph-name-pattern' },
            { label: 'Instance Examples', slug: 'guides/instance-examples', badge: pro },
            { label: 'Invalid Combinations', slug: 'guides/invalid-variant-combinations' },
            { label: 'Key Formatting', slug: 'guides/key-formatting' },
            { label: 'Layout Positioning', slug: 'guides/layout-positioning' },
            { label: 'Number Inference', slug: 'guides/number-inference' },
            { label: 'Slot Constraints', slug: 'guides/slot-constraints', badge: pro },
            { label: 'Subcomponents', slug: 'guides/subcomponent-scoping', badge: pro },
            { label: 'Variant Depth', slug: 'guides/variant-depth' },
            { label: 'Variant Layering', slug: 'guides/variant-layering' },
          ],
        },
        { label: 'License (Legal)', slug: 'overview/license' },
        { label: 'Terms of Service', slug: 'overview/terms-of-service' },
      ],
    }),
  ],
});
