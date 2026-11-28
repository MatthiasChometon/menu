import { resolve } from 'node:path';
import VueI18nPlugin from '@intlify/unplugin-vue-i18n/vite';

// The messages @nuxtjs/i18n lists as `files` are compiled while building, which is
// what lets the browser drop the message compiler. The ones a page loads with its
// route (`domain/*/translation/<locale>.json`, see plugins/domainMessages.ts) are
// not in that list, so they are compiled here, the same way.
export const lazyMessagesPlugin = (): ReturnType<typeof VueI18nPlugin> =>
  VueI18nPlugin({
    include: [resolve('domain/*/translation/{fr,en}.json').replaceAll('\\', '/')],
    compositionOnly: true,
    fullInstall: false,
    runtimeOnly: false,
    dropMessageCompiler: false,
    allowDynamic: true,
  });
