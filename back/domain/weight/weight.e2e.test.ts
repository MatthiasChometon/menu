import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { startTestApp, type TestApp } from '../../infrastructure/testing/e2e-app';
import { weightEntryConstraints } from './utils';

const OWNER = 'matthias@example.com';
const SOMEBODY_ELSE = 'someone-else@example.com';
const PASSWORD = 'a-long-enough-password';

const ENTRY_FIELDS = `id date kg`;

const ENTRIES = `query { myWeightEntries { ${ENTRY_FIELDS} } }`;

const ADD = `
  mutation ($input: WeightEntryInput!) {
    addWeightEntry(input: $input) { ${ENTRY_FIELDS} }
  }
`;

const UPDATE = `
  mutation ($input: UpdateWeightEntryInput!) {
    updateWeightEntry(input: $input) { ${ENTRY_FIELDS} }
  }
`;

const DELETE = `mutation ($id: ID!) { deleteWeightEntry(id: $id) }`;

type Entry = { id: string; date: string; kg: number };

let api: TestApp;

const add = async (
  session: string,
  input: { date: string; kg: number } = { date: '2026-08-01', kg: 75 },
): Promise<Entry> => {
  const response = await api.graphql<{ addWeightEntry: Entry }>(ADD, { input }, session);

  if (response.data === undefined) throw new Error(response.errors?.[0]?.message);

  return response.data.addWeightEntry;
};

beforeAll(async (): Promise<void> => {
  api = await startTestApp();
});

afterAll(async (): Promise<void> => {
  await api.close();
});

beforeEach(async (): Promise<void> => {
  await api.reset();
});

describe('logging a weigh-in', () => {
  it('is refused to whoever is not signed in', async () => {
    const response = await api.graphql(ENTRIES);

    expect(response.errors?.[0]?.message).toBe('Unauthorized');
  });

  it('cannot be added without a session', async () => {
    const response = await api.graphql(ADD, { input: { date: '2026-08-01', kg: 75 } });

    expect(response.errors?.[0]?.message).toBe('Unauthorized');
  });

  it('starts empty', async () => {
    const session = await api.signUp(OWNER, PASSWORD);

    const response = await api.graphql<{ myWeightEntries: Entry[] }>(ENTRIES, undefined, session);

    expect(response.data?.myWeightEntries).toEqual([]);
  });

  it('is added and comes back', async () => {
    const session = await api.signUp(OWNER, PASSWORD);

    const entry = await add(session, { date: '2026-08-01', kg: 75.4 });

    expect(entry.date).toBe('2026-08-01');
    expect(entry.kg).toBe(75.4);
  });

  it('rounds a weight to one decimal', async () => {
    const session = await api.signUp(OWNER, PASSWORD);

    const entry = await add(session, { date: '2026-08-01', kg: 75.449 });

    expect(entry.kg).toBe(75.4);
  });

  it('refuses a weight outside the realistic range', async () => {
    const session = await api.signUp(OWNER, PASSWORD);
    const { maxKg } = weightEntryConstraints();

    const response = await api.graphql<{ addWeightEntry: Entry }>(
      ADD,
      { input: { date: '2026-08-01', kg: maxKg + 1 } },
      session,
    );

    expect(response.errors?.[0]?.message).toBeDefined();
    expect(response.data?.addWeightEntry).toBeUndefined();
  });

  it('refuses a date in the future', async () => {
    const session = await api.signUp(OWNER, PASSWORD);
    const nextYear = String(new Date().getFullYear() + 1);

    const response = await api.graphql<{ addWeightEntry: Entry }>(
      ADD,
      { input: { date: `${nextYear}-01-01`, kg: 75 } },
      session,
    );

    expect(response.errors?.[0]?.message).toBeDefined();
    expect(response.data?.addWeightEntry).toBeUndefined();
  });

  it('refuses a malformed date', async () => {
    const session = await api.signUp(OWNER, PASSWORD);

    const response = await api.graphql(ADD, { input: { date: 'not-a-date', kg: 75 } }, session);

    expect(response.errors?.[0]?.message).toBeDefined();
  });

  it('lists newest first', async () => {
    const session = await api.signUp(OWNER, PASSWORD);
    await add(session, { date: '2026-07-01', kg: 74 });
    await add(session, { date: '2026-08-01', kg: 75 });
    await add(session, { date: '2026-07-15', kg: 74.5 });

    const response = await api.graphql<{ myWeightEntries: Entry[] }>(ENTRIES, undefined, session);

    expect(response.data?.myWeightEntries.map((entry): string => entry.date)).toEqual([
      '2026-08-01',
      '2026-07-15',
      '2026-07-01',
    ]);
  });
});

describe('correcting and removing a weigh-in', () => {
  it('replaces it wholesale', async () => {
    const session = await api.signUp(OWNER, PASSWORD);
    const entry = await add(session, { date: '2026-08-01', kg: 75 });

    const response = await api.graphql<{ updateWeightEntry: Entry }>(
      UPDATE,
      { input: { id: entry.id, date: '2026-08-02', kg: 76.2 } },
      session,
    );

    expect(response.data?.updateWeightEntry).toEqual({
      id: entry.id,
      date: '2026-08-02',
      kg: 76.2,
    });
  });

  it('removes it from the diary', async () => {
    const session = await api.signUp(OWNER, PASSWORD);
    const entry = await add(session);

    await api.graphql(DELETE, { id: entry.id }, session);

    const response = await api.graphql<{ myWeightEntries: Entry[] }>(ENTRIES, undefined, session);
    expect(response.data?.myWeightEntries).toHaveLength(0);
  });
});

describe('whose diary it is', () => {
  it('shows nobody else’s weigh-ins', async () => {
    const owner = await api.signUp(OWNER, PASSWORD);
    await add(owner);
    const other = await api.signUp(SOMEBODY_ELSE, PASSWORD);

    const response = await api.graphql<{ myWeightEntries: Entry[] }>(ENTRIES, undefined, other);

    expect(response.data?.myWeightEntries).toHaveLength(0);
  });

  it('refuses to edit somebody else’s entry, without saying it exists', async () => {
    const owner = await api.signUp(OWNER, PASSWORD);
    const entry = await add(owner);
    const other = await api.signUp(SOMEBODY_ELSE, PASSWORD);

    const response = await api.graphql(
      UPDATE,
      { input: { id: entry.id, date: '2026-08-01', kg: 60 } },
      other,
    );

    expect(response.errors?.[0]?.message).toBe('No such weigh-in.');
  });

  it('refuses to remove somebody else’s entry', async () => {
    const owner = await api.signUp(OWNER, PASSWORD);
    const entry = await add(owner);
    const other = await api.signUp(SOMEBODY_ELSE, PASSWORD);

    await api.graphql(DELETE, { id: entry.id }, other);

    const still = await api.graphql<{ myWeightEntries: Entry[] }>(ENTRIES, undefined, owner);
    expect(still.data?.myWeightEntries).toHaveLength(1);
  });
});
