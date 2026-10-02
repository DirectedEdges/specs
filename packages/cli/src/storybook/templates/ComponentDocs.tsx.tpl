// Scaffolded by `specs storybook init`. Yours after that — publish never
// touches it.
//
// The docs page for a component: React (the standard autodocs page), Web
// Components (the same component's Lit output), and Specs (the authored spec
// itself) as in-page tabs — ordinary React, no Storybook manager APIs
// involved. Every other kind of page supplies its own docs.page and never
// sees this component.
import * as React from 'react';
import { DocsContext, DocsPage } from '@storybook/blocks';
import tabsJson from '../content/components/tabs.json';

type TabId = 'react' | 'webcomponents' | 'specs';
const TABS: TabId[] = (tabsJson as { tabs: TabId[] }).tabs ?? ['specs'];
const LABELS: Record<TabId, string> = { react: 'React', webcomponents: 'Web Components', specs: 'Specs' };

const tabStyle = (active: boolean): React.CSSProperties => ({
  padding: '10px 16px',
  border: 'none',
  background: 'none',
  cursor: 'pointer',
  font: 'inherit',
  fontWeight: active ? 700 : 400,
  borderBottom: active ? '2px solid currentColor' : '2px solid transparent',
  opacity: active ? 1 : 0.7,
});

/** Spec directory names differ in shape between libraries; try the shapes a slug can take. */
function specDirCandidates(slug: string): string[] {
  const parts = slug.split('-');
  const camel = parts[0] + parts.slice(1).map((p) => p.charAt(0).toUpperCase() + p.slice(1)).join('');
  return [...new Set([camel, parts.join(''), slug])];
}

const SPEC_FILES = ['api', 'variants', 'examples'] as const;

function SpecFile({ slug, file }: { slug: string; file: string }) {
  const [text, setText] = React.useState<string | null>(null);
  React.useEffect(() => {
    let live = true;
    (async () => {
      for (const dir of specDirCandidates(slug)) {
        const res = await fetch(`/specs/${dir}/${file}.yaml`).catch(() => null);
        if (!live) return;
        if (res?.ok) return setText(await res.text());
      }
      if (live) setText(`# No ${file}.yaml for ${slug} in this workspace.`);
    })();
    return () => { live = false; };
  }, [slug, file]);
  if (text === null) return <p>Loading {file}.yaml…</p>;
  return (
    <pre style={{ overflow: 'auto', maxHeight: '70vh', padding: 16, fontSize: 12, lineHeight: 1.5, background: 'rgba(0,0,0,0.03)', borderRadius: 4 }}>
      {text}
    </pre>
  );
}

function SpecsTab({ slug }: { slug: string }) {
  const [file, setFile] = React.useState<string>(SPEC_FILES[0]);
  return (
    <div>
      <div style={{ display: 'flex', gap: 4, borderBottom: '1px solid rgba(0,0,0,0.1)', marginBottom: 12 }}>
        {SPEC_FILES.map((f) => (
          <button key={f} style={tabStyle(f === file)} onClick={() => setFile(f)}>{f}</button>
        ))}
      </div>
      <SpecFile slug={slug} file={file} />
    </div>
  );
}

export function ComponentDocs() {
  const context = React.useContext(DocsContext as React.Context<any>);
  let id = '';
  try {
    id = context?.componentStories?.()[0]?.id ?? '';
  } catch {
    id = '';
  }
  const [tab, setTab] = React.useState<TabId>(TABS[0] ?? 'specs');

  // Every non-component docs page renders the standard page untouched.
  if (!id.startsWith('components-')) return <DocsPage />;
  const slug = id.slice('components-'.length).split('--')[0];

  return (
    <>
      <div style={{ display: 'flex', gap: 4, borderBottom: '1px solid rgba(0,0,0,0.1)', marginBottom: 24 }}>
        {TABS.map((t) => (
          <button key={t} style={tabStyle(t === tab)} onClick={() => setTab(t)}>{LABELS[t]}</button>
        ))}
      </div>
      {tab === 'react' && <DocsPage />}
      {tab === 'webcomponents' && (
        <iframe
          title="Web Components"
          src={`iframe.html?id=web-components-${slug}--overview&viewMode=docs`}
          style={{ width: '100%', height: '75vh', border: 0, background: 'transparent' }}
        />
      )}
      {tab === 'specs' && <SpecsTab slug={slug} />}
    </>
  );
}
