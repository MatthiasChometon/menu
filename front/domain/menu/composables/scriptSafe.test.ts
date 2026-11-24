import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

// These composables are also run by plain tsx scripts (check, loader and the
// order script), where Nuxt's auto-imports do not exist. A composable used from
// one of them must import everything it calls, and may not touch Vue or Nuxt.
const SCRIPT_SAFE = ['useNutrition', 'useTarget', 'useCatalogBuilder', 'useMenuBuilder'];
const FRAMEWORK_CALL =
  /\b(ref|computed|reactive|watch|watchEffect|toValue|useState|useNuxtApp|useRuntimeConfig|useI18n|useLocalStorage)\(/;

const sourceOf = (name: string): string =>
  readFileSync(join(__dirname, `${name}.ts`), 'utf8').replace(/\/\/.*$/gm, '');

describe.each(SCRIPT_SAFE)('%s', (name) => {
  const source = sourceOf(name);

  it('calls no Vue or Nuxt function', () => {
    expect(source).not.toMatch(FRAMEWORK_CALL);
  });

  it('imports every composable it calls', () => {
    const called = [...source.matchAll(/\b(use[A-Z]\w*)\(/g)]
      .map((match): string | undefined => match[1])
      .filter((callee): boolean => callee !== name);

    for (const callee of called) {
      expect(source, `${name} calls ${callee} without importing it`).toMatch(
        new RegExp(String.raw`import[^;]*\b${callee}\b[^;]*from`),
      );
    }
  });
});
