import { useEffect, useState } from 'react';

/**
 * 顶部阅读进度条：随页面滚动实时反映已读比例。
 * 固定 2px 细线，品牌色 + 辉光；Landing 全屏无滚动时为 0，自然隐藏。
 */
export function ScrollProgress() {
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    const update = () => {
      const doc = document.documentElement;
      const max = doc.scrollHeight - window.innerHeight;
      setProgress(max > 0 ? Math.min(100, Math.max(0, (window.scrollY / max) * 100)) : 0);
    };
    update();
    window.addEventListener('scroll', update, { passive: true });
    window.addEventListener('resize', update);
    return () => {
      window.removeEventListener('scroll', update);
      window.removeEventListener('resize', update);
    };
  }, []);

  return <div className="scroll-progress" style={{ width: `${progress}%` }} />;
}
