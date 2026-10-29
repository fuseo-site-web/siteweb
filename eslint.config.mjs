import { defineConfig, globalIgnores } from 'eslint/config';
import nextVitals from 'eslint-config-next/core-web-vitals';
import nextTs from 'eslint-config-next/typescript';

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  // Override default ignores of eslint-config-next.
  globalIgnores([
    // Default ignores of eslint-config-next:
    '.next/**',
    '.next-e2e/**',
    'test-results/**',
    'playwright-report/**',
    'out/**',
    'build/**',
    'next-env.d.ts',
    'tests/golden/legacy/**',
  ]),
  // Moteur porté mécaniquement depuis le prototype (parité garantie par tests/golden) : typage progressif.
  {
    files: ['src/engine/**'],
    rules: { 'prefer-const': 'off', '@typescript-eslint/no-unused-vars': 'off' },
  },
  // Scripts et utilitaires Node en CommonJS.
  {
    files: ['**/*.cjs', 'scripts/**'],
    rules: { '@typescript-eslint/no-require-imports': 'off' },
  },
]);

export default eslintConfig;
