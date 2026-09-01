import { useState, useRef, useEffect } from 'react';
import { useApiKeys } from '@/store/useApiKeys';
import { Icon } from './Icon';

interface ApiKeySelectorProps {
  onSelect: (key: string, baseUrl: string) => void;
  currentBaseUrl?: string;
  currentKey?: string;
}

/**
 * API Key 快速选择器
 * 下拉展示已保存的 Key，选择后自动填充 baseUrl 和 apiKey
 */
export function ApiKeySelector({ onSelect, currentBaseUrl, currentKey }: ApiKeySelectorProps) {
  const { keys, activeKey, setActive, maskKey } = useApiKeys();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  // 判断当前输入是否匹配某个已保存的 Key
  const matched = keys.find((k) => k.baseUrl === currentBaseUrl && k.key === currentKey);

  const handleSelect = (id: string) => {
    const entry = keys.find((k) => k.id === id);
    if (entry) {
      setActive(id);
      onSelect(entry.key, entry.baseUrl);
    }
    setOpen(false);
  };

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className="btn btn-ghost btn-sm w-full justify-between"
      >
        <span className="flex items-center gap-1.5">
          <Icon name="Key" size={14} />
          {matched ? matched.name : activeKey ? activeKey.name : '选择已保存的 Key'}
        </span>
        <Icon name="ChevronDown" size={14} className={`transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>

      {open && (
        <div className="absolute left-0 right-0 top-full z-50 mt-1 max-h-64 overflow-y-auto rounded-xl border border-[var(--color-border)] bg-[var(--color-elevated)] shadow-xl">
          {keys.length === 0 ? (
            <div className="p-4 text-center text-sm text-[var(--color-muted)]">
              <p>还没有保存的 Key</p>
              <p className="mt-1 text-xs">可在「API Key 管理」中添加</p>
            </div>
          ) : (
            keys.map((k) => (
              <button
                key={k.id}
                onClick={() => handleSelect(k.id)}
                className={`flex w-full items-center gap-2 px-3 py-2.5 text-left transition-colors hover:bg-[var(--color-primary-soft)] ${
                  matched?.id === k.id ? 'bg-[var(--color-primary-soft)]' : ''
                }`}
              >
                <Icon name="Key" size={14} className="shrink-0 text-[var(--color-muted)]" />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium text-[var(--color-fg)]">{k.name}</p>
                  <p className="truncate font-mono text-xs text-[var(--color-muted)]">
                    {maskKey(k.key)} · {k.baseUrl}
                  </p>
                </div>
                {matched?.id === k.id && (
                  <Icon name="Check" size={14} className="shrink-0 text-[var(--color-primary)]" />
                )}
              </button>
            ))
          )}
        </div>
      )}
    </div>
  );
}
