// @ts-check
import nestjs from '@kilotrace/eslint-config/nestjs';

export default [
  ...nestjs,
  {
    languageOptions: {
      parserOptions: {
        tsconfigRootDir: import.meta.dirname,
      },
    },
  },
];
