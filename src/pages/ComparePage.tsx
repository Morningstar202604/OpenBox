import { useState, useMemo } from 'react';
import { Icon } from '@/components/Icon';
import { readJSON, writeJSON } from '@/lib/storage';

interface ModelInfo {
  id: string;
  name: string;
  vendor: string;
  inputPrice: number; // $/M tokens
  outputPrice: number;
  context: number; // tokens
  maxOutput: number;
  code: number; // 0-5
  writing: number;
  reasoning: number;
  multimodal: boolean;
  tools: boolean;
  vision: boolean;
  json: boolean;
  openSource: boolean;
  freeTier: boolean;
  apiUrl: string;
}

const MODELS: ModelInfo[] = [
  // GPT 系列
  { id: 'gpt-5', name: 'GPT-5', vendor: 'OpenAI', inputPrice: 2, outputPrice: 8, context: 128000, maxOutput: 16384, code: 5, writing: 5, reasoning: 5, multimodal: true, tools: true, vision: true, json: true, openSource: false, freeTier: false, apiUrl: 'https://api.openai.com/v1' },
  { id: 'gpt-4o', name: 'GPT-4o', vendor: 'OpenAI', inputPrice: 2.5, outputPrice: 10, context: 128000, maxOutput: 16384, code: 5, writing: 5, reasoning: 4, multimodal: true, tools: true, vision: true, json: true, openSource: false, freeTier: false, apiUrl: 'https://api.openai.com/v1' },
  { id: 'gpt-4o-mini', name: 'GPT-4o-mini', vendor: 'OpenAI', inputPrice: 0.15, outputPrice: 0.6, context: 128000, maxOutput: 16384, code: 4, writing: 4, reasoning: 3, multimodal: true, tools: true, vision: true, json: true, openSource: false, freeTier: false, apiUrl: 'https://api.openai.com/v1' },
  // Claude 系列
  { id: 'claude-sonnet-4', name: 'Claude Sonnet 4', vendor: 'Anthropic', inputPrice: 3, outputPrice: 15, context: 200000, maxOutput: 64000, code: 5, writing: 5, reasoning: 5, multimodal: true, tools: true, vision: true, json: true, openSource: false, freeTier: false, apiUrl: 'https://api.anthropic.com/v1' },
  { id: 'claude-3.5-sonnet', name: 'Claude 3.5 Sonnet', vendor: 'Anthropic', inputPrice: 3, outputPrice: 15, context: 200000, maxOutput: 8192, code: 5, writing: 5, reasoning: 4, multimodal: true, tools: true, vision: true, json: true, openSource: false, freeTier: false, apiUrl: 'https://api.anthropic.com/v1' },
  { id: 'claude-3-haiku', name: 'Claude 3 Haiku', vendor: 'Anthropic', inputPrice: 0.25, outputPrice: 1.25, context: 200000, maxOutput: 4096, code: 3, writing: 4, reasoning: 3, multimodal: true, tools: true, vision: true, json: true, openSource: false, freeTier: false, apiUrl: 'https://api.anthropic.com/v1' },
  // Gemini 系列
  { id: 'gemini-2.5-pro', name: 'Gemini 2.5 Pro', vendor: 'Google', inputPrice: 1.25, outputPrice: 10, context: 1000000, maxOutput: 65536, code: 5, writing: 4, reasoning: 5, multimodal: true, tools: true, vision: true, json: true, openSource: false, freeTier: true, apiUrl: 'https://generativelanguage.googleapis.com/v1beta' },
  { id: 'gemini-2.0-flash', name: 'Gemini 2.0 Flash', vendor: 'Google', inputPrice: 0.1, outputPrice: 0.4, context: 1000000, maxOutput: 8192, code: 4, writing: 4, reasoning: 3, multimodal: true, tools: true, vision: true, json: true, openSource: false, freeTier: true, apiUrl: 'https://generativelanguage.googleapis.com/v1beta' },
  // DeepSeek 系列
  { id: 'deepseek-v3', name: 'DeepSeek V3', vendor: 'DeepSeek', inputPrice: 0.27, outputPrice: 1.1, context: 64000, maxOutput: 8192, code: 5, writing: 4, reasoning: 4, multimodal: false, tools: true, vision: false, json: true, openSource: false, freeTier: true, apiUrl: 'https://api.deepseek.com/v1' },
  { id: 'deepseek-r1', name: 'DeepSeek R1', vendor: 'DeepSeek', inputPrice: 0.55, outputPrice: 2.19, context: 64000, maxOutput: 8192, code: 5, writing: 3, reasoning: 5, multimodal: false, tools: true, vision: false, json: true, openSource: true, freeTier: true, apiUrl: 'https://api.deepseek.com/v1' },
  // Qwen 系列
  { id: 'qwen3-max', name: 'Qwen3-Max', vendor: '阿里', inputPrice: 2.5, outputPrice: 10, context: 256000, maxOutput: 32768, code: 5, writing: 5, reasoning: 4, multimodal: true, tools: true, vision: true, json: true, openSource: false, freeTier: true, apiUrl: 'https://dashscope.aliyuncs.com/compatible-mode/v1' },
  { id: 'qwen3-72b', name: 'Qwen3-72B', vendor: '阿里', inputPrice: 0.8, outputPrice: 2, context: 128000, maxOutput: 8192, code: 4, writing: 4, reasoning: 4, multimodal: false, tools: true, vision: false, json: true, openSource: true, freeTier: true, apiUrl: 'https://dashscope.aliyuncs.com/compatible-mode/v1' },
  // GLM 系列
  { id: 'glm-4', name: 'GLM-4', vendor: '智谱', inputPrice: 0.1, outputPrice: 0.1, context: 128000, maxOutput: 8192, code: 4, writing: 4, reasoning: 4, multimodal: true, tools: true, vision: true, json: true, openSource: false, freeTier: true, apiUrl: 'https://open.bigmodel.cn/api/paas/v4' },
  { id: 'glm-4-flash', name: 'GLM-4-Flash', vendor: '智谱', inputPrice: 0, outputPrice: 0, context: 128000, maxOutput: 8192, code: 3, writing: 3, reasoning: 3, multimodal: false, tools: true, vision: false, json: true, openSource: false, freeTier: true, apiUrl: 'https://open.bigmodel.cn/api/paas/v4' },
  // Llama 系列
  { id: 'llama-3.1-405b', name: 'Llama 3.1 405B', vendor: 'Meta', inputPrice: 0, outputPrice: 0, context: 128000, maxOutput: 4096, code: 4, writing: 4, reasoning: 4, multimodal: false, tools: true, vision: false, json: true, openSource: true, freeTier: true, apiUrl: '自托管' },
  { id: 'llama-3.1-70b', name: 'Llama 3.1 70B', vendor: 'Meta', inputPrice: 0, outputPrice: 0, context: 128000, maxOutput: 4096, code: 4, writing: 4, reasoning: 3, multimodal: false, tools: true, vision: false, json: true, openSource: true, freeTier: true, apiUrl: '自托管' },
  // Mistral 系列
  { id: 'mistral-large', name: 'Mistral Large 2', vendor: 'Mistral', inputPrice: 0.2, outputPrice: 0.6, context: 128000, maxOutput: 8192, code: 4, writing: 4, reasoning: 4, multimodal: false, tools: true, vision: false, json: true, openSource: false, freeTier: true, apiUrl: 'https://api.mistral.ai/v1' },
  // Grok
  { id: 'grok-2', name: 'Grok 2', vendor: 'xAI', inputPrice: 2, outputPrice: 10, context: 131072, maxOutput: 8192, code: 4, writing: 4, reasoning: 4, multimodal: true, tools: true, vision: true, json: true, openSource: false, freeTier: false, apiUrl: 'https://api.x.ai/v1' },
];

const VOTES_KEY = 'ob_model_votes';

type SortKey = 'name' | 'inputPrice' | 'outputPrice' | 'context' | 'code' | 'reasoning';
type FilterVendor = 'all' | string;

function SortHeader({ label, k, active, asc, onSort }: {
  label: string;
  k: SortKey;
  active: boolean;
  asc: boolean;
  onSort: (k: SortKey) => void;
}) {
  return (
    <button
      onClick={() => onSort(k)}
      className="inline-flex items-center gap-1 hover:text-[var(--color-primary)]"
    >
      {label}
      {active && <Icon name={asc ? 'ChevronUp' : 'ChevronDown'} size={12} />}
    </button>
  );
}

export function ComparePage() {
  const [sortKey, setSortKey] = useState<SortKey>('inputPrice');
  const [sortAsc, setSortAsc] = useState(true);
  const [filterVendor, setFilterVendor] = useState<FilterVendor>('all');
  const [showFreeOnly, setShowFreeOnly] = useState(false);
  const [votes, setVotes] = useState<Record<string, number>>(() => {
    const saved = readJSON<{ votes: Record<string, number>; voted: string[] }>(VOTES_KEY, { votes: {}, voted: [] });
    return saved.votes;
  });
  const [votedModels, setVotedModels] = useState<Set<string>>(() => {
    const saved = readJSON<{ votes: Record<string, number>; voted: string[] }>(VOTES_KEY, { votes: {}, voted: [] });
    return new Set(saved.voted);
  });

  const vendors = useMemo(() => Array.from(new Set(MODELS.map((m) => m.vendor))), []);

  const filtered = useMemo(() => {
    let list = [...MODELS];
    if (filterVendor !== 'all') list = list.filter((m) => m.vendor === filterVendor);
    if (showFreeOnly) list = list.filter((m) => m.freeTier || m.inputPrice === 0);
    list.sort((a, b) => {
      const av = a[sortKey];
      const bv = b[sortKey];
      if (typeof av === 'string' && typeof bv === 'string') return sortAsc ? av.localeCompare(bv) : bv.localeCompare(av);
      return sortAsc ? (av as number) - (bv as number) : (bv as number) - (av as number);
    });
    return list;
  }, [sortKey, sortAsc, filterVendor, showFreeOnly]);

  const vote = (modelId: string) => {
    if (votedModels.has(modelId)) return;
    const nextVotes = { ...votes, [modelId]: (votes[modelId] || 0) + 1 };
    const nextVoted = new Set(votedModels);
    nextVoted.add(modelId);
    setVotes(nextVotes);
    setVotedModels(nextVoted);
    writeJSON(VOTES_KEY, { votes: nextVotes, voted: Array.from(nextVoted) });
  };

  const fmtPrice = (p: number) => (p === 0 ? '免费' : `$${p}`);
  const fmtContext = (c: number) => (c >= 1000000 ? `${c / 1000000}M` : `${c / 1000}K`);

  const handleSort = (k: SortKey) => {
    if (sortKey === k) setSortAsc(!sortAsc);
    else { setSortKey(k); setSortAsc(true); }
  };

  const renderStars = (score: number) => (
    <span className="inline-flex gap-0.5">
      {[1, 2, 3, 4, 5].map((i) => (
        <Icon
          key={i}
          name="Star"
          size={12}
          fill={i <= score ? 'var(--color-warning)' : 'none'}
          color={i <= score ? 'var(--color-warning)' : 'var(--color-border)'}
        />
      ))}
    </span>
  );

  return (
    <div className="space-y-6">
      <div className="text-center">
        <h1 className="text-2xl font-bold">大模型对比</h1>
        <p className="mt-2 text-sm text-[var(--color-muted)]">
          {MODELS.length} 款主流大模型横向对比：价格、上下文、能力、投票
        </p>
      </div>

      {/* 筛选栏 */}
      <div className="card flex flex-wrap items-center gap-3 p-4">
        <select
          value={filterVendor}
          onChange={(e) => setFilterVendor(e.target.value)}
          className="input w-auto text-sm"
        >
          <option value="all">全部厂商</option>
          {vendors.map((v) => (
            <option key={v} value={v}>{v}</option>
          ))}
        </select>
        <label className="flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            checked={showFreeOnly}
            onChange={(e) => setShowFreeOnly(e.target.checked)}
            className="h-4 w-4"
          />
          只看免费/有免费额度
        </label>
        <span className="ml-auto text-xs text-[var(--color-muted)]">
          共 {filtered.length} 款模型
        </span>
      </div>

      {/* 对比表 */}
      <div className="card overflow-x-auto p-0">
        <table className="w-full min-w-[900px] text-sm">
          <thead>
            <tr className="border-b border-[var(--color-border)] text-left text-xs text-[var(--color-muted)]">
              <th className="p-3"><SortHeader label="模型" k="name" active={sortKey === 'name'} asc={sortAsc} onSort={handleSort} /></th>
              <th className="p-3">厂商</th>
              <th className="p-3"><SortHeader label="输入价格" k="inputPrice" active={sortKey === 'inputPrice'} asc={sortAsc} onSort={handleSort} /></th>
              <th className="p-3"><SortHeader label="输出价格" k="outputPrice" active={sortKey === 'outputPrice'} asc={sortAsc} onSort={handleSort} /></th>
              <th className="p-3"><SortHeader label="上下文" k="context" active={sortKey === 'context'} asc={sortAsc} onSort={handleSort} /></th>
              <th className="p-3"><SortHeader label="代码" k="code" active={sortKey === 'code'} asc={sortAsc} onSort={handleSort} /></th>
              <th className="p-3"><SortHeader label="推理" k="reasoning" active={sortKey === 'reasoning'} asc={sortAsc} onSort={handleSort} /></th>
              <th className="p-3">功能</th>
              <th className="p-3 text-center">投票</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((m) => (
              <tr key={m.id} className="border-b border-[var(--color-border)]/50 hover:bg-[var(--color-bg-soft)]">
                <td className="p-3">
                  <div className="font-medium">{m.name}</div>
                  <div className="flex gap-1">
                    {m.openSource && <span className="tag tag-xs bg-green-500/10 text-green-600">开源</span>}
                    {m.freeTier && <span className="tag tag-xs bg-blue-500/10 text-blue-600">有免费</span>}
                  </div>
                </td>
                <td className="p-3 text-[var(--color-muted)]">{m.vendor}</td>
                <td className="p-3 font-mono text-xs">{fmtPrice(m.inputPrice)}</td>
                <td className="p-3 font-mono text-xs">{fmtPrice(m.outputPrice)}</td>
                <td className="p-3 font-mono text-xs">{fmtContext(m.context)}</td>
                <td className="p-3">{renderStars(m.code)}</td>
                <td className="p-3">{renderStars(m.reasoning)}</td>
                <td className="p-3">
                  <div className="flex flex-wrap gap-1">
                    {m.vision && <span className="tag tag-xs">视觉</span>}
                    {m.tools && <span className="tag tag-xs">工具</span>}
                    {m.json && <span className="tag tag-xs">JSON</span>}
                    {m.multimodal && <span className="tag tag-xs">多模态</span>}
                  </div>
                </td>
                <td className="p-3 text-center">
                  <button
                    onClick={() => vote(m.id)}
                    disabled={votedModels.has(m.id)}
                    className={`inline-flex items-center gap-1 rounded-lg px-2 py-1 text-xs transition-colors ${
                      votedModels.has(m.id)
                        ? 'bg-[var(--color-primary-soft)] text-[var(--color-primary)]'
                        : 'hover:bg-[var(--color-bg-soft)]'
                    }`}
                  >
                    <Icon name="ThumbsUp" size={14} />
                    {votes[m.id] || 0}
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* 场景推荐 */}
      <div className="card p-4">
        <h3 className="mb-3 text-sm font-medium">按场景推荐</h3>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {[
            { title: '日常对话/写作', desc: '性价比高、能力均衡', models: ['GPT-4o-mini', 'Claude 3 Haiku', 'GLM-4-Flash'] },
            { title: '代码开发', desc: '代码能力强、支持工具调用', models: ['GPT-4o', 'Claude Sonnet 4', 'DeepSeek V3'] },
            { title: '复杂推理', desc: '推理能力最强', models: ['GPT-5', 'Claude Sonnet 4', 'DeepSeek R1'] },
            { title: '长文本处理', desc: '上下文窗口大', models: ['Gemini 2.5 Pro', 'Gemini 2.0 Flash', 'Claude Sonnet 4'] },
            { title: '零成本白嫖', desc: '完全免费或有 generous 免费额度', models: ['GLM-4-Flash', 'Gemini 2.0 Flash', 'DeepSeek V3'] },
            { title: '本地部署', desc: '开源可自托管', models: ['Llama 3.1 405B', 'Llama 3.1 70B', 'DeepSeek R1'] },
            { title: '多模态/视觉', desc: '支持图片理解', models: ['GPT-4o', 'Gemini 2.5 Pro', 'Claude Sonnet 4'] },
            { title: '国产替代', desc: '国内厂商、合规', models: ['Qwen3-Max', 'GLM-4', 'DeepSeek V3'] },
          ].map((s) => (
            <div key={s.title} className="rounded-lg border border-[var(--color-border)] p-3">
              <div className="text-sm font-medium">{s.title}</div>
              <div className="mt-1 text-xs text-[var(--color-muted)]">{s.desc}</div>
              <div className="mt-2 flex flex-wrap gap-1">
                {s.models.map((m) => (
                  <span key={m} className="tag tag-xs">{m}</span>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* 说明 */}
      <div className="card p-4">
        <h3 className="mb-2 text-sm font-medium">数据说明</h3>
        <ul className="space-y-1 text-xs text-[var(--color-muted)]">
          <li>• 价格为官方 API 标价（$/百万 tokens），实际价格以官网为准，中转商可能有折扣</li>
          <li>• 能力评分为综合主观评分（1-5星），仅供参考，不同场景表现可能不同</li>
          <li>• 投票为本地用户投票，数据存储在浏览器本地，不代表全局排名</li>
          <li>• 数据更新时间：2026年9月，模型迭代快，建议以官方文档为准</li>
        </ul>
      </div>
    </div>
  );
}
