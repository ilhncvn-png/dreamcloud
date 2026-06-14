/** @type {import('eslint').Linter.Config} */
module.exports = {
  extends: [require.resolve('./index.js')],
  rules: {
    '@typescript-eslint/explicit-function-return-type': 'off',
    'react-hooks/rules-of-hooks': 'error',
    'react-hooks/exhaustive-deps': 'warn',
  },
};
