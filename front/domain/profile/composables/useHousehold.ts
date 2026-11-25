import type { HouseholdMembersQuery, HouseholdMemberInput } from '#gql';

export type Member = HouseholdMembersQuery['householdMembers'][number];

/** A member's answers, without their name or the targets worked out from them. */
export type MemberAnswers = Omit<Member, 'id' | 'name' | 'targets'>;

export const answersOfMember = (member: Member): MemberAnswers => {
  const { id: _id, name: _name, targets: _targets, ...answers } = member;

  return answers;
};

export const useHousehold = (): {
  members: Ref<Member[]>;
  isLoading: ComputedRef<boolean>;
  hasFailed: ComputedRef<boolean>;
  refresh: () => Promise<void>;
  add: (name: string, answers: MemberAnswers) => Promise<void>;
  update: (id: string, name: string, answers: MemberAnswers) => Promise<void>;
  remove: (id: string) => Promise<void>;
} => {
  // Browser-only and shared, like the profile it sits beside: the prerender has
  // no session cookie, so asking the API there would only ever return nothing.
  const { data, status, error, refresh } = useAsyncData(
    'household-members',
    async (): Promise<Member[]> => {
      try {
        // An answer without the list (a partial reply) is an empty household.
        const result: Partial<HouseholdMembersQuery> = await GqlHouseholdMembers();

        return result.householdMembers ?? [];
      } catch (failure) {
        if (isUnauthenticated(failure)) return [];
        throw failure;
      }
    },
    { server: false, dedupe: 'defer', default: (): Member[] => [] },
  );

  const reload = async (): Promise<void> => {
    await refresh();
  };

  const inputOf = (name: string, answers: MemberAnswers): HouseholdMemberInput => ({
    name,
    ...answers,
  });

  return {
    members: data,
    isLoading: computed((): boolean => status.value === 'pending'),
    hasFailed: computed((): boolean => error.value !== undefined),
    refresh: reload,
    // Reloaded rather than patched in place: the list is ordered by the server,
    // and guessing where a new person belongs is how a list starts to disagree
    // with the one behind it.
    add: async (name, answers): Promise<void> => {
      await GqlAddHouseholdMember({ input: inputOf(name, answers) });
      await reload();
    },
    update: async (id, name, answers): Promise<void> => {
      await GqlUpdateHouseholdMember({ input: { id, ...inputOf(name, answers) } });
      await reload();
    },
    remove: async (id): Promise<void> => {
      await GqlRemoveHouseholdMember({ id });
      await reload();
    },
  };
};
