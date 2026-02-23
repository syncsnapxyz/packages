/**
 * Shared ESLint 9+ flat config base for all packages.
 * Import and spread in each package's eslint.config.js.
 */
import js from '@eslint/js';
import tseslint from 'typescript-eslint';
import eslintConfigPrettier from 'eslint-config-prettier';

export default [
  js.configs.recommended,
  ...tseslint.configs.recommended,
  eslintConfigPrettier,
  {
    ignores: ['dist/**', 'node_modules/**', '**/*.cjs'],
  },
];
