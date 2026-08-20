// 分维度评分配置：不同子类型使用不同的评分维度（「针对不同的模块开发不同的评论体系」）。
// 维度评分统一 1-5 星，聚合为各维度均值 + 综合均值，由 RatingWidget 展示、由 ratings 表落库。
// 未显式配置的子类型回退到 DEFAULT_DIMENSIONS（通用四维度）。

export interface RatingDimension {
  /** 维度键（存库用，稳定不翻译） */
  key: string;
  /** 多语显示名 */
  label: { zh: string; en: string; ja: string };
  /** 维度说明（帮助用户理解打什么） */
  hint?: { zh: string; en: string; ja: string };
}

const DEFAULT_DIMENSIONS: RatingDimension[] = [
  { key: 'usability', label: { zh: '易用性', en: 'Usability', ja: '使いやすさ' }, hint: { zh: '上手与使用的顺畅程度', en: 'How easy it is to use', ja: '使いやすさ' } },
  { key: 'value', label: { zh: '性价比', en: 'Value', ja: 'コスパ' }, hint: { zh: '免费额度/价格相对于能力', en: 'Free quota/price vs capability', ja: '無料枠・価格対能力' } },
  { key: 'stability', label: { zh: '稳定性', en: 'Stability', ja: '安定性' }, hint: { zh: '服务/资源是否长期可用', en: 'Whether it stays available', ja: '安定して使えるか' } },
  { key: 'ecosystem', label: { zh: '生态', en: 'Ecosystem', ja: 'エコシステム' }, hint: { zh: '社区/文档/工具链完整度', en: 'Community/docs/tooling', ja: 'コミュニティ・ドキュメント' } },
];

// 各子类型的专属维度。键保持稳定，增删维度只改这里。
export const RATING_DIMENSIONS: Record<string, RatingDimension[]> = {
  'free-api': [
    { key: 'stability', label: { zh: '稳定性', en: 'Stability', ja: '安定性' }, hint: { zh: '接口是否长期可用、少抽风', en: 'Long-term availability', ja: '長期利用できるか' } },
    { key: 'speed', label: { zh: '速度', en: 'Speed', ja: '速度' }, hint: { zh: '响应延迟与吞吐', en: 'Latency & throughput', ja: '応答速度' } },
    { key: 'value', label: { zh: '性价比', en: 'Value', ja: 'コスパ' }, hint: { zh: '免费额度相对能力', en: 'Free quota vs capability', ja: '無料枠対能力' } },
    { key: 'coverage', label: { zh: '模型覆盖', en: 'Model Coverage', ja: 'モデル網羅' }, hint: { zh: '支持的模型广度', en: 'Breadth of models', ja: '対応モデルの幅' } },
  ],
  relays: [
    { key: 'stability', label: { zh: '稳定性', en: 'Stability', ja: '安定性' } },
    { key: 'speed', label: { zh: '速度', en: 'Speed', ja: '速度' } },
    { key: 'quota', label: { zh: '额度', en: 'Quota', ja: '枠' }, hint: { zh: '每日/每月可薅量', en: 'Daily/monthly quota', ja: '毎日/毎月の枠' } },
    { key: 'compat', label: { zh: '兼容性', en: 'Compatibility', ja: '互換性' }, hint: { zh: 'OpenAI/Claude 等协议兼容度', en: 'OpenAI/Claude protocol compat', ja: 'プロトコル互換' } },
  ],
  'open-models': [
    { key: 'quality', label: { zh: '效果', en: 'Quality', ja: '精度' }, hint: { zh: '模型本身能力上限', en: 'Capability ceiling', ja: '能力の上限' } },
    { key: 'quant', label: { zh: '量化友好', en: 'Quantization', ja: '量子化' }, hint: { zh: '本地低显存跑的难易', en: 'Ease of local low-VRAM run', ja: '低VRAMでの動作' } },
    { key: 'deploy', label: { zh: '易部署', en: 'Deployability', ja: '導入容易さ' }, hint: { zh: '部署/微调门槛', en: 'Deploy/finetune barrier', ja: '導入のハードル' } },
    { key: 'license', label: { zh: '许可宽松', en: 'License', ja: 'ライセンス' }, hint: { zh: '商用友好度', en: 'Commercial-friendliness', ja: '商用利用' } },
  ],
  'ai-apps': [
    { key: 'usability', label: { zh: '易用性', en: 'Usability', ja: '使いやすさ' } },
    { key: 'feature', label: { zh: '功能', en: 'Features', ja: '機能' }, hint: { zh: '能力丰富度', en: 'Feature richness', ja: '機能の豊富さ' } },
    { key: 'value', label: { zh: '性价比', en: 'Value', ja: 'コスパ' } },
    { key: 'ecosystem', label: { zh: '生态', en: 'Ecosystem', ja: 'エコシステム' } },
  ],
  tools: [
    { key: 'usability', label: { zh: '易用性', en: 'Usability', ja: '使いやすさ' } },
    { key: 'ecosystem', label: { zh: '生态', en: 'Ecosystem', ja: 'エコシステム' } },
    { key: 'value', label: { zh: '性价比', en: 'Value', ja: 'コスパ' } },
    { key: 'docs', label: { zh: '文档', en: 'Docs', ja: 'ドキュメント' }, hint: { zh: '文档与示例完整度', en: 'Docs & examples', ja: 'ドキュメント' } },
  ],
  learn: [
    { key: 'systematic', label: { zh: '系统性', en: 'Systematic', ja: '体系的' }, hint: { zh: '知识结构是否完整', en: 'Completeness of knowledge', ja: '知識の体系性' } },
    { key: 'practical', label: { zh: '实用性', en: 'Practical', ja: '実用性' }, hint: { zh: '能否直接上手', en: 'Actionable', ja: '実践的に使える' } },
    { key: 'fresh', label: { zh: '时效性', en: 'Freshness', ja: '鮮度' }, hint: { zh: '内容是否跟上版本', en: 'Up to date', ja: '最新性' } },
  ],
  'free-server': [
    { key: 'stability', label: { zh: '稳定性', en: 'Stability', ja: '安定性' } },
    { key: 'quota', label: { zh: '免费额度', en: 'Free Quota', ja: '無料枠' } },
    { key: 'deploy', label: { zh: '易部署', en: 'Deployability', ja: '導入容易さ' } },
    { key: 'region', label: { zh: '地域', en: 'Region', ja: '地域' }, hint: { zh: '机房位置/国内可达', en: 'Datacenter location', ja: 'データセンター所在地' } },
  ],
  'free-domain': [
    { key: 'stability', label: { zh: '稳定性', en: 'Stability', ja: '安定性' } },
    { key: 'resolve', label: { zh: '解析速度', en: 'Resolve Speed', ja: '解決速度' }, hint: { zh: 'DNS 解析体验', en: 'DNS resolution', ja: 'DNS解決' } },
    { key: 'duration', label: { zh: '免费期限', en: 'Free Term', ja: '無料期間' }, hint: { zh: '永久免费还是有期', en: 'Permanent or timed', ja: '永久か期限付き' } },
  ],
  charity: [
    { key: 'stability', label: { zh: '稳定性', en: 'Stability', ja: '安定性' } },
    { key: 'quota', label: { zh: '额度', en: 'Quota', ja: '枠' } },
    { key: 'usability', label: { zh: '易用性', en: 'Usability', ja: '使いやすさ' } },
  ],
  'proxy-nodes': [
    { key: 'speed', label: { zh: '速度', en: 'Speed', ja: '速度' } },
    { key: 'stability', label: { zh: '稳定性', en: 'Stability', ja: '安定性' } },
    { key: 'nodes', label: { zh: '节点数', en: 'Nodes', ja: 'ノード数' }, hint: { zh: '可用节点规模', en: 'Node scale', ja: 'ノード規模' } },
    { key: 'compat', label: { zh: '兼容性', en: 'Compatibility', ja: '互換性' } },
  ],
  'ai-agent': [
    { key: 'capability', label: { zh: '能力', en: 'Capability', ja: '能力' }, hint: { zh: '自主完成任务的水平', en: 'Autonomous task level', ja: '自律的な遂行力' } },
    { key: 'usability', label: { zh: '易用性', en: 'Usability', ja: '使いやすさ' } },
    { key: 'integration', label: { zh: '集成', en: 'Integration', ja: '連携' }, hint: { zh: '对接外部工具/API', en: 'External tools/API', ja: '外部連携' } },
    { key: 'ecosystem', label: { zh: '生态', en: 'Ecosystem', ja: 'エコシステム' } },
  ],
  'invite-system': [
    { key: 'validity', label: { zh: '有效性', en: 'Validity', ja: '有効性' }, hint: { zh: '激活码是否真能用', en: 'Code actually works', ja: 'コードが機能するか' } },
    { key: 'ease', label: { zh: '易获取', en: 'Ease', ja: '入手容易さ' } },
    { key: 'value', label: { zh: '价值', en: 'Value', ja: '価値' } },
  ],
  'invite-professional': [
    { key: 'validity', label: { zh: '有效性', en: 'Validity', ja: '有効性' } },
    { key: 'ease', label: { zh: '易获取', en: 'Ease', ja: '入手容易さ' } },
    { key: 'value', label: { zh: '价值', en: 'Value', ja: '価値' } },
  ],
  'invite-mobile': [
    { key: 'validity', label: { zh: '有效性', en: 'Validity', ja: '有効性' } },
    { key: 'ease', label: { zh: '易获取', en: 'Ease', ja: '入手容易さ' } },
    { key: 'value', label: { zh: '价值', en: 'Value', ja: '価値' } },
  ],
  'invite-games': [
    { key: 'validity', label: { zh: '有效性', en: 'Validity', ja: '有効性' } },
    { key: 'ease', label: { zh: '易获取', en: 'Ease', ja: '入手容易さ' } },
    { key: 'value', label: { zh: '价值', en: 'Value', ja: '価値' } },
  ],
  'invite-platform': [
    { key: 'validity', label: { zh: '有效性', en: 'Validity', ja: '有効性' } },
    { key: 'ease', label: { zh: '易获取', en: 'Ease', ja: '入手容易さ' } },
    { key: 'value', label: { zh: '价值', en: 'Value', ja: '価値' } },
  ],
};

/** 取某子类型的评分维度（回退默认） */
export function getRatingDimensions(subType: string): RatingDimension[] {
  return RATING_DIMENSIONS[subType] ?? DEFAULT_DIMENSIONS;
}
