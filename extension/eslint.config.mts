import eslint from '@eslint/js';
import { defineConfig } from 'eslint/config';
import eslintConfigPrettier from 'eslint-config-prettier';
import globals from 'globals';
import tseslint from 'typescript-eslint';
import autoImports from './.wxt/eslint-auto-imports.mjs';

export default defineConfig(
  {
    ignores: ['.wxt/**', '.output/**', 'eslint.config.mts', 'vitest.config.ts', 'wxt.config.ts'],
  },
  // WXT's generated globals, so the linter knows the auto-imported `browser`,
  // `defineBackground`, `defineContentScript`, and the rest.
  autoImports,
  eslint.configs.recommended,
  ...tseslint.configs.recommendedTypeChecked,
  {
    languageOptions: {
      globals: {
        ...globals.browser,
        ...globals.webextensions,
        describe: 'readonly',
        it: 'readonly',
        expect: 'readonly',
        beforeEach: 'readonly',
        afterEach: 'readonly',
        vi: 'readonly',
      },
      parserOptions: {
        projectService: true,
        tsconfigRootDir: import.meta.dirname,
      },
    },
  },
  {
    // The engine decides what to do; only the client adapter may reach the
    // network. Keeping it that way is what makes the engine testable without a
    // browser or a shop.
    files: ['domain/carrefour/**/*.ts'],
    rules: {
      'no-restricted-globals': [
        'error',
        { name: 'fetch', message: 'the engine goes through its clients, never the network.' },
      ],
    },
  },
  {
    // The client is the adapter: the one place the shop is actually called.
    files: ['domain/carrefour/client.ts'],
    rules: { 'no-restricted-globals': 'off' },
  },
  {
    rules: {
      '@typescript-eslint/no-floating-promises': 'error',
      '@typescript-eslint/consistent-type-definitions': ['error', 'type'],
      'func-style': ['error', 'expression'],
      'prefer-arrow-callback': 'error',
      '@typescript-eslint/explicit-function-return-type': [
        'error',
        {
          allowExpressions: true,
          allowTypedFunctionExpressions: true,
          allowHigherOrderFunctions: true,
          allowIIFEs: false,
        },
      ],
    },
  },
  eslintConfigPrettier,
);
