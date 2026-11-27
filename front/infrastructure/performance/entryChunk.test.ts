import { describe, expect, it } from 'vitest';
import { ENTRY_CHUNK_BUDGET_GZIP_BYTES, entryChunkProblemsOf, entryScriptOf } from './entryChunk';

const recipes = '{"a":{"steps":{"fr":["Saisir {le bœuf|leanBeef} 5 min."]}}}';

describe('the entry script', () => {
  it('is found as the first module script of the page', () => {
    const html =
      '<script type="module" src="/_nuxt/abc.js"></script><script type="module" src="/_nuxt/x.js">';

    expect(entryScriptOf(html)).toBe('/_nuxt/abc.js');
  });

  it('passes under its ceiling without the catalogue', () => {
    expect(entryChunkProblemsOf({ gzipBytes: 190_000, source: 'const a = 1;' }, recipes)).toEqual(
      [],
    );
  });

  it('fails over its ceiling', () => {
    const problems = entryChunkProblemsOf(
      { gzipBytes: ENTRY_CHUNK_BUDGET_GZIP_BYTES + 1, source: '' },
      recipes,
    );

    expect(problems).toHaveLength(1);
  });

  it('fails when the recipe catalogue is back in it', () => {
    const problems = entryChunkProblemsOf(
      { gzipBytes: 1, source: 'x"Saisir {le bœuf|leanBeef}"' },
      recipes,
    );

    expect(problems).toEqual(['the entry script carries the recipe catalogue again']);
  });
});
