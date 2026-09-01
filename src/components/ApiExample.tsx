import { useState } from 'react';
import type { Resource } from '@/lib/types';
import { CodeBlock } from './CodeBlock';
import { Icon } from './Icon';

type Lang = 'curl' | 'python' | 'javascript';

const LANGS: { key: Lang; label: string; icon: string }[] = [
  { key: 'curl', label: 'cURL', icon: 'Terminal' },
  { key: 'python', label: 'Python', icon: 'Code' },
  { key: 'javascript', label: 'JavaScript', icon: 'Code' },
];

/**
 * API 调用示例组件
 * 针对 OpenAI 兼容接口自动生成 curl / Python / JavaScript 示例
 * 适用于 free-api / relay / 中转 等 API 类资源
 */
export function ApiExample({ resource }: { resource: Resource }) {
  const [lang, setLang] = useState<Lang>('curl');
  const baseUrl = resource.url.replace(/\/$/, '');
  const model = resource.models?.[0] || 'gpt-3.5-turbo';

  const examples: Record<Lang, string> = {
    curl: `curl ${baseUrl}/v1/chat/completions \\
  -H "Authorization: Bearer $API_KEY" \\
  -H "Content-Type: application/json" \\
  -d '{
    "model": "${model}",
    "messages": [
      {"role": "user", "content": "你好"}
    ],
    "temperature": 0.7
  }'`,
    python: `from openai import OpenAI

client = OpenAI(
    api_key="你的API_KEY",
    base_url="${baseUrl}/v1"
)

response = client.chat.completions.create(
    model="${model}",
    messages=[{"role": "user", "content": "你好"}],
    temperature=0.7
)

print(response.choices[0].message.content)`,
    javascript: `const response = await fetch("${baseUrl}/v1/chat/completions", {
  method: "POST",
  headers: {
    "Authorization": "Bearer 你的API_KEY",
    "Content-Type": "application/json"
  },
  body: JSON.stringify({
    model: "${model}",
    messages: [{ role: "user", content: "你好" }],
    temperature: 0.7
  })
});

const data = await response.json();
console.log(data.choices[0].message.content);`,
  };

  return (
    <div className="mt-5 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] p-4">
      <div className="mb-3 flex items-center justify-between">
        <h3 className="flex items-center gap-1.5 text-sm font-semibold text-[var(--color-fg)]">
          <Icon name="Code" size={15} /> API 调用示例
        </h3>
        {/* 语言切换 Tab */}
        <div className="flex gap-1 rounded-lg bg-[var(--color-bg-soft)] p-0.5">
          {LANGS.map((l) => (
            <button
              key={l.key}
              onClick={() => setLang(l.key)}
              className={`flex items-center gap-1 rounded-md px-2.5 py-1 text-xs font-medium transition-colors ${
                lang === l.key
                  ? 'bg-[var(--color-primary)] text-[var(--color-primary-fg)]'
                  : 'text-[var(--color-muted)] hover:text-[var(--color-fg)]'
              }`}
            >
              {l.label}
            </button>
          ))}
        </div>
      </div>
      <p className="mb-3 text-xs text-[var(--color-muted)]">
        基于 OpenAI 兼容接口格式，将 <code className="rounded bg-[var(--color-bg-soft)] px-1 py-0.5 font-mono">你的API_KEY</code> 替换为实际密钥
      </p>
      <CodeBlock code={examples[lang]} language={lang} title={lang === 'curl' ? 'bash' : lang} />
    </div>
  );
}
