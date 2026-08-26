import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { startTestApp, type TestApp } from '../../infrastructure/testing/e2e-app';

const ADMIN = 'matthias@example.com';
const READER = 'someone-else@example.com';
const PASSWORD = 'a-long-enough-password';

const SUGGEST = `
  mutation Suggest($input: RequestImprovementInput!) {
    requestImprovement(input: $input) {
      id
      importance
      message
      status
      requestedBy
      context { page viewport }
    }
  }
`;

const LIST = `query { improvementRequests { id message status requestedBy } }`;

const SET_STATUS = `
  mutation Handle($input: ImprovementStatusInput!) {
    setImprovementStatus(input: $input) { id status }
  }
`;

const suggestionOf = (message: string, importance = 'WOULD_HELP'): object => ({
  input: {
    importance,
    message,
    context: { page: '/composer', userAgent: 'Mozilla/5.0 (probe)', viewport: '390x844', locale: 'fr' },
  },
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

describe('suggesting an improvement', () => {
  it('keeps the idea and everything the browser knew, and starts it as new', async () => {
    const session = await api.signUp(READER, PASSWORD);

    const response = await api.graphql<{
      requestImprovement: { message: string; status: string; context: { page: string } };
    }>(SUGGEST, suggestionOf('Ce serait bien de pouvoir dupliquer une semaine.'), session);

    expect(response.errors).toBeUndefined();
    expect(response.data?.requestImprovement.context.page).toBe('/composer');
    expect(response.data?.requestImprovement.status).toBe('NEW');
    expect(response.data?.requestImprovement.message).toContain('dupliquer une semaine');
  });

  it('announces it to whoever maintains the site', async () => {
    const session = await api.signUp(READER, PASSWORD);

    await api.graphql(SUGGEST, suggestionOf('Un mode sombre, ce serait agréable.'), session);

    const notice = api.mails().find((mail): boolean => (mail.subject ?? '').includes('Idée'));
    expect(notice?.to).toBe(ADMIN);
  });

  it('refuses an idea too short to act on', async () => {
    const session = await api.signUp(READER, PASSWORD);

    const response = await api.graphql(SUGGEST, suggestionOf('trop'), session);

    expect(response.errors?.[0]?.message).toBeDefined();
  });

  it('turns nobody away who is signed in', async () => {
    const response = await api.graphql(SUGGEST, suggestionOf('Une idée sans session.'));

    // Not signed in: the guard refuses before the idea is even read.
    expect(response.errors?.[0]?.message).toBeDefined();
  });
});

describe('reading the suggestions', () => {
  it('shows every one to an administrator, newest first', async () => {
    const reader = await api.signUp(READER, PASSWORD);
    await api.graphql(SUGGEST, suggestionOf('La première idée, assez longue pour passer.'), reader);

    const admin = await api.signUp(ADMIN, PASSWORD);
    const list = await api.graphql<{ improvementRequests: { message: string }[] }>(
      LIST,
      undefined,
      admin,
    );

    expect(list.data?.improvementRequests).toHaveLength(1);
    expect(list.data?.improvementRequests[0]?.message).toContain('première idée');
  });

  it('shows nothing to somebody who is not an administrator', async () => {
    const session = await api.signUp(READER, PASSWORD);

    const list = await api.graphql(LIST, undefined, session);

    expect(list.errors?.[0]?.message).toBeDefined();
  });

  it('lets an administrator move a suggestion along', async () => {
    const reader = await api.signUp(READER, PASSWORD);
    const created = await api.graphql<{ requestImprovement: { id: string } }>(
      SUGGEST,
      suggestionOf('Une idée à planifier, bien assez longue.'),
      reader,
    );
    const id = created.data?.requestImprovement.id ?? '';

    const admin = await api.signUp(ADMIN, PASSWORD);
    const response = await api.graphql<{ setImprovementStatus: { status: string } }>(
      SET_STATUS,
      { input: { id, status: 'PLANNED' } },
      admin,
    );

    expect(response.data?.setImprovementStatus.status).toBe('PLANNED');
  });
});
