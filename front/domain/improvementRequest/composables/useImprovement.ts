import type { ImprovementImportance } from '#gql/default';

export type SuggestionState = 'writing' | 'sending' | 'sent' | 'failed';

// Shared so the account menu and any button open the same dialog: two ways in,
// one conversation. The sibling of useBugReport — one says something is broken,
// this one says something is missing.
export const useImprovement = (): {
  isOpen: Ref<boolean>;
  state: Ref<SuggestionState>;
  open: () => void;
  close: () => void;
  send: (importance: ImprovementImportance, message: string) => Promise<void>;
} => {
  const isOpen = useState<boolean>('improvement:open', (): boolean => false);
  const state = useState<SuggestionState>('improvement:state', (): SuggestionState => 'writing');
  const route = useRoute();
  const { locale } = useNuxtApp().$i18n;

  // Read at the moment of sending, in the browser, because that is the only
  // place any of it exists — and the whole point is that nobody has to type it.
  const contextNow = (): {
    page: string;
    userAgent: string;
    viewport: string;
    locale: string;
  } => ({
    page: route.fullPath,
    userAgent: navigator.userAgent,
    viewport: `${window.innerWidth}x${window.innerHeight}`,
    locale: locale.value,
  });

  return {
    isOpen,
    state,
    open: (): void => {
      state.value = 'writing';
      isOpen.value = true;
    },
    close: (): void => {
      isOpen.value = false;
    },
    send: async (importance: ImprovementImportance, message: string): Promise<void> => {
      state.value = 'sending';
      try {
        await GqlRequestImprovement({ input: { importance, message, context: contextNow() } });
        state.value = 'sent';
      } catch {
        // The words are still in the box behind this message: a failed send must
        // never cost somebody the idea they just wrote.
        state.value = 'failed';
      }
    },
  };
};
