import js from '@eslint/js';
import tseslint from 'typescript-eslint';
import prettier from 'eslint-config-prettier';
import globals from 'globals';

export default tseslint.config(
  { ignores: ['dist/', 'dev-dist/', 'node_modules/', 'coverage/', 'prototype/', 'public/'] },
  js.configs.recommended,
  ...tseslint.configs.recommended,
  {
    languageOptions: { globals: { ...globals.browser } },
    rules: {
      '@typescript-eslint/no-unused-vars': ['error', { argsIgnorePattern: '^_' }],
      'no-restricted-globals': ['error', 'event', 'name', 'status'],
    },
  },
  {
    files: ['scripts/**/*.mjs', 'scripts/**/*.ts', '*.config.*'],
    languageOptions: { globals: { ...globals.node } },
  },
  prettier,
);
