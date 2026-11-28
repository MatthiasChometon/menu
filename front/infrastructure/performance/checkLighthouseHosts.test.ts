import { mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';

const { externalRequests } = createRequire(import.meta.url)('./check-lighthouse-hosts.cjs') as {
  externalRequests: (dirs: string[]) => string[];
};

const report = (urls: string[]): string =>
  JSON.stringify({
    finalUrl: 'http://localhost:3777/',
    audits: {
      'network-requests': { details: { items: urls.map((url): { url: string } => ({ url })) } },
    },
  });

describe('the hosts a Lighthouse run reaches', () => {
  const dirs: string[] = [];
  const reportsOf = (urls: string[]): string => {
    const dir = mkdtempSync(join(tmpdir(), 'lh-hosts-'));
    dirs.push(dir);
    writeFileSync(join(dir, 'a.report.json'), report(urls));
    return dir;
  };
  afterEach(() => {
    for (const dir of dirs.splice(0)) rmSync(dir, { recursive: true });
  });

  it('accepts the site, its API and inline data', () => {
    const dir = reportsOf([
      'http://localhost:3777/',
      'http://localhost:3779/graphql',
      'data:image/svg+xml;base64,AAAA',
    ]);

    expect(externalRequests([dir])).toEqual([]);
  });

  it('reports a request to the Iconify API', () => {
    const dir = reportsOf(['https://api.iconify.design/lucide.json?icons=apple']);

    expect(externalRequests([dir])).toHaveLength(1);
  });
});
