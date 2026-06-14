/** @type {import('eslint').Linter.Config} */
module.exports = {
  root: true,
  extends: ['./packages/eslint-config/index.js'],
  parserOptions: {
    project: './tsconfig.json',
    tsconfigRootDir: __dirname,
  },
  rules: {
    // Root-level rules applied across all workspaces
  },
  ignorePatterns: [
    'node_modules/',
    'dist/',
    '.turbo/',
    'coverage/',
    '**/*.js',
    '!.eslintrc.js',
    '!packages/eslint-config/**/*.js',
    'infrastructure/',
    'tools/',
  ],
};
