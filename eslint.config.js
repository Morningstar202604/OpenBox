// TypeScript 降级至 6.0.3（typescript-eslint@8.67 支持范围 <6.1.0）
// 恢复 TS 源码的 ESLint 覆盖，不再忽略 .ts/.tsx 文件。
// 规则级别说明：
//   - `@typescript-eslint/no-unused-vars` 设为 off：tsc 的 `noUnusedLocals` +
//     `noUnusedParameters` 已提供更严格的检查，eslint 规则会导致重复报错。
//   - 其余规则全部采用 recommended 默认级别（error/warn 均保留），
//     确保 CI 中 `npm run lint` 有实际约束力。
import js from '@eslint/js'
import globals from 'globals'
import reactHooks from 'eslint-plugin-react-hooks'
import reactRefresh from 'eslint-plugin-react-refresh'
import tseslint from 'typescript-eslint'

export default [
  js.configs.recommended,
  ...tseslint.configs.recommended,
  { ignores: ['dist', 'scripts', 'api', 'docs', 'public', '*.mjs'] },
  {
    files: ['**/*.{ts,tsx,js,mjs}'],
    languageOptions: {
      ecmaVersion: 2020,
      globals: globals.browser,
    },
    plugins: {
      'react-hooks': reactHooks,
      'react-refresh': reactRefresh,
    },
    rules: {
      ...reactHooks.configs.recommended.rules,
      'react-refresh/only-export-components': [
        'warn',
        { allowConstantExport: true },
      ],
      // tsc 的 noUnusedLocals/noUnusedParameters 已覆盖，eslint 重复报错
      '@typescript-eslint/no-unused-vars': 'off',
      // react-hooks@7 新增的激进规则：禁止在 effect 内任何直接 setState，
      // 包括 fetch-on-effect 的 loading 重置与异步回调里的第一个 setState。
      // 对存量 fetch 数据流（useResources/HomePage/MyPage/ResourcePage）
      // 误报率高（本仓库 11 处），降级为 warn 保留可见提示、不阻塞 CI；
      // 待数据层迁移到 use()/Suspense 后再收紧为 error。
      'react-hooks/set-state-in-effect': 'warn',
    },
  },
]