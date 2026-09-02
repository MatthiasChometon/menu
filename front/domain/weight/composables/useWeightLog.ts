import type { WeightDraft, WeightEntry } from '../types/weight.type';

// The diary of the number the whole feature turns around, synced through the
// account rather than kept on this device — one shared request across every
// component that reads it, like the profile it sits beside.
export const useWeightLog = (): {
  entries: Ref<WeightEntry[]>;
  isLoading: ComputedRef<boolean>;
  hasFailed: ComputedRef<boolean>;
  bounds: { minKg: number; maxKg: number };
  todayDate: string;
  errorOf: (draft: WeightDraft) => string | undefined;
  add: (draft: WeightDraft) => Promise<void>;
  update: (id: string, draft: WeightDraft) => Promise<void>;
  remove: (id: string) => Promise<void>;
  refresh: () => Promise<void>;
} => {
  const { bounds, todayDate, errorOf } = useWeightValidation();

  // server: false because the session cookie only exists in the browser, and
  // the site is prerendered. dedupe: 'defer' so the form, the chart, the coach
  // card and the list — all mounted together — share the one request. Left to
  // throw rather than caught here, so the page can tell "failed to load" apart
  // from "nothing logged yet" instead of the two looking identical.
  const { data, status, error, refresh } = useAsyncData(
    'weight-entries',
    async (): Promise<WeightEntry[]> => (await GqlMyWeightEntries()).myWeightEntries,
    { server: false, dedupe: 'defer', default: (): WeightEntry[] => [] },
  );

  const reload = async (): Promise<void> => {
    await refresh();
  };

  return {
    entries: data as Ref<WeightEntry[]>,
    isLoading: computed((): boolean => status.value === 'pending'),
    hasFailed: computed((): boolean => error.value !== undefined),
    bounds,
    todayDate,
    errorOf,
    add: async (draft): Promise<void> => {
      if (errorOf(draft) !== undefined) return;

      await GqlAddWeightEntry({ input: draft });
      await reload();
    },
    update: async (id, draft): Promise<void> => {
      if (errorOf(draft) !== undefined) return;

      await GqlUpdateWeightEntry({ input: { id, ...draft } });
      await reload();
    },
    remove: async (id): Promise<void> => {
      await GqlDeleteWeightEntry({ id });
      await reload();
    },
    refresh: reload,
  };
};
