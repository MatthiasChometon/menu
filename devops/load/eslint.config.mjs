import js from '@eslint/js';
import prettier from 'eslint-config-prettier';
import tseslint from 'typescript-eslint';

// The k6 scripts are not Node code: the rules that matter are the ones that keep them typed.
export default tseslint.config(
  js.configs.recommended,
  ...tseslint.configs.strictTypeChecked,
  prettier,
  {
    languageOptions: {
      parserOptions: { projectService: true, tsconfigRootDir: import.meta.dirname },
    },
    rules: {
      '@typescript-eslint/explicit-function-return-type': 'error',
      '@typescript-eslint/no-floating-promises': ['error', { ignoreVoid: false }],
      '@typescript-eslint/no-non-null-assertion': 'error',
      '@typescript-eslint/restrict-template-expressions': ['error', { allowNumber: true }],
      // @types/k6 declares its scenario options as classes, so every literal is flagged.
      '@typescript-eslint/no-unsafe-class-instance-assignment': 'off',
      'func-style': ['error', 'expression'],
    },
  },
  { ignores: ['node_modules/**', 'eslint.config.mjs'] },
);
