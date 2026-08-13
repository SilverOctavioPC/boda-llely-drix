import js from '@eslint/js'
import globals from 'globals'
import react from 'eslint-plugin-react'
import reactHooks from 'eslint-plugin-react-hooks'
import reactRefresh from 'eslint-plugin-react-refresh'
import prettier from 'eslint-config-prettier'

/**
 * Reglas de linting.
 *
 * `eslint-config-prettier` va SIEMPRE al final: apaga las reglas de formato
 * para que ESLint y Prettier no se peleen. ESLint vigila errores, Prettier
 * vigila el formato.
 */
export default [
  { ignores: ['dist/**', 'salida/**', 'node_modules/**'] },

  js.configs.recommended,

  // ---- Aplicación (navegador) ----
  {
    files: ['src/**/*.{js,jsx}'],
    languageOptions: {
      ecmaVersion: 2022,
      sourceType: 'module',
      globals: globals.browser,
      parserOptions: {
        ecmaFeatures: { jsx: true },
      },
    },
    settings: { react: { version: 'detect' } },
    plugins: {
      react,
      'react-hooks': reactHooks,
      'react-refresh': reactRefresh,
    },
    rules: {
      ...react.configs.flat.recommended.rules,
      ...react.configs.flat['jsx-runtime'].rules,
      ...reactHooks.configs.flat.recommended.rules,

      // El proyecto no usa PropTypes ni TypeScript; validar props aquí sería
      // ruido sin red de seguridad real.
      'react/prop-types': 'off',

      // Detecta componentes que romperían el hot reload de Vite.
      'react-refresh/only-export-components': ['warn', { allowConstantExport: true }],

      'no-unused-vars': ['error', { argsIgnorePattern: '^_', varsIgnorePattern: '^_' }],
    },
  },

  // ---- Scripts de Node (migración, siembra, verificación) ----
  {
    files: ['scripts/**/*.js', '*.config.js', 'eslint.config.js'],
    languageOptions: {
      ecmaVersion: 2022,
      sourceType: 'module',
      globals: globals.node,
    },
    rules: {
      // Los scripts se comunican por consola: es su interfaz, no depuración.
      'no-console': 'off',
      'no-unused-vars': ['error', { argsIgnorePattern: '^_', varsIgnorePattern: '^_' }],
    },
  },

  // ---- Tests ----
  {
    files: ['**/*.test.js'],
    languageOptions: {
      ecmaVersion: 2022,
      sourceType: 'module',
      globals: { ...globals.node, ...globals.vitest },
    },
  },

  prettier,
]
