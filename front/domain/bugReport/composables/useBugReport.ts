import type { BugSeverity } from '#gql/default';

export type ReportState = 'writing' | 'sending' | 'sent' | 'failed';

// Shared so the floating button and the account menu open the same dialog:
// two ways in, one conversation.
export const useBugReport = (): {
  isOpen: Ref<boolean>;
  state: Ref<ReportState>;
  open: () => void;
  close: () => void;
  send: (severity: BugSeverity, message: string) => Promise<void>;
} => {
  const isOpen = useState<boolean>('bug:open', (): boolean => false);
  const state = useState<ReportState>('bug:state', (): ReportState => 'writing');
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
      // Reset on the way in, not on the way out: closing the dialog on the
      // thank-you screen should not blank it while it fades away.
      state.value = 'writing';
      isOpen.value = true;
    },
    close: (): void => {
      isOpen.value = false;
    },
    send: async (severity: BugSeverity, message: string): Promise<void> => {
      state.value = 'sending';
      try {
        await GqlReportBug({ input: { severity, message, context: contextNow() } });
        state.value = 'sent';
      } catch {
        // The words are still in the box behind this message: a failed send
        // must never cost somebody the paragraph they just wrote.
        state.value = 'failed';
      }
    },
  };
};
