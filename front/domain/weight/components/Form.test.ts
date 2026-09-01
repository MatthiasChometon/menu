import { mockNuxtImport, mountSuspended } from '@nuxt/test-utils/runtime';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import Form from './Form.vue';

const { add, errorOf } = vi.hoisted(() => ({ add: vi.fn(), errorOf: vi.fn() }));

mockNuxtImport(
  'useWeightLog',
  () =>
    (): {
      add: typeof add;
      errorOf: typeof errorOf;
      todayDate: string;
      bounds: { minKg: number; maxKg: number };
    } => ({
      add,
      errorOf,
      todayDate: '2026-08-20',
      bounds: { minKg: 30, maxKg: 300 },
    }),
);

beforeEach(async () => {
  await useNuxtApp().$i18n.setLocale('fr');
  add.mockClear();
  errorOf.mockClear();
  errorOf.mockReturnValue(undefined);
});

describe('the weigh-in form', () => {
  it('defaults the date to today and the weight to the value handed to it', async () => {
    const wrapper = await mountSuspended(Form, { props: { defaultKg: 78.5 } });

    expect(wrapper.find<HTMLInputElement>('input[type="date"]').element.value).toBe('2026-08-20');
    expect(wrapper.find<HTMLInputElement>('input[type="number"]').element.value).toBe('78.5');
  });

  it('saves a valid weigh-in', async () => {
    const wrapper = await mountSuspended(Form);

    await wrapper.find('input[type="number"]').setValue(82.4);
    await wrapper.find('button').trigger('click');

    expect(add).toHaveBeenCalledWith({ date: '2026-08-20', kg: 82.4 });
  });

  it('shows the validation error and never saves an invalid weigh-in', async () => {
    errorOf.mockReturnValue('Ce poids semble hors de portée. Vérifie la valeur saisie.');

    const wrapper = await mountSuspended(Form);
    await wrapper.find('input[type="number"]').setValue(999);
    await wrapper.find('button').trigger('click');

    expect(add).not.toHaveBeenCalled();
    expect(wrapper.text()).toContain('Ce poids semble hors de portée.');
  });

  it('tells the reader the entry was saved', async () => {
    const wrapper = await mountSuspended(Form);

    await wrapper.find('input[type="number"]').setValue(82);
    await wrapper.find('button').trigger('click');

    expect(wrapper.text()).toContain('Enregistré');
  });
});
