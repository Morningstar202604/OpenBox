import { useState, useCallback, useEffect } from 'react';
import { readJSON, writeJSON } from '@/lib/storage';

export interface ApiKeyEntry {
  id: string;
  /** 名称，如"我的DeepSeek" */
  name: string;
  /** API Key */
  key: string;
  /** base_url */
  baseUrl: string;
  /** 服务商，如"DeepSeek" */
  provider?: string;
  /** 备注 */
  note?: string;
  createdAt: string;
  lastUsedAt?: string;
}

const STORAGE_KEY = 'ob_api_keys';
const ACTIVE_KEY = 'ob_api_keys_active';

/** 预设服务商模板：添加时快速填充 base_url */
export const PROVIDER_TEMPLATES: { name: string; baseUrl: string; models: string[] }[] = [
  { name: 'DeepSeek', baseUrl: 'https://api.deepseek.com/v1', models: ['deepseek-chat', 'deepseek-reasoner'] },
  { name: 'OpenAI', baseUrl: 'https://api.openai.com/v1', models: ['gpt-4o', 'gpt-4o-mini'] },
  { name: '硅基流动', baseUrl: 'https://api.siliconflow.cn/v1', models: ['deepseek-ai/DeepSeek-V3', 'Qwen/Qwen2.5-72B-Instruct'] },
  { name: 'Groq', baseUrl: 'https://api.groq.com/openai/v1', models: ['llama-3.3-70b-versatile', 'mixtral-8x7b-32768'] },
  { name: 'OpenRouter', baseUrl: 'https://openrouter.ai/api/v1', models: ['openai/gpt-4o', 'anthropic/claude-3.5-sonnet'] },
  { name: '通义千问', baseUrl: 'https://dashscope.aliyuncs.com/compatible-mode/v1', models: ['qwen-plus', 'qwen-turbo'] },
  { name: '智谱 GLM', baseUrl: 'https://open.bigmodel.cn/api/paas/v4', models: ['glm-4', 'glm-4-flash'] },
  { name: 'Moonshot', baseUrl: 'https://api.moonshot.cn/v1', models: ['moonshot-v1-8k', 'moonshot-v1-32k'] },
  { name: 'Together', baseUrl: 'https://api.together.xyz/v1', models: ['meta-llama/Llama-3.3-70B-Instruct-Turbo'] },
  { name: '自定义', baseUrl: '', models: [] },
];

function genId(): string {
  return `key_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
}

export function useApiKeys() {
  const [keys, setKeys] = useState<ApiKeyEntry[]>(() => readJSON<ApiKeyEntry[]>(STORAGE_KEY, []));
  const [activeId, setActiveId] = useState<string | null>(() => readJSON<string | null>(ACTIVE_KEY, null));

  // 持久化
  useEffect(() => {
    writeJSON(STORAGE_KEY, keys);
  }, [keys]);

  useEffect(() => {
    writeJSON(ACTIVE_KEY, activeId);
  }, [activeId]);

  /** 添加 Key */
  const addKey = useCallback((entry: Omit<ApiKeyEntry, 'id' | 'createdAt'>) => {
    const newEntry: ApiKeyEntry = {
      ...entry,
      id: genId(),
      createdAt: new Date().toISOString(),
    };
    setKeys((prev) => [newEntry, ...prev]);
    return newEntry.id;
  }, []);

  /** 更新 Key */
  const updateKey = useCallback((id: string, patch: Partial<ApiKeyEntry>) => {
    setKeys((prev) => prev.map((k) => (k.id === id ? { ...k, ...patch } : k)));
  }, []);

  /** 删除 Key */
  const deleteKey = useCallback((id: string) => {
    setKeys((prev) => prev.filter((k) => k.id !== id));
    setActiveId((prev) => (prev === id ? null : prev));
  }, []);

  /** 设置当前选中的 Key */
  const setActive = useCallback((id: string | null) => {
    setActiveId(id);
    if (id) {
      setKeys((prev) =>
        prev.map((k) => (k.id === id ? { ...k, lastUsedAt: new Date().toISOString() } : k)),
      );
    }
  }, []);

  /** 获取当前选中的 Key */
  const activeKey = keys.find((k) => k.id === activeId) ?? null;

  /** 导出全部 Key（JSON） */
  const exportKeys = useCallback((): string => {
    return JSON.stringify(keys, null, 2);
  }, [keys]);

  /** 导入 Key（JSON 字符串） */
  const importKeys = useCallback((json: string): boolean => {
    try {
      const parsed = JSON.parse(json) as ApiKeyEntry[];
      if (!Array.isArray(parsed)) return false;
      // 验证基本结构
      const valid = parsed.filter((k) => k.id && k.name && k.key && k.baseUrl);
      if (valid.length === 0) return false;
      setKeys((prev) => [...valid, ...prev]);
      return true;
    } catch {
      return false;
    }
  }, []);

  /** 清除全部 Key */
  const clearAll = useCallback(() => {
    setKeys([]);
    setActiveId(null);
  }, []);

  /** 掩码显示 Key（前4后4） */
  const maskKey = (key: string): string => {
    if (key.length <= 8) return '****';
    return `${key.slice(0, 4)}****${key.slice(-4)}`;
  };

  return {
    keys,
    activeId,
    activeKey,
    addKey,
    updateKey,
    deleteKey,
    setActive,
    exportKeys,
    importKeys,
    clearAll,
    maskKey,
    templates: PROVIDER_TEMPLATES,
  };
}
