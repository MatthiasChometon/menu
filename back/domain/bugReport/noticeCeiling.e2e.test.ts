import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { startTestApp, type TestApp } from '../../infrastructure/testing/e2e-app';

const FIRST = 'matthias@example.com';
const SECOND = 'someone-else@example.com';
const PASSWORD = 'a-long-enough-password';

const REPORT = `
  mutation Report($input: ReportBugInput!) {
    reportBug(input: $input) { id }
  }
`;

const reportOf = (message: string): object => ({
  input: {
    severity: 'ANNOYING',
    message,
    context: { page: '/', userAgent: 'probe', viewport: '390x844', locale: 'fr' },
  },
});

let api: TestApp;

beforeAll(async (): Promise<void> => {
  // Its own file because the ceiling is read when the app is built, and the
  // rest of the suite needs it out of the way. Two, so the rule can be shown
  // with three reports instead of twenty-one — the number is what is being
  // configured, never the rule.
  process.env.BUG_NOTICES_PER_HOUR = '2';
  api = await startTestApp();
});

afterAll(async (): Promise<void> => {
  await api.close();
  process.env.BUG_NOTICES_PER_HOUR = '1000';
});

beforeEach(async (): Promise<void> => {
  await api.reset();
});

describe('the ceiling that counts nobody in particular', () => {
  it('stops announcing once the hour is loud, whoever is talking', async () => {
    const loud = await api.signUp(FIRST, PASSWORD);
    await api.graphql(REPORT, reportOf('Le premier problème de la soirée.'), loud);
    await api.graphql(REPORT, reportOf('Le deuxième problème de la soirée.'), loud);

    // A different account, on its very first report, and well inside its own
    // allowance. It is silenced by what everybody else has been filing — which
    // is the whole point: the per-account caps are defeated by opening more
    // accounts, and only a shared ceiling bounds one inbox.
    const other = await api.signUp(SECOND, PASSWORD);
    const before = api.mails().length;
    await api.graphql(REPORT, reportOf('Le premier problème de quelqu un d autre.'), other);

    expect(api.mails().length).toBe(before);
  });

  it('keeps the report itself, and puts it on the screen', async () => {
    const loud = await api.signUp(FIRST, PASSWORD);
    for (const message of ['Un premier souci.', 'Un deuxième souci.', 'Un troisième souci.']) {
      await api.graphql(REPORT, reportOf(message), loud);
    }

    // Silence is about the mail and never about the words: somebody on their
    // third bug of the evening still gets to describe it, and it still reaches
    // the person who can fix it.
    const list = await api.graphql<{ bugReports: unknown[] }>(
      'query { bugReports { id } }',
      undefined,
      loud,
    );

    expect(list.data?.bugReports).toHaveLength(3);
  });
});
