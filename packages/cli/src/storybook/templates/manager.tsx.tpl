// Scaffolded by `specs storybook init`. Yours after that — publish never
// touches it.
//
// One job: hide the Web Components tree from the sidebar while leaving it in
// the index — the component docs page renders it as a tab, not a second list.
// This is the host's only use of a Storybook-internal API; it feature-detects
// and degrades to an unfiltered sidebar rather than breaking the instance.
import { addons } from 'storybook/internal/manager-api';

addons.register('specs/host', (api) => {
  const setFilter = (api as { experimental_setFilter?: (id: string, fn: (item: { title: string }) => boolean) => void }).experimental_setFilter;
  if (typeof setFilter === 'function') {
    setFilter.call(api, 'specs/host', (item) => !item.title.startsWith('Web Components/'));
  } else {
    // eslint-disable-next-line no-console
    console.warn('[specs] experimental_setFilter unavailable in this Storybook — the Web Components tree will appear in the sidebar.');
  }
});
