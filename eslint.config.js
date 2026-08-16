import reactHooks from 'eslint-plugin-react-hooks'

export default [
  { ignores: ['node_modules', 'dist', 'build', 'src-tauri', 'coverage'] },
  {
    files: ['src/**/*.js', 'src/**/*.jsx'],
    languageOptions: {
      ecmaVersion: 2024,
      sourceType: 'module',
      parserOptions: { ecmaFeatures: { jsx: true } }
    },
    plugins: {
      'react-hooks': reactHooks
    },
    rules: {
      'no-unused-vars': 'off',
      'react-hooks/exhaustive-deps': 'off',
      'no-console': ['warn', { allow: ['warn', 'error'] }]
    }
  }
]
