import { useState } from 'react';
import { copyText } from '@/lib/clipboard';
import { useToastStore } from '@/store/useToastStore';
import { Icon } from './Icon';

/**
 * 代码块组件：终端风格 + 一键复制
 * 轻量实现，不引入语法高亮库，用等宽字体 + 深色背景保证可读性
 */
export function CodeBlock({
  code,
  language = 'bash',
  title,
}: {
  code: string;
  language?: string;
  title?: string;
}) {
  const [copied, setCopied] = useState(false);
  const push = useToastStore((s) => s.push);

  const handleCopy = async () => {
    if (await copyText(code)) {
      push('代码已复制到剪贴板', 'success');
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } else {
      push('复制失败，请手动选择', 'error');
    }
  };

  return (
    <div className="overflow-hidden rounded-xl border border-[var(--color-border)]">
      {/* 标题栏：语言标签 + 复制按钮 */}
      <div className="flex items-center justify-between border-b border-[var(--color-border)] bg-[var(--color-bg-soft)] px-3 py-2">
        <div className="flex items-center gap-2">
          {/* 终端三个圆点 */}
          <span className="flex gap-1.5">
            <span className="h-2.5 w-2.5 rounded-full bg-[#ff5f56]" />
            <span className="h-2.5 w-2.5 rounded-full bg-[#ffbd2e]" />
            <span className="h-2.5 w-2.5 rounded-full bg-[#27c93f]" />
          </span>
          <span className="ml-1 font-mono text-xs text-[var(--color-muted)]">
            {title || language}
          </span>
        </div>
        <button
          onClick={handleCopy}
          className="flex items-center gap-1 rounded-md px-2 py-1 text-xs text-[var(--color-muted)] transition-colors hover:bg-[var(--color-primary-soft)] hover:text-[var(--color-primary)]"
          aria-label="复制代码"
        >
          <Icon name={copied ? 'Check' : 'Copy'} size={13} />
          {copied ? '已复制' : '复制'}
        </button>
      </div>
      {/* 代码内容 */}
      <pre className="overflow-x-auto bg-[#0d1117] p-4 text-sm leading-relaxed">
        <code className="font-mono text-[#e6edf3]">{code}</code>
      </pre>
    </div>
  );
}
