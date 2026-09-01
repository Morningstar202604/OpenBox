import { useState, useCallback } from 'react';
import { Icon } from '@/components/Icon';
import { ApiKeySelector } from '@/components/ApiKeySelector';
import { readJSON, writeJSON } from '@/lib/storage';

interface SpeedTestResult {
  id: string;
  baseUrl: string;
  model: string;
  latency: number;
  status: number;
  ok: boolean;
  error?: string;
  models?: string[];
  timestamp: number;
}

const PRESET_ENDPOINTS = [
  { label: 'OpenAI', url: 'https://api.openai.com/v1', model: 'gpt-4o-mini' },
  { label: 'DeepSeek', url: 'https://api.deepseek.com/v1', model: 'deepseek-chat' },
  { label: 'SiliconFlow', url: 'https://api.siliconflow.cn/v1', model: 'deepseek-ai/DeepSeek-V3' },
  { label: 'OpenRouter', url: 'https://openrouter.ai/api/v1', model: 'openai/gpt-4o-mini' },
  { label: 'Groq', url: 'https://api.groq.com/openai/v1', model: 'llama-3.3-70b-versatile' },
  { label: '通义千问', url: 'https://dashscope.aliyuncs.com/compatible-mode/v1', model: 'qwen-turbo' },
  { label: '智谱 GLM', url: 'https://open.bigmodel.cn/api/paas/v4', model: 'glm-4-flash' },
  { label: 'Moonshot', url: 'https://api.moonshot.cn/v1', model: 'moonshot-v1-8k' },
  { label: '自定义', url: '', model: '' },
];

const HISTORY_KEY = 'ob_speedtest_history';

export function SpeedTestPage() {
  const [baseUrl, setBaseUrl] = useState('https://api.deepseek.com/v1');
  const [apiKey, setApiKey] = useState('');
  const [model, setModel] = useState('deepseek-chat');
  const [testing, setTesting] = useState(false);
  const [result, setResult] = useState<SpeedTestResult | null>(null);
  const [showKey, setShowKey] = useState(false);
  const [history, setHistory] = useState<SpeedTestResult[]>(() => readJSON<SpeedTestResult[]>(HISTORY_KEY, []));

  const runTest = useCallback(async () => {
    if (!baseUrl) return;
    setTesting(true);
    setResult(null);

    const id = Date.now().toString();
    const start = performance.now();

    try {
      // 先测试 /models 端点（GET，通常更轻量）
      const modelsUrl = `${baseUrl.replace(/\/$/, '')}/models`;
      const modelsRes = await fetch(modelsUrl, {
        method: 'GET',
        headers: apiKey ? { Authorization: `Bearer ${apiKey}` } : {},
      }).catch(() => null);

      let models: string[] | undefined;
      if (modelsRes && modelsRes.ok) {
        try {
          const data = await modelsRes.json();
          models = (data.data || []).map((m: { id: string }) => m.id).slice(0, 20);
        } catch { /* ignore */ }
      }

      // 再测试 chat/completions（POST，真正的延迟测试）
      const chatUrl = `${baseUrl.replace(/\/$/, '')}/chat/completions`;
      const chatRes = await fetch(chatUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(apiKey ? { Authorization: `Bearer ${apiKey}` } : {}),
        },
        body: JSON.stringify({
          model: model || 'gpt-4o-mini',
          messages: [{ role: 'user', content: 'hi' }],
          max_tokens: 5,
          stream: false,
        }),
      });

      const latency = Math.round(performance.now() - start);
      const text = await chatRes.text().catch(() => '');

      const res: SpeedTestResult = {
        id,
        baseUrl,
        model: model || 'auto',
        latency,
        status: chatRes.status,
        ok: chatRes.ok,
        models,
        timestamp: Date.now(),
        error: chatRes.ok ? undefined : text.slice(0, 200),
      };

      setResult(res);

      // 保存历史（最多20条）
      const next = [res, ...history].slice(0, 20);
      setHistory(next);
      writeJSON(HISTORY_KEY, next);
    } catch (err) {
      const latency = Math.round(performance.now() - start);
      const res: SpeedTestResult = {
        id,
        baseUrl,
        model: model || 'auto',
        latency,
        status: 0,
        ok: false,
        error: err instanceof Error ? `${err.name}: ${err.message}` : String(err),
        timestamp: Date.now(),
      };
      setResult(res);
    } finally {
      setTesting(false);
    }
  }, [baseUrl, apiKey, model, history, setHistory]);

  const selectPreset = (preset: typeof PRESET_ENDPOINTS[number]) => {
    setBaseUrl(preset.url);
    setModel(preset.model);
  };

  const clearHistory = () => {
    setHistory([]);
    writeJSON(HISTORY_KEY, []);
  };

  const latencyColor = (latency: number) => {
    if (latency < 500) return 'var(--color-success)';
    if (latency < 1500) return 'var(--color-warning)';
    return 'var(--color-danger)';
  };

  return (
    <div className="space-y-6">
      <div className="text-center">
        <h1 className="text-2xl font-bold">API 测速工具</h1>
        <p className="mt-2 text-sm text-[var(--color-muted)]">
          输入 API Key 和端点地址，一键测试延迟、可用性和支持的模型列表
        </p>
      </div>

      {/* 预设端点 */}
      <div className="card p-4">
        <div className="mb-3 text-sm font-medium">常用端点</div>
        <div className="flex flex-wrap gap-2">
          {PRESET_ENDPOINTS.map((p) => (
            <button
              key={p.label}
              onClick={() => selectPreset(p)}
              className={`rounded-lg border px-3 py-1.5 text-xs transition-colors ${
                baseUrl === p.url
                  ? 'border-[var(--color-primary)] bg-[var(--color-primary-soft)] text-[var(--color-primary)]'
                  : 'border-[var(--color-border)] text-[var(--color-muted)] hover:border-[var(--color-primary)] hover:text-[var(--color-fg)]'
              }`}
            >
              {p.label}
            </button>
          ))}
        </div>
      </div>

      {/* 输入表单 */}
      <div className="card space-y-4 p-4">
        {/* API Key 快速选择 */}
        <div>
          <label className="mb-1.5 block text-sm font-medium">快速选择已保存的 Key</label>
          <ApiKeySelector
            onSelect={(key, url) => {
              setApiKey(key);
              setBaseUrl(url);
            }}
            currentBaseUrl={baseUrl}
            currentKey={apiKey}
          />
        </div>
        <div>
          <label className="mb-1.5 block text-sm font-medium">Base URL</label>
          <input
            type="text"
            value={baseUrl}
            onChange={(e) => setBaseUrl(e.target.value)}
            placeholder="https://api.example.com/v1"
            className="input w-full"
          />
        </div>
        <div>
          <label className="mb-1.5 block text-sm font-medium">API Key（可选）</label>
          <div className="relative">
            <input
              type={showKey ? 'text' : 'password'}
              value={apiKey}
              onChange={(e) => setApiKey(e.target.value)}
              placeholder="sk-..."
              className="input w-full pr-10"
            />
            <button
              type="button"
              onClick={() => setShowKey(!showKey)}
              className="absolute right-2 top-1/2 -translate-y-1/2 text-[var(--color-muted)] hover:text-[var(--color-fg)]"
            >
              <Icon name={showKey ? 'EyeOff' : 'Eye'} size={16} />
            </button>
          </div>
          <p className="mt-1 text-xs text-[var(--color-muted)]">Key 仅在本地浏览器使用，不会上传到任何服务器</p>
        </div>
        <div>
          <label className="mb-1.5 block text-sm font-medium">模型（可选）</label>
          <input
            type="text"
            value={model}
            onChange={(e) => setModel(e.target.value)}
            placeholder="gpt-4o-mini"
            className="input w-full"
          />
        </div>
        <button
          onClick={runTest}
          disabled={testing || !baseUrl}
          className="btn btn-primary w-full"
        >
          {testing ? (
            <>
              <Icon name="Loader" size={16} className="animate-spin" />
              测试中...
            </>
          ) : (
            <>
              <Icon name="Zap" size={16} />
              开始测速
            </>
          )}
        </button>
      </div>

      {/* 测试结果 */}
      {result && (
        <div className="card p-4">
          <div className="mb-3 flex items-center justify-between">
            <span className="text-sm font-medium">测试结果</span>
            <span className="text-xs text-[var(--color-muted)]">
              {new Date(result.timestamp).toLocaleTimeString()}
            </span>
          </div>

          <div className="grid grid-cols-3 gap-3">
            <div className="rounded-lg bg-[var(--color-bg-soft)] p-3 text-center">
              <div className="text-2xl font-bold" style={{ color: latencyColor(result.latency) }}>
                {result.latency}
              </div>
              <div className="text-xs text-[var(--color-muted)]">延迟 (ms)</div>
            </div>
            <div className="rounded-lg bg-[var(--color-bg-soft)] p-3 text-center">
              <div className={`text-2xl font-bold ${result.ok ? 'text-[var(--color-success)]' : 'text-[var(--color-danger)]'}`}>
                {result.ok ? 'OK' : 'FAIL'}
              </div>
              <div className="text-xs text-[var(--color-muted)]">状态 {result.status}</div>
            </div>
            <div className="rounded-lg bg-[var(--color-bg-soft)] p-3 text-center">
              <div className="text-2xl font-bold">{result.models?.length || '-'}</div>
              <div className="text-xs text-[var(--color-muted)]">模型数</div>
            </div>
          </div>

          {result.error && (
            <div className="mt-3 rounded-lg border border-[var(--color-danger)]/30 bg-[var(--color-danger)]/10 p-3">
              <div className="text-xs font-medium text-[var(--color-danger)]">错误信息</div>
              <div className="mt-1 break-all text-xs text-[var(--color-muted)]">{result.error}</div>
              <p className="mt-2 text-xs text-[var(--color-muted)]">
                提示：浏览器 CORS 限制可能导致跨域请求失败，这不代表 API 本身不可用。建议在服务端或终端中测试。
              </p>
            </div>
          )}

          {result.models && result.models.length > 0 && (
            <div className="mt-3">
              <div className="mb-2 text-xs font-medium">支持的模型（前20个）</div>
              <div className="flex flex-wrap gap-1.5">
                {result.models.map((m) => (
                  <span key={m} className="tag text-xs">{m}</span>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* 历史记录 */}
      {history.length > 0 && (
        <div className="card p-4">
          <div className="mb-3 flex items-center justify-between">
            <span className="text-sm font-medium">测速历史（{history.length}）</span>
            <button onClick={clearHistory} className="text-xs text-[var(--color-muted)] hover:text-[var(--color-danger)]">
              清空
            </button>
          </div>
          <div className="space-y-2">
            {history.slice(0, 10).map((h) => (
              <div key={h.id} className="flex items-center gap-3 rounded-lg bg-[var(--color-bg-soft)] p-2.5 text-xs">
                <span
                  className="h-2 w-2 shrink-0 rounded-full"
                  style={{ backgroundColor: h.ok ? 'var(--color-success)' : 'var(--color-danger)' }}
                />
                <span className="min-w-0 flex-1 truncate font-mono">{h.baseUrl}</span>
                <span className="shrink-0 font-mono" style={{ color: latencyColor(h.latency) }}>{h.latency}ms</span>
                <span className="shrink-0 text-[var(--color-muted)]">{new Date(h.timestamp).toLocaleDateString()}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 使用说明 */}
      <div className="card p-4">
        <div className="mb-2 text-sm font-medium">使用说明</div>
        <ul className="space-y-1.5 text-xs text-[var(--color-muted)]">
          <li>• 测速请求发送到 <code className="rounded bg-[var(--color-bg-soft)] px-1">/chat/completions</code>，max_tokens=5，消耗极少额度</li>
          <li>• 同时尝试 <code className="rounded bg-[var(--color-bg-soft)] px-1">/models</code> 获取支持的模型列表</li>
          <li>• 由于浏览器 CORS 限制，部分 API 可能无法直接从浏览器调用，此时建议用 curl 或服务端测试</li>
          <li>• API Key 仅存储在本地内存中，刷新页面后清除，不会上传</li>
        </ul>
      </div>
    </div>
  );
}
