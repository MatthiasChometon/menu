import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { startTestApp, type TestApp } from '../../infrastructure/testing/e2e-app';

const ADMIN = 'matthias@example.com';
const READER = 'someone-else@example.com';
const PASSWORD = 'a-long-enough-password';

const REPORT = `
  mutation Report($input: ReportBugInput!) {
    reportBug(input: $input) {
      id
      severity
      message
      status
      reportedBy
      context { page viewport }
    }
  }
`;

const LIST = `
  query {
    bugReports { id message status reportedBy createdAt }
  }
`;

const BLOCK = `
  mutation Block($input: BlockReporterInput!) {
    blockReporter(input: $input)
  }
`;

const SET_STATUS = `
  mutation Handle($input: BugStatusInput!) {
    setBugStatus(input: $input) { id status }
  }
`;

const contextOf = (page: string): object => ({
  page,
  userAgent: 'Mozilla/5.0 (probe)',
  viewport: '390x844',
  locale: 'fr',
});

const reportOf = (page: string, message: string, severity = 'ANNOYING'): object => ({
  input: { severity, message, context: contextOf(page) },
});

let api: TestApp;

beforeAll(async (): Promise<void> => {
  api = await startTestApp();
});

afterAll(async (): Promise<void> => {
  await api.close();
});

beforeEach(async (): Promise<void> => {
  await api.reset();
});

describe('reporting a problem', () => {
  it('takes a description and remembers everything the browser knew', async () => {
    const session = await api.signUp(READER, PASSWORD);

    const response = await api.graphql<{
      reportBug: { message: string; context: { page: string } };
    }>(REPORT, reportOf('/courses', 'La liste de courses affiche deux fois le riz.'), session);

    expect(response.errors).toBeUndefined();
    // The page and the screen came from the browser: the person typed neither,
    // which is the whole point of not making them describe their setup.
    expect(response.data?.reportBug.context.page).toBe('/courses');
    expect(response.data?.reportBug.message).toContain('deux fois le riz');
  });

  it('tells whoever maintains the site, without waiting to be asked', async () => {
    const session = await api.signUp(READER, PASSWORD);
    const before = api.mails().length;

    await api.graphql(REPORT, reportOf('/', 'Le bouton de connexion ne répond pas.'), session);

    const announcement = api.mails().at(-1);
    expect(api.mails().length).toBe(before + 1);
    expect(announcement?.to).toBe(ADMIN);
    // The severity and the words are in the subject: a maintainer triages from
    // a notification list, not by opening every message.
    expect(announcement?.subject).toContain('Gênant');
    expect(announcement?.text).toContain('ne répond pas');
  });

  it('turns away somebody who is not signed in', async () => {
    const response = await api.graphql(REPORT, reportOf('/', 'Tout est cassé partout.'));

    expect(response.errors?.[0]?.message).toBeDefined();
  });

  it('refuses a description too short to act on', async () => {
    const session = await api.signUp(READER, PASSWORD);

    const response = await api.graphql(REPORT, reportOf('/', 'bug'), session);

    // Not a judgement on the reader: three letters cannot be reproduced, and
    // storing it would only grow a list nobody can act on.
    expect(response.errors?.[0]?.message).toBeDefined();
  });
});

describe('when the same account keeps filing', () => {
  it('stops announcing after three in an hour, and keeps every report', async () => {
    const session = await api.signUp(READER, PASSWORD);
    const before = api.mails().length;

    for (let filed = 0; filed < 5; filed += 1) {
      await api.graphql(REPORT, reportOf('/', `Un problème rencontré, numéro ${filed}.`), session);
    }

    // Three notices, five reports. What is spammable here is attention, not
    // storage: silencing the mail costs nobody their words.
    expect(api.mails().length).toBe(before + 3);

    const admin = await api.signUp(ADMIN, PASSWORD);
    const list = await api.graphql<{ bugReports: unknown[] }>(LIST, undefined, admin);
    expect(list.data?.bugReports).toHaveLength(5);
  });

  it('says in the notice how many that account has filed today', async () => {
    const session = await api.signUp(READER, PASSWORD);
    await api.graphql(REPORT, reportOf('/', 'Le premier de la soirée.'), session);
    await api.graphql(REPORT, reportOf('/', 'Le deuxième de la soirée.'), session);

    // The count is what still reports a flood once the cap has silenced the
    // messages that would have shown it.
    expect(api.mails().at(-1)?.text).toContain('24 h : 2');
  });

  it('refuses a report from an account that has been stopped', async () => {
    const reader = await api.signUp(READER, PASSWORD);
    const created = await api.graphql<{ reportBug: { id: string } }>(
      REPORT,
      reportOf('/', 'Un premier signalement, avant le blocage.'),
      reader,
    );

    const admin = await api.signUp(ADMIN, PASSWORD);
    await api.graphql(
      BLOCK,
      { input: { reportId: created.data?.reportBug.id, blocked: true } },
      admin,
    );

    const refused = await api.graphql(REPORT, reportOf('/', 'Et un deuxième, après.'), reader);
    expect(refused.errors?.[0]?.message).toBeDefined();
  });

  it('lets the block be lifted again', async () => {
    const reader = await api.signUp(READER, PASSWORD);
    const created = await api.graphql<{ reportBug: { id: string } }>(
      REPORT,
      reportOf('/', 'Un signalement qui vaudra un blocage.'),
      reader,
    );
    const admin = await api.signUp(ADMIN, PASSWORD);
    const args = { input: { reportId: created.data?.reportBug.id, blocked: true } };

    await api.graphql(BLOCK, args, admin);
    await api.graphql(BLOCK, { input: { ...args.input, blocked: false } }, admin);

    // Blocking is a judgement, and a judgement has to be reversible — otherwise
    // nobody dares use it.
    const again = await api.graphql(
      REPORT,
      reportOf('/', 'Un signalement après le déblocage.'),
      reader,
    );
    expect(again.errors).toBeUndefined();
  });

  it('keeps the block button out of a reader hands', async () => {
    const reader = await api.signUp(READER, PASSWORD);
    const created = await api.graphql<{ reportBug: { id: string } }>(
      REPORT,
      reportOf('/', 'Un signalement tout à fait ordinaire.'),
      reader,
    );

    const response = await api.graphql(
      BLOCK,
      { input: { reportId: created.data?.reportBug.id, blocked: true } },
      reader,
    );

    expect(response.errors?.[0]?.message).toBeDefined();
  });
});

describe('reading the reports', () => {
  it('tells the front whether to offer the reports at all', async () => {
    const reader = await api.signUp(READER, PASSWORD);
    const asReader = await api.graphql<{ amIAdmin: boolean }>(
      'query { amIAdmin }',
      undefined,
      reader,
    );

    const admin = await api.signUp(ADMIN, PASSWORD);
    const asAdmin = await api.graphql<{ amIAdmin: boolean }>(
      'query { amIAdmin }',
      undefined,
      admin,
    );

    // Hiding a menu entry is not a protection — the guard above is. This only
    // stops the site offering a door that would slam in the reader's face.
    expect(asReader.data?.amIAdmin).toBe(false);
    expect(asAdmin.data?.amIAdmin).toBe(true);
  });

  it('keeps them from an account that is not an administrator', async () => {
    const session = await api.signUp(READER, PASSWORD);
    await api.graphql(REPORT, reportOf('/', 'Un souci quelque part sur la page.'), session);

    const response = await api.graphql<{ bugReports: unknown[] }>(LIST, undefined, session);

    // Signed in is not enough. The reports carry other people words and the
    // pages they were on, which is nobody else business.
    expect(response.data?.bugReports).toBeUndefined();
    expect(response.errors?.[0]?.message).toBeDefined();
  });

  it('shows an administrator every report, the newest first', async () => {
    const reader = await api.signUp(READER, PASSWORD);
    await api.graphql(REPORT, reportOf('/', 'Le premier problème rencontré.'), reader);
    await api.graphql(REPORT, reportOf('/batch', 'Le second problème rencontré.'), reader);

    const admin = await api.signUp(ADMIN, PASSWORD);
    const response = await api.graphql<{ bugReports: { message: string; reportedBy: string }[] }>(
      LIST,
      undefined,
      admin,
    );

    const reports = response.data?.bugReports ?? [];
    expect(reports).toHaveLength(2);
    expect(reports[0]?.message).toContain('second');
    // Who to answer, not an account id: reading a list, the address is what
    // you actually need.
    expect(reports[0]?.reportedBy).toBe(READER);
  });

  it('lets an administrator mark one handled, so the list stops growing', async () => {
    const reader = await api.signUp(READER, PASSWORD);
    const created = await api.graphql<{ reportBug: { id: string } }>(
      REPORT,
      reportOf('/', 'Quelque chose qui a depuis été corrigé.'),
      reader,
    );

    const admin = await api.signUp(ADMIN, PASSWORD);
    const response = await api.graphql<{ setBugStatus: { status: string } }>(
      SET_STATUS,
      { input: { id: created.data?.reportBug.id, status: 'FIXED' } },
      admin,
    );

    expect(response.data?.setBugStatus.status).toBe('FIXED');
  });

  it('refuses to let a reader close their own report', async () => {
    const reader = await api.signUp(READER, PASSWORD);
    const created = await api.graphql<{ reportBug: { id: string } }>(
      REPORT,
      reportOf('/', 'Un problème que je préférerais voir disparaître.'),
      reader,
    );

    const response = await api.graphql(
      SET_STATUS,
      { input: { id: created.data?.reportBug.id, status: 'DISMISSED' } },
      reader,
    );

    expect(response.errors?.[0]?.message).toBeDefined();
  });
});
