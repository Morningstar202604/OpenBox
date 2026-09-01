import { useState } from 'react';
import { useApiKeys, type ApiKeyEntry } from '@/store/useApiKeys';
import { useToastStore } from '@/store/useToastStore';
import { Icon } from '@/components/Icon';
import { fmtDate } from '@/lib/format';

/** 添加/编辑 Key 的表单弹窗 */
function KeyFormModal({
  initial,
  onClose,
  onSubmit,
}: {
  initial?: ApiKeyEntry | null;
  onClose: () => void;
  onSubmit: (data: Omit<ApiKeyEntry, 'id' | 'createdAt'>) => void;
}) {
  const { templates } = useApiKeys();
  const [name, setName] = useState(initial?.name ?? '');
  const [key, setKey] = useState(initial?.key ?? '');
  const [baseUrl, setBaseUrl] = useState(initial?.baseUrl ?? '');
  const [provider, setProvider] = useState(initial?.provider ?? '');
  const [note, setNote] = useState(initial?.note ?? '');
  const [showKey, setShowKey] = useState(false);

  const handleProviderSelect = (p: string) => {
    const tpl = templates.find((t) => t.name === p);
    if (tpl) {
      setProvider(p);
      if (!baseUrl) setBaseUrl(tpl.baseUrl);
      if (!name) setName(p);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !key.trim() || !baseUrl.trim()) return;
    onSubmit({ name: name.trim(), key: key.trim(), baseUrl: baseUrl.trim(), provider, note: note.trim() });
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4 backdrop-blur-sm" onClick={onClose}>
      <div
        className="w-full max-w-lg rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] p-6 shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-4 flex items-center justify-between">
          <h3 className="text-lg font-bold text-[var(--color-fg)]">
            {initial ? '编辑 API Key' : '添加 API Key'}
          </h3>
          <button onClick={onClose} className="text-[var(--color-muted)] hover:text-[var(--color-fg)]">
            <Icon name="X" size={20} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* 服务商快速选择 */}
          <div>
            <label className="mb-1.5 block text-sm font-medium text-[var(--color-fg)]">服务商（快速填充）</label>
            <div className="flex flex-wrap gap-1.5">
              {templates.map((t) => (
                <button
                  key={t.name}
                  type="button"
                  onClick={() => handleProviderSelect(t.name)}
                  className={`rounded-full border px-2.5 py-1 text-xs transition-colors ${
                    provider === t.name
                      ? 'border-[var(--color-primary)] bg-[var(--color-primary-soft)] text-[var(--color-primary)]'
                      : 'border-[var(--color-border)] text-[var(--color-muted)] hover:border-[var(--color-primary)]'
                  }`}
                >
                  {t.name}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="mb-1.5 block text-sm font-medium text-[var(--color-fg)]">名称</label>
            <input
              className="input"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="如：我的 DeepSeek"
              required
            />
          </div>

          <div>
            <label className="mb-1.5 block text-sm font-medium text-[var(--color-fg)]">API Key</label>
            <div className="relative">
              <input
                className="input pr-10 font-mono"
                type={showKey ? 'text' : 'password'}
                value={key}
                onChange={(e) => setKey(e.target.value)}
                placeholder="sk-..."
                required
              />
              <button
                type="button"
                onClick={() => setShowKey(!showKey)}
                className="absolute right-2 top-1/2 -translate-y-1/2 text-[var(--color-muted)] hover:text-[var(--color-fg)]"
              >
                <Icon name={showKey ? 'EyeOff' : 'Eye'} size={16} />
              </button>
            </div>
          </div>

          <div>
            <label className="mb-1.5 block text-sm font-medium text-[var(--color-fg)]">Base URL</label>
            <input
              className="input font-mono"
              value={baseUrl}
              onChange={(e) => setBaseUrl(e.target.value)}
              placeholder="https://api.example.com/v1"
              required
            />
          </div>

          <div>
            <label className="mb-1.5 block text-sm font-medium text-[var(--color-fg)]">备注（可选）</label>
            <input
              className="input"
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="额度、用途等"
            />
          </div>

          <div className="flex gap-2 pt-2">
            <button type="button" className="btn btn-ghost flex-1" onClick={onClose}>
              取消
            </button>
            <button type="submit" className="btn btn-primary flex-1">
              {initial ? '保存' : '添加'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export function ApiKeysPage() {
  const { keys, activeId, addKey, updateKey, deleteKey, setActive, exportKeys, importKeys, clearAll, maskKey } = useApiKeys();
  const push = useToastStore((s) => s.push);
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<ApiKeyEntry | null>(null);
  const [importText, setImportText] = useState('');
  const [showImport, setShowImport] = useState(false);

  const handleExport = () => {
    const text = exportKeys();
    navigator.clipboard?.writeText(text).then(
      () => push('已复制到剪贴板', 'success'),
      () => push('复制失败', 'error'),
    );
  };

  const handleImport = () => {
    if (importKeys(importText)) {
      push('导入成功', 'success');
      setShowImport(false);
      setImportText('');
    } else {
      push('导入失败：格式不正确', 'error');
    }
  };

  const handleClearAll = () => {
    if (confirm('确定要清除全部 API Key 吗？此操作不可恢复。')) {
      clearAll();
      push('已清除全部 Key', 'success');
    }
  };

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      {/* 页头 */}
      <div className="card p-6">
        <h1 className="flex items-center gap-2 text-2xl font-bold text-[var(--color-fg)]">
          <Icon name="Key" size={22} className="text-[var(--color-primary)]" />
          API Key 管理
        </h1>
        <p className="mt-3 leading-relaxed text-[var(--color-muted)]">
          管理你的 API Key，在测速工具和 API 示例中快速切换。密钥仅保存在本地浏览器，不会上传到服务器。
        </p>
        <div className="mt-3 flex items-center gap-2 rounded-lg bg-[var(--color-warning-soft)] p-3 text-sm text-[var(--color-warning)]">
          <Icon name="AlertTriangle" size={16} />
          <span>安全提示：请勿在公共设备上保存 Key，定期清理不再使用的 Key。</span>
        </div>
      </div>

      {/* 操作栏 */}
      <div className="flex flex-wrap gap-2">
        <button className="btn btn-primary" onClick={() => { setEditing(null); setShowForm(true); }}>
          <Icon name="Plus" size={16} /> 添加 Key
        </button>
        <button className="btn btn-ghost" onClick={handleExport}>
          <Icon name="Copy" size={16} /> 导出
        </button>
        <button className="btn btn-ghost" onClick={() => setShowImport(true)}>
          <Icon name="LogIn" size={16} /> 导入
        </button>
        {keys.length > 0 && (
          <button className="btn btn-ghost ml-auto text-[var(--color-danger)]" onClick={handleClearAll}>
            <Icon name="Trash2" size={16} /> 清除全部
          </button>
        )}
      </div>

      {/* Key 列表 */}
      {keys.length === 0 ? (
        <div className="card flex flex-col items-center gap-3 p-10 text-center">
          <Icon name="Key" size={40} className="text-[var(--color-muted)]" />
          <p className="text-[var(--color-muted)]">还没有保存任何 API Key</p>
          <button className="btn btn-primary btn-sm" onClick={() => { setEditing(null); setShowForm(true); }}>
            添加第一个 Key
          </button>
        </div>
      ) : (
        <div className="space-y-3">
          {keys.map((k) => (
            <div
              key={k.id}
              className={`card p-4 transition-all ${activeId === k.id ? 'border-[var(--color-primary)] ring-1 ring-[var(--color-primary)]' : ''}`}
            >
              <div className="flex items-start gap-3">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[var(--color-primary-soft)]">
                  <Icon name="Key" size={18} className="text-[var(--color-primary)]" />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <h3 className="font-semibold text-[var(--color-fg)]">{k.name}</h3>
                    {k.provider && (
                      <span className="rounded-full bg-[var(--color-bg-soft)] px-2 py-0.5 text-xs text-[var(--color-muted)]">
                        {k.provider}
                      </span>
                    )}
                    {activeId === k.id && (
                      <span className="rounded-full bg-[var(--color-success-soft)] px-2 py-0.5 text-xs font-medium text-[var(--color-success)]">
                        使用中
                      </span>
                    )}
                  </div>
                  <p className="mt-1 truncate font-mono text-xs text-[var(--color-muted)]">{k.baseUrl}</p>
                  <p className="mt-1 font-mono text-xs text-[var(--color-muted)]">{maskKey(k.key)}</p>
                  {k.note && <p className="mt-1 text-xs text-[var(--color-muted)]">{k.note}</p>}
                  <p className="mt-2 text-[10px] text-[var(--color-muted)]">
                    创建于 {fmtDate(k.createdAt)}
                    {k.lastUsedAt && ` · 最后使用 ${fmtDate(k.lastUsedAt)}`}
                  </p>
                </div>
                <div className="flex shrink-0 gap-1">
                  {activeId !== k.id && (
                    <button
                      className="btn btn-ghost btn-sm"
                      onClick={() => setActive(k.id)}
                      title="设为当前使用"
                    >
                      <Icon name="Check" size={14} />
                    </button>
                  )}
                  <button
                    className="btn btn-ghost btn-sm"
                    onClick={() => { setEditing(k); setShowForm(true); }}
                    title="编辑"
                  >
                    <Icon name="Edit" size={14} />
                  </button>
                  <button
                    className="btn btn-ghost btn-sm text-[var(--color-danger)]"
                    onClick={() => {
                      if (confirm(`确定删除「${k.name}」吗？`)) deleteKey(k.id);
                    }}
                    title="删除"
                  >
                    <Icon name="Trash2" size={14} />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* 添加/编辑弹窗 */}
      {showForm && (
        <KeyFormModal
          initial={editing}
          onClose={() => setShowForm(false)}
          onSubmit={(data) => {
            if (editing) {
              updateKey(editing.id, data);
              push('已更新', 'success');
            } else {
              addKey(data);
              push('已添加', 'success');
            }
          }}
        />
      )}

      {/* 导入弹窗 */}
      {showImport && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4 backdrop-blur-sm" onClick={() => setShowImport(false)}>
          <div
            className="w-full max-w-lg rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] p-6 shadow-xl"
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className="mb-4 text-lg font-bold text-[var(--color-fg)]">导入 API Key</h3>
            <textarea
              className="input h-40 font-mono text-xs"
              value={importText}
              onChange={(e) => setImportText(e.target.value)}
              placeholder="粘贴导出的 JSON 内容..."
            />
            <div className="mt-4 flex gap-2">
              <button className="btn btn-ghost flex-1" onClick={() => setShowImport(false)}>取消</button>
              <button className="btn btn-primary flex-1" onClick={handleImport}>导入</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
