import { init } from '#build/nuxt-icon-client-bundle.mjs';
import { provideServerIconBundle } from '../utils/serverIconBundle';

// The server writes the icons a page draws into the page itself, so it needs the
// whole bundle at once, synchronously.
export default defineNuxtPlugin((): void => {
  provideServerIconBundle(init);
});
