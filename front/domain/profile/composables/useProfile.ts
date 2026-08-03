import type { MyProfileQuery, MeasurementsInput } from '#gql';

export type Profile = NonNullable<MyProfileQuery['myProfile']>;
export type Targets = Profile['targets'];

export const useProfile = (): {
  profile: Ref<Profile | undefined>;
  isLoading: ComputedRef<boolean>;
  hasAnswered: ComputedRef<boolean>;
  refresh: () => Promise<void>;
  save: (input: MeasurementsInput) => Promise<Profile | undefined>;
} => {
  // Same reasoning as the session: browser-only, so the prerender never calls
  // the API, and one shared request across the components that read it.
  const { data, status, refresh } = useAsyncData(
    'my-profile',
    async (): Promise<Profile | undefined> => {
      const result = await GqlMyProfile().catch((): undefined => undefined);
      return result?.myProfile ?? undefined;
    },
    { server: false, dedupe: 'defer' },
  );

  const save = async (input: MeasurementsInput): Promise<Profile | undefined> => {
    const result = await GqlSaveProfile({ input });
    data.value = result.saveProfile;

    return result.saveProfile;
  };

  return {
    profile: data,
    isLoading: computed((): boolean => status.value === 'pending'),
    hasAnswered: computed((): boolean => data.value !== undefined),
    refresh: async (): Promise<void> => {
      await refresh();
    },
    save,
  };
};
