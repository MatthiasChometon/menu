import { useNuxtApp } from '#imports';
import { beforeEach } from 'vitest';

type Messages = Record<string, unknown>;

// In the app a page loads the domains it names with its route (see
// infrastructure/i18n/plugins/domainMessages.ts); a component test mounts one
// component with no route, so it gets every domain before each test.
const lazyMessages = import.meta.glob<Messages>('./domain/*/translation/{fr,en}.json', {
  eager: true,
  import: 'default',
});

beforeEach(() => {
  const { $i18n: i18n } = useNuxtApp();
  for (const [path, messages] of Object.entries(lazyMessages)) {
    const locale = /\/(fr|en)\.json$/.exec(path)?.[1] ?? '';
    i18n.mergeLocaleMessage(locale, messages);
  }
});
