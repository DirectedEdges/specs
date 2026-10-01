// Scaffolded by `specs storybook init`. Yours after that — publish never
// touches it.
//
// This is the one file that depends on Storybook internals (`storybook/internal/*`,
// `types.TAB`, `experimental_setFilter`) — every such import is confined here and
// feature-detected, so a Storybook major that removes one degrades navigation
// (tabs vanish, the sidebar shows both trees) instead of breaking the instance.
// Tested against Storybook 8.
//
// Which framework tabs exist comes from content/components/tabs.json, which
// `specs storybook` derives from the trees the workspace actually emitted.
import * as React from 'react';
import { addons, types, useStorybookState } from 'storybook/internal/manager-api';
import {
  EmptyTabContent,
  Loader,
  SyntaxHighlighter,
  TabsState,
} from 'storybook/internal/components';
import { styled } from 'storybook/internal/theming';
import tabsConfig from '../content/components/tabs.json';

const ADDON_ID = 'specs/framework-tabs';

const WC_TAB = `${ADDON_ID}/webcomponents`;
const SPECS_TAB = `${ADDON_ID}/specs`;

const TAB_LABELS: Record<string, string> = {
  react: 'React',
  webcomponents: 'Web Components',
  specs: 'Specs',
};

const tabs: string[] = Array.isArray(tabsConfig.tabs) ? tabsConfig.tabs : ['specs'];
const canvas: string = typeof tabsConfig.canvas === 'string' ? tabsConfig.canvas : 'specs';

/**
 * The built-in canvas tab is named after the tree it renders. Set here rather
 * than as a story parameter: the manager knows its own config before any story
 * loads, so the tab never reads "Canvas" while the preview catches up.
 */
addons.setConfig({ previewTabs: { canvas: { title: TAB_LABELS[canvas] ?? 'Canvas' } } });

// Emitted story ids are the kebab-cased titles. The React tree is titled
// 'Components/<Name>' (it is the one the sidebar shows), the Web Components
// tree keeps 'Web Components/<Name>' so the two id spaces stay distinct.
const REACT_PREFIX = 'components-';
const WC_PREFIX = 'web-components-';

/** The component part of a story id, with the framework prefix removed. */
function componentSlug(storyId: string | undefined): string | null {
  if (!storyId) return null;
  const base = storyId.split('--')[0];
  if (base.startsWith(REACT_PREFIX)) return base.slice(REACT_PREFIX.length);
  if (base.startsWith(WC_PREFIX)) return base.slice(WC_PREFIX.length);
  return null;
}

// Spec directory names are derived from component names and differ in shape
// between libraries — `deAlert` in one, `accordionitem` in another. The manager
// bundle cannot glob the directory; instead try the shapes a slug can take and
// use whichever answers.
function specDirCandidates(slug: string): string[] {
  const parts = slug.split('-');
  const camel = parts[0] + parts.slice(1).map((p) => p[0].toUpperCase() + p.slice(1)).join('');
  return [...new Set([camel, parts.join(''), slug])];
}

// The manager centres and shrink-wraps tab content that declares no size, and
// gives it no height to inherit — so the tab establishes its own filled box and
// everything inside sizes against that.
const Fill = styled.div({
  position: 'absolute',
  inset: 0,
  display: 'flex',
  flexDirection: 'column',
});

const Frame = styled.iframe({
  flex: 1,
  minHeight: 0,
  width: '100%',
  border: 0,
  background: 'transparent',
});

const Scroll = styled.div(({ theme }) => ({
  flex: 1,
  minHeight: 0,
  overflow: 'auto',
  background: theme.background.content,

  // Prism's YAML grammar leaves plain scalars untokenized, so the palette can
  // only lift what it does mark: keys, punctuation, and typed literals.
  'span.token.key': { color: theme.color.secondary, fontWeight: 600 },
  'span.token.punctuation': { color: theme.color.mediumdark },
  'span.token.string': { color: theme.color.positive },
  'span.token.number, span.token.boolean, span.token.null': { color: theme.color.purple },
  'span.token.comment': { color: theme.color.mediumdark, fontStyle: 'italic' },
  'span.linenumber': { opacity: 0.45 },
}));

function WebComponentsTab() {
  const { storyId } = useStorybookState();
  const slug = componentSlug(storyId);
  if (!slug) {
    return <EmptyTabContent title="No component selected" description="Pick a component in the sidebar." />;
  }
  // Story export names are identical across the two emitted trees, so the same
  // story carries over. The sibling is a real story in the same index, so the
  // canvas iframe renders it with no second server.
  const storyName = (storyId ?? '').split('--')[1] ?? 'default';
  const src = `iframe.html?id=${WC_PREFIX}${slug}--${storyName}&viewMode=story`;
  return (
    <Fill>
      <Frame title="Web Components" src={src} />
    </Fill>
  );
}

const SPEC_FILES = ['api', 'variants', 'examples'] as const;
type SpecFile = (typeof SPEC_FILES)[number];

/** One spec file's contents, highlighted. */
function SpecSource({ slug, file }: { slug: string; file: SpecFile }) {
  const [state, setState] = React.useState<{ status: 'loading' | 'ok' | 'missing'; text: string }>({
    status: 'loading',
    text: '',
  });

  React.useEffect(() => {
    let live = true;
    setState({ status: 'loading', text: '' });
    // specs/ is served statically (see main.ts staticDirs).
    (async () => {
      for (const dir of specDirCandidates(slug)) {
        const response = await fetch(`/specs/${dir}/${file}.yaml`).catch(() => null);
        if (!live) return;
        if (response?.ok) return setState({ status: 'ok', text: await response.text() });
      }
      if (live) setState({ status: 'missing', text: '' });
    })();
    return () => {
      live = false;
    };
  }, [slug, file]);

  if (state.status === 'loading') return <Loader />;
  if (state.status === 'missing') {
    return (
      <EmptyTabContent
        title={`No ${file}.yaml`}
        description={`No ${file}.yaml for ${slug} in this workspace.`}
      />
    );
  }
  return (
    <Scroll>
      <SyntaxHighlighter language="yml" format={false} copyable padded showLineNumbers>
        {state.text}
      </SyntaxHighlighter>
    </Scroll>
  );
}

function SpecsTab() {
  const { storyId } = useStorybookState();
  const slug = componentSlug(storyId);
  if (!slug) {
    return <EmptyTabContent title="No component selected" description="Pick a component in the sidebar." />;
  }
  return (
    <Fill>
      <TabsState absolute bordered initial="api" menuName="Spec">
        {SPEC_FILES.map((file) => (
          <div key={file} id={file} title={file}>
            <SpecSource slug={slug} file={file} />
          </div>
        ))}
      </TabsState>
    </Fill>
  );
}

addons.register(ADDON_ID, (api) => {
  // Feature detection (ADR A): a Storybook that removed one of these unstable
  // APIs degrades navigation — visibly, via the console — never the instance.
  const canAddTabs = Boolean((types as Record<string, unknown>)?.TAB);
  const canFilter = typeof (api as unknown as Record<string, unknown>).experimental_setFilter === 'function';

  // The Web Components tree stays in the index so its tab can load it, but it
  // is not a second place to browse the same components — filter it out of the
  // sidebar when the React tree is what the sidebar shows.
  if (tabs.includes('webcomponents') && canvas === 'react') {
    if (canFilter) {
      api.experimental_setFilter(ADDON_ID, (item) => !item.title.startsWith('Web Components/'));
    } else {
      console.warn('[specs] experimental_setFilter is gone — the Web Components tree appears in the sidebar unfiltered.');
    }
  }

  if (!canAddTabs) {
    console.warn('[specs] types.TAB is gone — framework tabs are not registered; the sidebar trees still work.');
    return;
  }

  // The framework tabs belong to components; on a foundations or analysis page
  // they offer a view that does not exist. A tab addon's `match` only decides
  // whether a tab is *active*, and the manager memoises its tab list on
  // (tab count, elements, entry parameters, showTabs) while reading `previewTabs`
  // config inside — so changing config mid-session never recomputes. `showTabs`
  // is in that key, so it is the switch that works on client-side navigation.
  const syncTabs = (payload: unknown) => {
    const p = payload as { storyId?: string; id?: string } | string;
    const id = typeof p === 'string' ? p : (p?.storyId ?? p?.id);
    if (id) api.setOptions({ showTabs: componentSlug(id) !== null });
  };
  for (const event of ['setCurrentStory', 'storyChanged', 'docsPrepared', 'storyPrepared']) {
    api.on(event, syncTabs);
  }

  if (tabs.includes('webcomponents') && canvas !== 'webcomponents') {
    addons.add(WC_TAB, {
      type: types.TAB,
      title: TAB_LABELS.webcomponents,
      route: ({ storyId, refId }) =>
        refId ? `/webcomponents/${refId}_${storyId}` : `/webcomponents/${storyId}`,
      match: ({ viewMode, storyId }) => viewMode === 'webcomponents' && componentSlug(storyId) !== null,
      render: ({ active }) => (active ? <WebComponentsTab /> : null),
    });
  }

  if (canvas !== 'specs') {
    addons.add(SPECS_TAB, {
      type: types.TAB,
      title: TAB_LABELS.specs,
      route: ({ storyId, refId }) => (refId ? `/specs/${refId}_${storyId}` : `/specs/${storyId}`),
      match: ({ viewMode, storyId }) => viewMode === 'specs' && componentSlug(storyId) !== null,
      render: ({ active }) => (active ? <SpecsTab /> : null),
    });
  }
});
