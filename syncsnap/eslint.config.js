import baseConfig from '../eslint.config.base.mjs';
import globals from 'globals';

export default [
  ...baseConfig,
  {
    languageOptions: {
      ecmaVersion: 'latest',
      sourceType: 'module',
      globals: { ...globals.node },
    },
  },
];
