import vueI18n from '@intlify/eslint-plugin-vue-i18n';
import jsonc from 'eslint-plugin-jsonc';
import withNuxt from './.nuxt/eslint.config.mjs';

export default withNuxt(
  ...jsonc.configs['flat/recommended-with-json'],
  ...jsonc.configs['flat/prettier'],
  {
    rules: {
      'func-style': ['error', 'expression'],
      'prefer-arrow-callback': 'error',
      '@typescript-eslint/explicit-function-return-type': 'error',
      '@typescript-eslint/consistent-type-definitions': ['error', 'type'],
      'vue/multi-word-component-names': 'off',
      'vue/html-self-closing': ['error', { html: { void: 'always' } }],
      // Props are always destructured with inline defaults (Vue 3.5 reactive
      // props destructure), which this rule does not recognise.
      'vue/require-default-prop': 'off',
    },
  },
  {
    // Type-aware rules need the project service. The Nuxt tsconfig is a solution-style
    // file that references the generated ones, which typescript-eslint follows.
    files: ['**/*.{ts,vue}'],
    languageOptions: {
      parserOptions: {
        projectService: true,
        tsconfigRootDir: import.meta.dirname,
        extraFileExtensions: ['.vue'],
      },
    },
    rules: {
      '@typescript-eslint/no-explicit-any': 'error',
      '@typescript-eslint/no-non-null-assertion': 'error',
      '@typescript-eslint/no-floating-promises': 'error',
      '@typescript-eslint/no-unnecessary-condition': 'error',
      eqeqeq: ['error', 'always', { null: 'ignore' }],
      'no-console': 'error',
    },
  },
  {
    // Command-line scripts report through the console.
    files: ['**/scripts/**/*.ts'],
    rules: { 'no-console': 'off' },
  },
  {
    // A test may assert on a value it has just checked exists.
    files: ['**/*.test.ts'],
    rules: { '@typescript-eslint/no-non-null-assertion': 'off' },
  },
  {
    // The domain slices are refactored lot by lot (M6-M10): the last one deletes this
    // block, so these rules end up on everywhere.
    files: ['domain/**/*.{ts,vue}'],
    rules: {
      '@typescript-eslint/no-non-null-assertion': 'off',
      '@typescript-eslint/no-floating-promises': 'off',
      '@typescript-eslint/no-unnecessary-condition': 'off',
      'no-console': 'off',
    },
  },
  {
    files: ['infrastructure/**/*.{ts,vue}'],
    rules: {
      'no-restricted-imports': [
        'error',
        {
          patterns: [
            {
              group: ['**/domain/**', '~~/domain/**'],
              message: 'The infrastructure layer must never import the domain layer.',
            },
          ],
        },
      ],
    },
  },
  ...vueI18n.configs.recommended,
  {
    rules: {
      '@intlify/vue-i18n/no-raw-text': [
        'error',
        {
          ignorePattern: '^[-—·.,:/©≈~€%°0-9\\s]+$',
        },
      ],
    },
    settings: {
      'vue-i18n': {
        localeDir: './**/translation/*.json',
        messageSyntaxVersion: '^11.0.0',
      },
    },
  },
  {
    // The menu slice is the first one with every key literal (see useMenuLabels); the
    // other slices turn it on as their own lot lands.
    files: ['domain/menu/**/*.{ts,vue}'],
    rules: { '@intlify/vue-i18n/no-dynamic-keys': 'error' },
  },
);
