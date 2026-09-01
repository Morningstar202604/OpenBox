// 每周精选数据
// 设计：每期精选 6-8 个高质量资源，带编辑推荐理由
// 资源通过 id 关联，页面运行时从 seedResources 解析完整信息

export interface WeeklyPickItem {
  /** 资源 ID（对应 Resource.id） */
  resourceId: string;
  /** 编辑推荐理由 */
  reason: string;
  /** 推荐标签：编辑推荐 / 本周新增 / 性价比之王 / 新手友好 / 隐藏宝藏 */
  tag?: 'editor' | 'new' | 'value' | 'beginner' | 'hidden';
}

export interface WeeklyPick {
  /** 期数，如 2026-W36 */
  issue: string;
  /** 期数标题 */
  title: string;
  /** 发布日期 ISO 字符串 */
  date: string;
  /** 本期导语 */
  intro: string;
  /** 精选资源列表 */
  items: WeeklyPickItem[];
}

export const weeklyPicks: WeeklyPick[] = [
  {
    issue: '2026-W36',
    title: '第36期：开学季特辑',
    date: '2026-09-01',
    intro: '新学期新气象，这期精选了 6 个适合学生党的免费 AI 工具，从写作业到做项目全覆盖，全部零成本上手。',
    items: [
      {
        resourceId: 'cups-moe',
        reason: '永久域名公益站，多模型免费 API，社区维护稳定，学生党做项目首选。',
        tag: 'editor',
      },
      {
        resourceId: 'rawchat',
        reason: '每日 100 美元额度，无需登录，打开就能用 GPT-4o，写作业神器。',
        tag: 'beginner',
      },
      {
        resourceId: 'anyrouter',
        reason: '注册送 $50，每日签到 +$25，专注 Claude Code 中转，写代码效率翻倍。',
        tag: 'value',
      },
      {
        resourceId: 'flapcode',
        reason: '开源透明，数据零存储，国内访问顺手，Claude Code/Codex 中转。',
        tag: 'new',
      },
      {
        resourceId: 'suyu',
        reason: 'GitHub Star 就能换 Key，GPT-4o 每日 30 次，Gemini/DeepSeek 每日 100 次。',
        tag: 'hidden',
      },
      {
        resourceId: 'gptgo',
        reason: '免费 GPT 镜像，无需注册，联网搜索+问答，查资料写报告都方便。',
        tag: 'beginner',
      },
    ],
  },
  {
    issue: '2026-W35',
    title: '第35期：开发者工具箱',
    date: '2026-08-25',
    intro: '这期聚焦开发者，精选了 6 个能提升编码效率的免费 API 和工具，从代码补全到调试一条龙。',
    items: [
      {
        resourceId: 'flapcode',
        reason: '开源 Claude Code 中转，数据零存储，配合 Claude Code 写代码体验拉满。',
        tag: 'editor',
      },
      {
        resourceId: 'anyrouter',
        reason: '注册送 $50，支持 Claude Code/Codex/Gemini CLI，多 Agent 工具全覆盖。',
        tag: 'value',
      },
      {
        resourceId: 'freellmapi',
        reason: '免费 LLM API 聚合，一个 Key 调用多种模型，做 Demo 练手不心疼。',
        tag: 'new',
      },
      {
        resourceId: 'cups-moe',
        reason: '永久域名公益站，OpenAI 兼容格式，直接替换 base_url 就能用。',
        tag: 'beginner',
      },
      {
        resourceId: 'rawchat-codex',
        reason: '每日 100 美元 Codex 额度，无需登录，跑代码生成任务够用。',
        tag: 'hidden',
      },
      {
        resourceId: 'fulitimes',
        reason: '与 Flapcode 联动公益站，每 10 分钟更新额度，Linux.do 账号登录。',
        tag: 'value',
      },
    ],
  },
  {
    issue: '2026-W34',
    title: '第34期：免费API合集',
    date: '2026-08-18',
    intro: '这期整理了 6 个稳定可用的免费 API 服务，适合个人开发者做项目，额度够用不心疼。',
    items: [
      {
        resourceId: 'cups-moe',
        reason: '永久域名，多模型免费 API，社区维护，稳定性有保障。',
        tag: 'editor',
      },
      {
        resourceId: 'freellmapi',
        reason: '聚合多种免费模型，统一 OpenAI 兼容接口，接入简单。',
        tag: 'value',
      },
      {
        resourceId: 'suyu',
        reason: 'GitHub Star 换 Key，GPT-4o/Gemini/DeepSeek 都有免费额度。',
        tag: 'new',
      },
      {
        resourceId: 'iamhc',
        reason: '195+ 模型无限额度，统一账号 1/1 免登录，适合批量调用。',
        tag: 'hidden',
      },
      {
        resourceId: 'wenwen-ai',
        reason: '免费 Claude Code 中转端点，公益免费，备用 breakout 域名。',
        tag: 'beginner',
      },
      {
        resourceId: 'grok-free2gpt',
        reason: '免费 Grok 访问，xAI 模型体验，无需注册。',
        tag: 'value',
      },
    ],
  },
];

/** 获取最新一期 */
export function getLatestPick(): WeeklyPick {
  return weeklyPicks[0];
}

/** 获取特定期数 */
export function getPickByIssue(issue: string): WeeklyPick | undefined {
  return weeklyPicks.find((p) => p.issue === issue);
}

/** 推荐标签的显示名和颜色 */
export const PICK_TAG_META: Record<NonNullable<WeeklyPickItem['tag']>, { label: string; color: string }> = {
  editor: { label: '编辑推荐', color: 'var(--color-primary)' },
  new: { label: '本周新增', color: 'var(--color-success)' },
  value: { label: '性价比之王', color: 'var(--color-warning)' },
  beginner: { label: '新手友好', color: 'var(--color-info)' },
  hidden: { label: '隐藏宝藏', color: 'var(--color-official)' },
};
