// @ts-check
const { FlatCompat } = require('@eslint/eslintrc');
const js = require('@eslint/js');

const compat = new FlatCompat({
  baseDirectory: __dirname,
  recommendedConfig: js.configs.recommended,
});

/** @type {import('eslint').Linter.FlatConfig[]} */
module.exports = [
  // Global ignores — must be first entry
  {
    ignores: [
      '**/node_modules/**',
      '**/dist/**',
      '**/.turbo/**',
      '**/coverage/**',
      'infrastructure/**',
      'tools/**',
      '**/*.js',
      'packages/eslint-config/**',
      // Test files excluded from tsconfig project — type-aware rules can't run on them
      '**/test/**',
      '**/*.spec.ts',
      '**/*.e2e-spec.ts',
      // Standalone seed/migration runner scripts use console and non-null assertions by design
      '**/database/seeds/**',
    ],
  },

  // TypeScript source files
  ...compat.extends('./packages/eslint-config/index.js'),

  {
    languageOptions: {
      parserOptions: {
        // project: true uses the nearest tsconfig.json for each file — correct for monorepos
        project: true,
        tsconfigRootDir: __dirname,
      },
    },
    rules: {
      // tsconfig noPropertyAccessFromIndexSignature requires bracket notation for index signatures
      // (e.g. process.env['NODE_ENV']). Allow both notations to avoid conflict.
      '@typescript-eslint/dot-notation': ['error', { allowIndexSignaturePropertyAccess: true }],
      // NestJS @Module({}) decorated stubs are valid empty classes
      '@typescript-eslint/no-extraneous-class': ['error', { allowWithDecorator: true }],
      // Numbers in template literals are safe: `${count}ms` is intentional
      '@typescript-eslint/restrict-template-expressions': ['error', { allowNumber: true }],
    },
  },
];
