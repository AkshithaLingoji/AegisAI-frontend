import js from '@eslint/js'
import globals from 'globals'
import reactHooks from 'eslint-plugin-react-hooks'
import tseslint from 'typescript-eslint'

/**
 * Architecture rule: UI code may only talk to the service *contracts*
 * (via `@/services`). Mock data and backend adapters are implementation
 * details of the service layer and must never be imported directly.
 */
const isolateServiceImplementations = {
  patterns: [
    {
      group: [
        '**/services/mock',
        '**/services/mock/**',
        '**/services/backend',
        '**/services/backend/**',
      ],
      message:
        'Import from "@/services" (contracts + selected implementation) instead. Mock and backend adapters are private to src/services.',
    },
  ],
}

export default tseslint.config(
  {
    ignores: [
      'dist',
      'node_modules',
      'playwright-report',
      'test-results',
      'docs/screenshots',
    ],
  },
  js.configs.recommended,
  ...tseslint.configs.recommended,
  {
    files: ['**/*.{ts,tsx}'],
    languageOptions: { globals: { ...globals.browser } },
    plugins: { 'react-hooks': reactHooks },
    rules: {
      ...reactHooks.configs.recommended.rules,
      'no-restricted-imports': ['error', isolateServiceImplementations],
      '@typescript-eslint/consistent-type-imports': 'error',
      '@typescript-eslint/no-unused-vars': [
        'error',
        { ignoreRestSiblings: true, argsIgnorePattern: '^_', varsIgnorePattern: '^_' },
      ],
    },
  },
  {
    // The service layer owns its implementations; tests may inspect them.
    files: ['src/services/**', '**/*.test.{ts,tsx}', 'tests/**'],
    rules: { 'no-restricted-imports': 'off' },
  },
  {
    files: ['*.config.{js,ts}', 'tests/**'],
    languageOptions: { globals: { ...globals.node } },
  },
)
