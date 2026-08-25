import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'

// https://vite.dev/config/
export default defineConfig(({ mode }) => ({
  // 默认 /OpenBox/ 用于 GitHub Pages 子路径部署；
  // Cloudflare Pages 走自定义根域名时设置 VITE_BASE_URL=/ 即可切换，二者互不影响。
  base: process.env.VITE_BASE_URL ?? '/OpenBox/',
  build: {
    // 默认输出到 docs/（base=/OpenBox/），随 main 分支提交供 GitHub Pages 从分支部署。
    // Cloudflare Pages 走根路径时需独立产物：VITE_BASE_URL=/ VITE_BUILD_DIR=dist npm run build
    outDir: process.env.VITE_BUILD_DIR ?? 'docs',
    sourcemap: 'hidden',
    rollupOptions: {
      output: {
        manualChunks(id) {
          // node_modules 中的依赖按用途拆分，独立缓存、并行加载
          if (id.includes('node_modules')) {
            if (id.includes('@supabase/supabase-js')) return 'supabase';
            if (id.includes('lucide-react')) return 'icons';
            if (
              id.includes('/react-dom/') ||
              id.includes('/react/') ||
              id.includes('/scheduler/')
            ) {
              return 'react-vendor';
            }
            return 'vendor';
          }
          // 站点数据集是大体积静态资源，单独成块；
          // i18n 语言包不在此合并——en/ja 需保持独立异步 chunk 按需加载
          if (id.includes('src/data/sites')) return 'sites-data';
          return undefined;
        },
      },
    },
  },
  resolve: {
    tsconfigPaths: true,
  },
  plugins: [
    react({
      babel: {
        // dev-locator 仅开发期注入：生产构建零转换开销与产物膨胀
        plugins: mode === 'development' ? ['react-dev-locator'] : [],
      },
    }),
    // PWA 离线能力（兑现 slogans 的离线承诺）：precache 应用外壳，
    // 深链导航回退到 index.html 由前端路由接管。manifest 随 base 自动适配子路径。
    // globPatterns 刻意不含分类/资源目录下的 index.html（gen-spa-paths 生成的数百份
    // 副本不进 precache，避免缓存膨胀）；离线深链由 navigateFallback 兜底。
    // 注意：vitest 会加载本配置，PWA 插件的构建期钩子在测试模式下会挂起，必须跳过。
    ...(mode === 'test'
      ? []
      : [
          VitePWA({
            registerType: 'autoUpdate',
            includeAssets: ['favicon.svg'],
            manifest: {
              id: process.env.VITE_BASE_URL ? `${process.env.VITE_BASE_URL}` : '/',
              name: 'OpenBox · 开源 AI 资源导航',
              short_name: 'OpenBox',
              description:
                '聚合 AI 时代免费、可白嫖的开源资源导航：免费 API、中转站、AI 应用、工具与学习资料。',
              start_url: process.env.VITE_BASE_URL ?? '/',
              scope: process.env.VITE_BASE_URL ?? '/',
              display: 'standalone',
              background_color: '#0e0d0b',
              theme_color: '#0e0d0b',
              lang: 'zh-CN',
              categories: ['productivity', 'utilities'],
              icons: [
                {
                  src: `${process.env.VITE_BASE_URL ?? '/'}favicon.svg`,
                  sizes: 'any',
                  type: 'image/svg+xml',
                  purpose: 'any maskable',
                },
              ],
            },
            workbox: {
              navigateFallback: `${process.env.VITE_BASE_URL ?? '/'}index.html`,
              globPatterns: ['index.html', 'assets/**/*.{js,css,woff2}', 'favicon.svg'],
              // Supabase 等后端请求永不缓存，避免弱网下读到过期云数据
              navigateFallbackDenylist: [/^\/auth/],
            },
          }),
        ]),
  ],
}))
