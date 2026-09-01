import { mountSuspended } from '@nuxt/test-utils/runtime';
import { describe, expect, it } from 'vitest';
import RemindersChecklist from './RemindersChecklist.vue';

const ITEMS: ReminderItem[] = [
  { id: 'creatine', icon: 'i-lucide-pill', isChecked: false },
  { id: 'water', icon: 'i-lucide-glass-water', isChecked: true },
  { id: 'vitaminD', icon: 'i-lucide-sun', isChecked: false },
];

describe('the reminders checklist', () => {
  it('names every reminder of the day', async () => {
    const wrapper = await mountSuspended(RemindersChecklist, {
      props: { items: ITEMS, streak: 0 },
    });

    expect(wrapper.text()).toContain('créatine');
    expect(wrapper.text()).toContain("d'eau");
    expect(wrapper.text()).toContain('vitamine D3');
  });

  it('emits which reminder was tapped', async () => {
    const wrapper = await mountSuspended(RemindersChecklist, {
      props: { items: ITEMS, streak: 0 },
    });

    await wrapper.findAll('button')[0]?.trigger('click');

    expect(wrapper.emitted('toggle')?.[0]).toEqual(['creatine']);
  });

  it('says nothing about a streak until there is one', async () => {
    const wrapper = await mountSuspended(RemindersChecklist, {
      props: { items: ITEMS, streak: 0 },
    });

    expect(wrapper.text()).not.toContain("d'affilée");
  });

  it('counts a single day in the singular', async () => {
    const wrapper = await mountSuspended(RemindersChecklist, {
      props: { items: ITEMS, streak: 1 },
    });

    expect(wrapper.text()).toContain('1 jour d’affilée'.replace('’', "'"));
  });

  it('counts several days in the plural', async () => {
    const wrapper = await mountSuspended(RemindersChecklist, {
      props: { items: ITEMS, streak: 4 },
    });

    expect(wrapper.text()).toContain('4 jours d’affilée'.replace('’', "'"));
  });
});
