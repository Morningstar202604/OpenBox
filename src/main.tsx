import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App';
import './index.css';
import ErrorBoundary from '@/components/ErrorBoundary';
import { prepareLocale } from '@/i18n/useI18n';

// SPA 滚动重置：交由代码手动控制，禁止浏览器自动恢复上一页滚动位置
// （否则路由切换后新页面会停留在旧页面的滚动深度）。
if ('scrollRestoration' in history) {
  history.scrollRestoration = 'manual';
}

// 首屏前确保当前语言包就绪（zh 立即通过；en/ja 动态 chunk 加载完再挂载，避免闪中文）
await prepareLocale();

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ErrorBoundary>
      <App />
    </ErrorBoundary>
  </StrictMode>,
);
