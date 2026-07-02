import reactHooks from 'eslint-plugin-react-hooks'
import unusedImports from 'eslint-plugin-unused-imports'

export default [
  { ignores: ['node_modules', 'dist', 'build', 'src-tauri', 'coverage'] },
  {
    files: ['src/**/*.js', 'src/**/*.jsx'],
    languageOptions: {
      ecmaVersion: 2024,
      sourceType: 'module',
      parserOptions: { ecmaFeatures: { jsx: true } },
    },
    plugins: {
      'react-hooks': reactHooks,
      'unused-imports': unusedImports,
    },
    rules: {
      'no-unused-vars': 'off',
      'unused-imports/no-unused-imports': 'warn',
      'unused-imports/no-unused-vars': ['warn', {
        argsIgnorePattern: '^_|^node$|^timestamp$',
        varsIgnorePattern: '^_|^(About|BulletinAddress|BookmarkAddress|BulletinFollow|BulletinRandom|BulletinTag|BulletinView|ChatHome|Portal|ServerAddress|Setting)Page$'
      }],
      'react-hooks/exhaustive-deps': 'off',
      'no-console': ['warn', { allow: ['warn', 'error'] }],
    },
  },
]
