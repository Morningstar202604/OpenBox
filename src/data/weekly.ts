import type { LocalizedText } from '@/lib/types';

export interface WeeklyUpdate {
  /** 稳定唯一标识（用于 React key，避免 index 做 key 导致不必要的重渲染） */
  id: string;
  /** 展示用日期，如 '2026-08-01' */
  date: string;
  kind: 'update' | 'account' | 'notice';
  title: LocalizedText;
  desc?: LocalizedText;
}

// 配置文件驱动：后续在此追加「账号动态 / 每周更新」即可，组件无需改动。
export const weeklyUpdates: WeeklyUpdate[] = [
  {
    id: 'audit-0822',
    date: '2026-08-22',
    kind: 'update',
    title: {
      zh: '全量数据真实性审计完成',
      en: 'Full data authenticity audit completed',
      ja: '全データ真実性監査を完了',
    },
    desc: {
      zh: '十种验证方法逐站核验 278 条资源：17+ 条停摆/转型/域名迁移条目已修正或标注，新增域名到期预警。',
      en: 'All 278 resources verified site-by-site with 10 methods: 17+ dead/pivoted/migrated entries corrected or annotated, domain expiry warnings added.',
      ja: '10種類の検証で278件を全站確認：停止・転換・ドメイン移転の17件以上を修正・注記し、ドメイン期限警告を追加。',
    },
  },
  {
    id: 'ratings-live',
    date: '2026-08-22',
    kind: 'account',
    title: {
      zh: '分维度评分功能正式可用',
      en: 'Dimension ratings are now live',
      ja: '多次元評価機能が利用可能に',
    },
    desc: {
      zh: '登录后即可在资源详情页按稳定性/速度/性价比/模型覆盖打分，聚合均值全员可见。',
      en: 'Log in to rate any resource on stability, speed, value and model coverage — aggregated averages are public.',
      ja: 'ログインして安定性・速度・コスパ・モデル対応を評価でき、平均値は全員に公開されます。',
    },
  },
  {
    id: 'router-migration',
    date: '2026-08-22',
    kind: 'update',
    title: {
      zh: '路由升级为真实路径',
      en: 'Routes upgraded to real paths',
      ja: 'ルーティングを実パスに移行',
    },
    desc: {
      zh: '/resource/xxx 直链可访问；旧 #/ 链接自动跳转兼容，收藏与搜索引擎收录不受影响。',
      en: 'Direct links like /resource/xxx now work; legacy #/ links auto-compat — bookmarks and SEO unaffected.',
      ja: '/resource/xxx の直リンクが可能に。旧 #/ リンクも自動互換、ブックマークやSEOは影響なし。',
    },
  },
  {
    id: 'domain-new',
    date: '2026-08-22',
    kind: 'notice',
    title: {
      zh: '站点迁移至新域名并支持自动部署',
      en: 'Site migrated with auto-deploy enabled',
      ja: 'サイトを新ドメインへ移行、自動デプロイ対応',
    },
    desc: {
      zh: '主域名更新为 openbox-nav.pages.dev，此后每次代码合并都会自动构建发布。',
      en: 'Primary domain is now openbox-nav.pages.dev; every merged change auto-builds and deploys.',
      ja: 'メインドメインは openbox-nav.pages.dev に。マージするたび自動ビルド＆デプロイされます。',
    },
  },
  {
    id: 'domain-2026-08-26',
    date: '2026-08-26',
    kind: 'notice',
    title: {
      zh: '主域名迁移至 openbox-nav-5ke.pages.dev，CI 自动部署恢复',
      en: 'Primary domain moved to openbox-nav-5ke.pages.dev; CI auto-deploy restored',
      ja: 'メインドメインが openbox-nav-5ke.pages.dev に。CI自動デプロイ復活',
    },
    desc: {
      zh: 'Cloudflare 账号迁移完成：canonical/sitemap/OG 全站指向新地址，push main 即自动构建直传。',
      en: 'Cloudflare account migrated: canonical, sitemap and OG tags now point to the new address; every push to main auto-deploys.',
      ja: 'Cloudflare アカウント移行完了：canonical・sitemap・OG すべて新アドレスへ。main への push で自動デプロイ。',
    },
  },
  {
    id: 'open',
    date: '2026-08-04',
    kind: 'notice',
    title: {
      zh: 'OpenBox 导航站上线',
      en: 'OpenBox directory is live',
      ja: 'OpenBox ナビ公開',
    },
    desc: {
      zh: '聚合免费 API、中转站、代理节点、AI 应用与实用工具，一处直达。',
      en: 'Free APIs, relays, proxy nodes, AI apps and tools — all in one place.',
      ja: '無料API・中継局・プロキシ・AIアプリ・ツールを一か所に。',
    },
  },
  {
    id: 'free-api',
    date: '2026-08-04',
    kind: 'update',
    title: {
      zh: '新增官方免费 API 合集',
      en: 'Official free APIs added',
      ja: '公式無料APIを追加',
    },
    desc: {
      zh: '已收录 Google AI Studio、Groq、Cerebras、OpenRouter 等稳定免费档。',
      en: 'Added stable free tiers: Google AI Studio, Groq, Cerebras, OpenRouter and more.',
      ja: 'Google AI Studio・Groq・Cerebras・OpenRouter など安定無料枠を収録。',
    },
  },
  {
    id: 'submissions',
    date: '2026-08-04',
    kind: 'account',
    title: {
      zh: '投稿通道已开放',
      en: 'Submissions are open',
      ja: '投稿受付中',
    },
    desc: {
      zh: '欢迎通过「投稿」补充你常用的免费资源，审核通过后上线。',
      en: 'Submit your favorite free resources via the form; they go live after review.',
      ja: '「投稿」からお気に入りの無料リソースを送信できます（確認後公開）。',
    },
  },
];
