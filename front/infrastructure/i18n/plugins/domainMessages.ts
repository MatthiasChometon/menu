declare module '#app' {
  // An interface because declaration merging is how Nuxt types its page meta.
  // eslint-disable-next-line @typescript-eslint/consistent-type-definitions
  interface PageMeta {
    // The domains whose messages the page reads, besides the shell every page has.
    translations?: string[];
  }
}

type Messages = Record<string, unknown>;

// `<locale>.shell.json` files ship with every page; the rest of a domain's
// messages (`<locale>.json`) is a chunk of its own. Each page names the domains it
// reads in `definePageMeta({ translations })`, and they arrive with its route.
const lazyMessages = import.meta.glob<Messages>('./*/translation/{fr,en}.json', {
  base: '../../../domain',
  import: 'default',
});

export default defineNuxtPlugin({
  name: 'domain-messages',
  dependsOn: ['i18n:plugin'],
  setup: (nuxtApp): void => {
    const { $i18n: i18n } = nuxtApp;
    const router = useRouter();
    const requested = new Set<string>();

    // A repeated import is served from the module cache, so a message set merged
    // twice costs nothing but the merge.
    const loadAll = async (locale: string, domains: Iterable<string>): Promise<void> => {
      await Promise.all(
        [...domains].map(async (domain): Promise<void> => {
          const load = lazyMessages[`./${domain}/translation/${locale}.json`];
          if (load === undefined) throw new Error(`No ${locale} messages for "${domain}".`);
          i18n.mergeLocaleMessage(locale, await load());
        }),
      );
    };

    const localeOfPath = (path: string): string =>
      i18n.localeCodes.value.find(
        (code) =>
          code !== i18n.defaultLocale && (path === `/${code}` || path.startsWith(`/${code}/`)),
      ) ?? i18n.defaultLocale;

    const domainsOf = (meta: { translations?: unknown }): string[] =>
      Array.isArray(meta.translations) ? (meta.translations as string[]) : [];

    // The messages start downloading as the navigation starts, beside the page's own
    // chunk, and the navigation waits for them once that chunk is there.
    let pending: Promise<void> = Promise.resolve();
    router.beforeEach((to): void => {
      const domains = domainsOf(to.meta);
      domains.forEach((domain) => requested.add(domain));
      pending = loadAll(localeOfPath(to.path), domains);
    });
    router.beforeResolve(async (to): Promise<void> => {
      await pending;
      // The locale the route settled on can differ from the one its path suggests.
      await loadAll(i18n.locale.value, domainsOf(to.meta));
    });

    // A language switch re-renders the page in the other language before any
    // navigation: its messages have to be there first.
    nuxtApp.hook('i18n:beforeLocaleSwitch', ({ newLocale }): Promise<void> =>
      loadAll(newLocale, requested),
    );
  },
});
