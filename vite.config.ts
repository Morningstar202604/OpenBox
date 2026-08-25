import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

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
  ],
}))
