import { resolve } from 'node:path';
import { defineConfig } from 'vite';

// One bundle per entry point: a service worker, a content script and a popup
// are loaded by the browser separately and cannot share a chunk.
export default defineConfig({
  build: {
    outDir: 'dist',
    emptyOutDir: true,
    rollupOptions: {
      input: {
        'background/worker': resolve(import.meta.dirname, 'background/worker.ts'),
        'carrefour/content': resolve(import.meta.dirname, 'carrefour/content.ts'),
        popup: resolve(import.meta.dirname, 'popup/index.html'),
      },
      output: {
        entryFileNames: '[name].js',
        format: 'es',
      },
    },
  },
});
