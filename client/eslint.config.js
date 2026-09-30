import js from '@eslint/js'
import globals from 'globals'

export default [
  { ignores: ['dist/**'] },
  js.configs.recommended,
  {
    files: ['**/*.{js,jsx}'],
    languageOptions: {
      ecmaVersion: 'latest',
      sourceType: 'module',
      globals: { ...globals.browser, ...globals.node },
      parserOptions: { ecmaFeatures: { jsx: true } },
    },
  },
  {
    files: ['**/*.jsx'],
    // JSX references are not understood by eslint:recommended without a React JSX plugin.
    rules: { 'no-unused-vars': 'off' },
  },
]
