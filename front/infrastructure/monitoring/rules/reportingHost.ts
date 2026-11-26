// Only the deployed site reports. A dev server, a local preview, a Lighthouse or
// Playwright run and a deploy preview all execute the same bundle with the same
// DSN, and each of them would file its own failures (a stopped API, a mocked
// endpoint) as production issues nobody can act on.
export const isReportingHost = (hostname: string, hosts: readonly string[]): boolean =>
  hosts.includes(hostname.toLowerCase());
