import { existsSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { CONTENT, FRONT, SEO_PUBLIC } from './paths';

describe('script paths', () => {
  it('finds the front root, the folder that holds package.json', () => {
    expect(existsSync(join(FRONT, 'package.json'))).toBe(true);
    expect(existsSync(join(FRONT, 'nuxt.config.ts'))).toBe(true);
  });

  it('points the branding output at the seo layer and the content at the menu slice', () => {
    expect(existsSync(SEO_PUBLIC)).toBe(true);
    expect(existsSync(CONTENT)).toBe(true);
  });
});
