import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { startTestApp, type TestApp } from '../../infrastructure/testing/e2e-app';
import { householdConstraints } from './utils';

const OWNER = 'matthias@example.com';
const SOMEBODY_ELSE = 'someone-else@example.com';
const PASSWORD = 'a-long-enough-password';

const ANSWERS = {
  sex: 'FEMALE',
  age: 30,
  heightCm: 165,
  weightKg: 60,
  dailyActivity: 'SEATED',
  trainingDaysPerWeek: 2,
  trainingType: 'CARDIO',
  starchQuality: 'WHOLEGRAIN',
  appetite: 'AVERAGE',
  goal: 'MAINTAIN',
};

const MEMBER_FIELDS = `id name weightKg goal targets { kcal protein fat carbs fiber }`;

const MEMBERS = `query { householdMembers { ${MEMBER_FIELDS} } }`;

const ADD = `
  mutation ($input: HouseholdMemberInput!) {
    addHouseholdMember(input: $input) { ${MEMBER_FIELDS} }
  }
`;

const UPDATE = `
  mutation ($input: UpdateHouseholdMemberInput!) {
    updateHouseholdMember(input: $input) { ${MEMBER_FIELDS} }
  }
`;

const REMOVE = `mutation ($id: ID!) { removeHouseholdMember(id: $id) }`;

type Member = {
  id: string;
  name: string;
  weightKg: number;
  goal: string;
  targets: { kcal: number; protein: number; fat: number; carbs: number; fiber: number };
};

let api: TestApp;

const add = async (name: string, session: string, answers = ANSWERS): Promise<Member> => {
  const response = await api.graphql<{ addHouseholdMember: Member }>(
    ADD,
    { input: { name, ...answers } },
    session,
  );

  if (response.data === undefined) throw new Error(response.errors?.[0]?.message);

  return response.data.addHouseholdMember;
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

describe('adding somebody to cook for', () => {
  it('works their targets out from their own answers, not the account holder’s', async () => {
    const session = await api.signUp(OWNER, PASSWORD);

    const member = await add('Camille', session);

    expect(member.name).toBe('Camille');
    expect(member.targets.kcal).toBeGreaterThan(0);
    expect(member.targets.protein).toBeGreaterThan(0);
  });

  it('keeps them in the order they were added', async () => {
    const session = await api.signUp(OWNER, PASSWORD);
    await add('Camille', session);
    await add('Sacha', session);
    await add('Alex', session);

    const response = await api.graphql<{ householdMembers: Member[] }>(MEMBERS, undefined, session);

    // Not alphabetical, and not by whoever was edited last: a list that
    // reorders itself under the cook is a list nobody trusts.
    expect(response.data?.householdMembers.map(({ name }): string => name)).toEqual([
      'Camille',
      'Sacha',
      'Alex',
    ]);
  });

  it('refuses more than a kitchen ever weighs for at once', async () => {
    const session = await api.signUp(OWNER, PASSWORD);
    const { maxMembers } = householdConstraints();
    for (let filled = 0; filled < maxMembers; filled += 1) await add(`N°${filled}`, session);

    const response = await api.graphql(ADD, { input: { name: 'Un de trop', ...ANSWERS } }, session);

    expect(response.errors?.[0]?.message).toContain(String(maxMembers));
  });

  it('refuses somebody with no name at all', async () => {
    const session = await api.signUp(OWNER, PASSWORD);

    const response = await api.graphql(ADD, { input: { name: '  ', ...ANSWERS } }, session);

    expect(response.errors?.[0]?.message).toBeDefined();
  });
});

describe('correcting and removing', () => {
  it('replaces the answers, and the targets follow', async () => {
    const session = await api.signUp(OWNER, PASSWORD);
    const member = await add('Camille', session);

    const response = await api.graphql<{ updateHouseholdMember: Member }>(
      UPDATE,
      { input: { id: member.id, name: 'Camille', ...ANSWERS, weightKg: 75, goal: 'GAIN_MUSCLE' } },
      session,
    );

    expect(response.data?.updateHouseholdMember.weightKg).toBe(75);
    expect(response.data?.updateHouseholdMember.targets.kcal).not.toBe(member.targets.kcal);
  });

  it('takes them off the list', async () => {
    const session = await api.signUp(OWNER, PASSWORD);
    const member = await add('Camille', session);

    await api.graphql(REMOVE, { id: member.id }, session);

    const response = await api.graphql<{ householdMembers: Member[] }>(MEMBERS, undefined, session);
    expect(response.data?.householdMembers).toHaveLength(0);
  });
});

describe('whose household it is', () => {
  it('shows nobody else’s people', async () => {
    const owner = await api.signUp(OWNER, PASSWORD);
    await add('Camille', owner);
    const other = await api.signUp(SOMEBODY_ELSE, PASSWORD);

    const response = await api.graphql<{ householdMembers: Member[] }>(MEMBERS, undefined, other);

    expect(response.data?.householdMembers).toHaveLength(0);
  });

  it('refuses to edit somebody else’s person, without saying they exist', async () => {
    const owner = await api.signUp(OWNER, PASSWORD);
    const member = await add('Camille', owner);
    const other = await api.signUp(SOMEBODY_ELSE, PASSWORD);

    const response = await api.graphql(
      UPDATE,
      { input: { id: member.id, name: 'Volé', ...ANSWERS } },
      other,
    );

    // The same answer a made-up identifier gets: anything else confirms that
    // the id belongs to somebody.
    expect(response.errors?.[0]?.message).toBe('No such member.');
  });

  it('refuses to remove somebody else’s person', async () => {
    const owner = await api.signUp(OWNER, PASSWORD);
    const member = await add('Camille', owner);
    const other = await api.signUp(SOMEBODY_ELSE, PASSWORD);

    await api.graphql(REMOVE, { id: member.id }, other);

    const still = await api.graphql<{ householdMembers: Member[] }>(MEMBERS, undefined, owner);
    expect(still.data?.householdMembers).toHaveLength(1);
  });

  it('answers nothing at all to a caller with no session', async () => {
    const response = await api.graphql(MEMBERS);

    expect(response.errors?.[0]?.message).toBeDefined();
  });
});
