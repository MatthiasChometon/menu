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
);
