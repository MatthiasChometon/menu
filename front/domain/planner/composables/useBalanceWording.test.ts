import { beforeEach, describe, expect, it } from 'vitest';

beforeEach(async () => {
  await useNuxtApp().$i18n.setLocale('fr');
});

describe('putting a macro gap into words', () => {
  it('says a macro is short when it falls below the target', () => {
    const { wordingOf } = useBalanceWording();

    expect(wordingOf({ macro: 'protein', gapPercent: -12 })).toBe('Protéines un peu justes');
  });

  it('says it runs high when it goes over', () => {
    const { wordingOf } = useBalanceWording();

    expect(wordingOf({ macro: 'fat', gapPercent: 18 })).toBe('Lipides un peu hautes');
  });

  it('never shows the reader a percentage', () => {
    const { wordingOf } = useBalanceWording();

    expect(wordingOf({ macro: 'kcal', gapPercent: -42 })).not.toMatch(/\d/);
  });
});
