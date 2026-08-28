import { writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { defineConfig, type Plugin } from 'vite';
import { buildManifest, type Target } from './manifest.config';

// The manifest is written after the bundle, per target, rather than copied from
// public/: the two browsers need different ones and a static file cannot be both.
const emitManifest = (target: Target, outDir: string): Plugin => ({
  name: 'emit-manifest',
  closeBundle(): void {
    const path = resolve(import.meta.dirname, outDir, 'manifest.json');
    writeFileSync(path, `${JSON.stringify(buildManifest(target), null, 2)}\n`);
  },
});

// Chrome and Firefox get their own build, into their own folder, from the same
// code. `--mode firefox` switches the manifest and the output directory (chosen
// over an env prefix so the script runs the same on Windows); anything else is
// Chrome.
//
// One bundle per entry point: a service worker, a content script and a popup are
// loaded by the browser separately and cannot share a chunk.
export default defineConfig(({ mode }) => {
  const target: Target = mode === 'firefox' ? 'firefox' : 'chrome';
  const outDir = target === 'firefox' ? 'dist-firefox' : 'dist';

  return {
    build: {
      outDir,
      emptyOutDir: true,
      rollupOptions: {
        input: {
          'background/worker': resolve(import.meta.dirname, 'background/worker.ts'),
          'carrefour/content': resolve(import.meta.dirname, 'carrefour/content.ts'),
          'menu/bridge': resolve(import.meta.dirname, 'menu/bridge.ts'),
          popup: resolve(import.meta.dirname, 'popup/index.html'),
        },
        output: {
          entryFileNames: '[name].js',
          format: 'es',
        },
      },
    },
    plugins: [emitManifest(target, outDir)],
  };
});
