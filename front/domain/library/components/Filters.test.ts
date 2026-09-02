import { mountSuspended } from '@nuxt/test-utils/runtime';
import { describe, expect, it } from 'vitest';
import Filters from './Filters.vue';

const mountFilters = (): ReturnType<typeof mountSuspended> =>
  mountSuspended(Filters, {
    props: { query: '', macroFilter: 'all', timeFilter: 'all', seasonOnly: false },
  });

describe('LibraryFilters', () => {
  it('reports what is typed in the search box', async () => {
    const wrapper = await mountFilters();

    await wrapper.find('input').setValue('poulet');

    expect(wrapper.emitted('update:query')?.at(-1)).toEqual(['poulet']);
  });

  it('offers no reset while nothing is filtered', async () => {
    const wrapper = await mountFilters();

    expect(wrapper.text()).not.toContain('Réinitialiser');
  });

  it('reports a season toggle', async () => {
    const wrapper = await mountFilters();

    await wrapper.find('[role="switch"]').trigger('click');

    expect(wrapper.emitted('update:seasonOnly')?.at(-1)).toEqual([true]);
  });

  it('offers a reset once a filter is active', async () => {
    const wrapper = await mountSuspended(Filters, {
      props: { query: 'poulet', macroFilter: 'all', timeFilter: 'all', seasonOnly: false },
    });
    const resetButton = wrapper
      .findAll('button')
      .find((button): boolean => button.text().includes('Réinitialiser'));
    if (resetButton === undefined) throw new Error('reset button not found');

    await resetButton.trigger('click');

    expect(wrapper.emitted('update:query')?.at(-1)).toEqual(['']);
  });
});
