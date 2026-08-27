import { mockNuxtImport, renderSuspended } from '@nuxt/test-utils/runtime';
import { fireEvent, screen } from '@testing-library/vue';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import Threshold from './Threshold.vue';

const { save } = vi.hoisted(() => ({ save: vi.fn() }));

type PreferenceApi = ReturnType<
  typeof import('../composables/useGroceryPreference').useGroceryPreference
>;

mockNuxtImport(
  'useGroceryPreference',
  () =>
    (): PreferenceApi => ({
      thresholdCents: ref(undefined),
      isSaving: ref(false),
      isSaved: ref(false),
      refresh: vi.fn(),
      save,
    }),
);

beforeEach(async (): Promise<void> => {
  save.mockClear();
  await useNuxtApp().$i18n.setLocale('fr');
});

describe('the grocery alert threshold', () => {
  it('saves the typed euros as cents, even though the number field hands back a number', async () => {
    await renderSuspended(Threshold);

    // A number input under v-model stores the parsed number, not a string. The
    // save path used to call .trim() on it and throw before ever reaching save.
    const field = screen.getByLabelText(/m’alerter/i);
    await fireEvent.update(field, '30');
    await fireEvent.submit(field.closest('form') as HTMLFormElement);

    expect(save).toHaveBeenCalledWith(3000);
  });

  it('saves nothing set when the field is cleared', async () => {
    await renderSuspended(Threshold);

    const field = screen.getByLabelText(/m’alerter/i);
    await fireEvent.update(field, '');
    await fireEvent.submit(field.closest('form') as HTMLFormElement);

    expect(save).toHaveBeenCalledWith(undefined);
  });
});
