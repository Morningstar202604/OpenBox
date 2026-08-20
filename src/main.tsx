import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App';
import './index.css';
import ErrorBoundary from '@/components/ErrorBoundary';

// SPA 滚动重置：交由代码手动控制，禁止浏览器自动恢复上一页滚动位置
// （否则 hash 路由切换后新页面会停留在旧页面的滚动深度）。
if ('scrollRestoration' in history) {
  history.scrollRestoration = 'manual';
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ErrorBoundary>
      <App />
    </ErrorBoundary>
  </StrictMode>,
);
