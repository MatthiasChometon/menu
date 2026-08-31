import { defineContentScript } from '#imports';
import { startCarrefourContent } from '../domain/carrefour/content';

export default defineContentScript({
  matches: ['https://www.carrefour.fr/*'],
  runAt: 'document_idle',
  main(): void {
    startCarrefourContent();
  },
});
