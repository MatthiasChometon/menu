import { describe, expect, it } from 'vitest';

type TranslationTree = { [key: string]: string | string[] | TranslationTree };

const modules = import.meta.glob<TranslationTree>(
  ['../../domain/**/translation/*.json', '../../infrastructure/**/translation/*.json'],
  { eager: true, import: 'default' },
);

const keysOf = (tree: TranslationTree, prefix = ''): string[] =>
  Object.entries(tree).flatMap(([key, value]): string[] => {
    const path = prefix === '' ? key : `${prefix}.${key}`;
    return typeof value === 'object' && !Array.isArray(value) ? keysOf(value, path) : [path];
  });

const bySlice = new Map<string, { fr?: TranslationTree; en?: TranslationTree }>();

for (const [path, tree] of Object.entries(modules)) {
  const slice = path.replace(/\/translation\/(fr|en)\.json$/, '');
  const locale = path.endsWith('fr.json') ? 'fr' : 'en';
  bySlice.set(slice, { ...bySlice.get(slice), [locale]: tree });
}

describe('translations', () => {
  it('covers every slice in both languages', () => {
    for (const [slice, locales] of bySlice) {
      expect(locales.fr, `${slice} has no French file`).toBeDefined();
      expect(locales.en, `${slice} has no English file`).toBeDefined();
    }
  });

  it.each([...bySlice.keys()])('keeps %s in sync between fr and en', (slice) => {
    const locales = bySlice.get(slice);
    if (locales?.fr === undefined || locales.en === undefined) throw new Error('missing locale');

    expect(keysOf(locales.en).sort()).toEqual(keysOf(locales.fr).sort());
  });

  it('never leaves a translation empty', () => {
    for (const [path, tree] of Object.entries(modules)) {
      const empty = keysOf(tree).filter((key): boolean => {
        const value = key
          .split('.')
          .reduce<unknown>((node, part): unknown => (node as TranslationTree)[part], tree);
        return typeof value === 'string' && value.trim() === '';
      });

      expect(empty, `${path} has empty values`).toEqual([]);
    }
  });
});
