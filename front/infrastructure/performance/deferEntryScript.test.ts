import { describe, expect, it } from 'vitest';
import { deferEntryScript } from './deferEntryScript';
import { entryScriptOf } from './entryChunk';

const page = '<head><script type="module" src="/_nuxt/abc.js" crossorigin></script></head>';

describe('deferEntryScript', () => {
  it('no longer loads the entry script as a module of the head', () => {
    expect(deferEntryScript(page)).not.toContain('<script type="module"');
  });

  it('starts it on load, or after the fallback delay', () => {
    const html = deferEntryScript(page);

    expect(html).toContain('addEventListener("load",start');
    expect(html).toContain('setTimeout(start,4000)');
  });

  it('reads its own tag while it runs, not when the page has loaded', () => {
    expect(deferEntryScript(page)).toContain(
      '(()=>{const source=document.currentScript.dataset.entry;',
    );
  });

  it('keeps naming the entry script, for the checks that read it', () => {
    expect(entryScriptOf(deferEntryScript(page))).toBe('/_nuxt/abc.js');
  });

  it('leaves a page with no entry script as it is', () => {
    expect(deferEntryScript('<head></head>')).toBe('<head></head>');
  });
});
