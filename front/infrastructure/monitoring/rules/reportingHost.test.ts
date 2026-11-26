import { describe, expect, it } from 'vitest';

import { isReportingHost } from './reportingHost';

const hosts = ['menu.mtxlab.xyz'];

describe('deciding whether a page reports its errors', () => {
  it('reports from the production domain', () => {
    expect(isReportingHost('menu.mtxlab.xyz', hosts)).toBe(true);
  });

  it('ignores the case of the address', () => {
    expect(isReportingHost('Menu.MtxLab.xyz', hosts)).toBe(true);
  });

  it.each([
    'localhost',
    '127.0.0.1',
    'menu-semaine-887.netlify.app',
    'deploy-preview-12--menu.netlify.app',
  ])('stays silent on %s', (hostname) => {
    expect(isReportingHost(hostname, hosts)).toBe(false);
  });
});
