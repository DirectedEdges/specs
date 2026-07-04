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
        Hero: './src/components/Hero.astro',
        Header: './src/components/Header.astro',
        Footer: './src/components/Footer.astro',
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
          label: 'Specs 2 Figma Plugin',
          collapsed: true,
          items: [
            { label: 'Overview', slug: 'plugin' },
            {
              label: 'Sections',
              items: [
                { label: 'Anatomy', slug: 'plugin/anatomy' },
                { label: 'Props', slug: 'plugin/props' },
                { label: 'Layout', slug: 'plugin/layout' },
                { label: 'Modes', slug: 'plugin/modes' },
                { label: 'Styling', slug: 'plugin/styling' },
                { label: 'Data', slug: 'plugin/data' },
              ],
            },
            {
              label: 'Formatting',
              items: [
                { label: 'Multi-Column Layout', slug: 'plugin/multi-column-layout' },
                { label: 'Color', slug: 'plugin/color', badge: pro },
                { label: 'Dark Mode', slug: 'plugin/dark-mode', badge: pro },
                { label: 'Spacing', slug: 'plugin/spacing', badge: pro },
                { label: 'Text', slug: 'plugin/text', badge: pro },
              ],
            },
          ],
        },
        {
          label: 'Command Line (CLI)',
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
            {
              label: 'Transforms',
              collapsed: true,
              badge: experimental,
              items: [
                { label: 'Overview', slug: 'cli/transforms' },
                { label: 'contract', slug: 'cli/transforms/contract' },
                { label: 'css', slug: 'cli/transforms/css' },
                { label: 'react', slug: 'cli/transforms/react' },
                { label: 'stories', slug: 'cli/transforms/stories' },
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
          ],
        },
        {
          label: 'Schema',
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
          label: 'Settings',
          collapsed: true,
          items: [
            { label: 'Overview', slug: 'settings' },
            {
              label: 'Format',
              items: [
                { label: 'output', slug: 'settings/output-format' },
                { label: 'keys', slug: 'settings/keys' },
                { label: 'tokens', slug: 'settings/tokens', badge: pro },
                { label: 'color', slug: 'settings/color' },
              ],
            },
            {
              label: 'Variants',
              items: [
                { label: 'variantDepth', slug: 'settings/variant-depth' },
                { label: 'emptyVariants', slug: 'settings/empty-variants' },
                { label: 'invalidVariants', slug: 'settings/invalid-variants' },
                { label: 'invalidCombinations', slug: 'settings/invalid-combinations', badge: pro },
              ],
            },
            {
              label: 'Elements',
              items: [
                { label: 'glyphNamePattern', slug: 'settings/glyph-name-pattern' },
                { label: 'subcomponents', slug: 'settings/subcomponents' },
                { label: 'collapsePrimitiveWrapper', slug: 'settings/collapse-primitive-wrapper' },
                { label: 'defaultSlotContent', slug: 'settings/default-slot-content', badge: pro },
                { label: 'instanceExamples', slug: 'settings/instance-examples', badge: pro },
              ],
            },
            {
              label: 'Props',
              items: [
                { label: 'codeOnlyPropsPattern', slug: 'settings/code-only-props-pattern' },
                { label: 'slotConstraints', slug: 'settings/slot-constraints', badge: pro },
                { label: 'inferNumberProps', slug: 'settings/infer-number-props' },
              ],
            },
            { label: 'Layout', slug: 'settings/layout' },
            { label: 'details', slug: 'settings/details' },
            { label: 'states', slug: 'settings/states', badge: experimental },
            { label: 'transformers', slug: 'settings/transform', badge: experimental },
            {
              label: 'Files and Folders',
              items: [
                { label: 'sources', slug: 'settings/data-sources' },
                { label: 'Folders', slug: 'settings/folders' },
                { label: 'Output', slug: 'settings/output' },
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
