// Scaffolded by `specs storybook init`. Yours after that — publish never
// touches it.
//
// One job: hide the Web Components tree from the sidebar while leaving it in
// the index — the component docs page renders it as a tab, not a second list.
// This is the host's only use of an experimental Storybook API; it
// feature-detects (the plural form first, then its deprecated predecessor)
// and degrades to an unfiltered sidebar rather than breaking the instance.
import { addons } from 'storybook/manager-api';

type FilterFn = (item: { title: string }) => boolean;

addons.register('specs/host', (api) => {
  const hideWebComponents: FilterFn = (item) => !item.title.startsWith('Web Components/');
  const setFilters = (api as { experimental_setFilters?: (filters: Record<string, FilterFn>) => unknown }).experimental_setFilters;
  const setFilter = (api as { experimental_setFilter?: (id: string, fn: FilterFn) => unknown }).experimental_setFilter;
  if (typeof setFilters === 'function') {
    setFilters.call(api, { 'specs/host': hideWebComponents });
  } else if (typeof setFilter === 'function') {
    setFilter.call(api, 'specs/host', hideWebComponents);
  } else {
    // eslint-disable-next-line no-console
    console.warn('[specs] no sidebar filter API in this Storybook — the Web Components tree will appear in the sidebar.');
  }
});
