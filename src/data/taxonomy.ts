import type { Resource, Scenario, SubType } from '@/lib/types';
// ============================================================================
// 全站分类「单一数据源」。多级分类（一级→二级→三级），纯配置驱动。
// 新增分类只需在此追加一条，路由、导航、首页场景树、投稿表单自动适配。
// ============================================================================
// ---- 构建期分类过滤（校园版/合规版） ----
// VITE_HIDDEN_CATEGORIES=proxy-nodes,relays （逗号分隔 slug）时，被点名的分类
// 在构建产物中整体消失：导航/页面/种子资源/社区投稿合并/SPA 路径/sitemap 全链路生效。
export function parseHiddenSlugs(raw: string | undefined | null): string[] {
  if (!raw) return [];
  const seen = new Set<string>();
  for (const part of raw.split(',')) {
    const slug = part.trim();
    if (slug) seen.add(slug);
  }
  return [...seen];
}
const HIDDEN_SLUGS = new Set(parseHiddenSlugs(import.meta.env?.VITE_HIDDEN_CATEGORIES));
export function isSlugVisible(slug: string): boolean {
  return !HIDDEN_SLUGS.has(slug);
}

// ============================================================================
// 一级分类（8个大类）
// ============================================================================
const ALL_SUBTYPES: SubType[] = [
  // ---- 一级：API 服务 ----
  {
    slug: 'api-services',
    name: { zh: 'API 服务', en: 'API Services', ja: 'APIサービス' },
    icon: 'Server',
    color: '#4f46e5',
    description: { zh: '免费/付费 API、中转、聊天镜像，开发者接入首选。', en: 'Free/paid APIs, relays, chat mirrors for developers.', ja: '無料/有料API、中継、チャットミラー。' },
    sort: 1, level: 1,
  },
  // ---- 一级：AI 应用 ----
  {
    slug: 'ai-apps',
    name: { zh: 'AI 应用', en: 'AI Apps', ja: 'AIアプリ' },
    icon: 'Sparkles',
    color: '#ec4899',
    description: { zh: '开箱即用的 AI 产品：对话、编程、创作、搜索。', en: 'Ready-to-use AI: chat, coding, creation, search.', ja: 'すぐ使えるAI：チャット・コーディング・創作・検索。' },
    sort: 2, level: 1,
  },
  // ---- 一级：AI Agent ----
  {
    slug: 'ai-agents',
    name: { zh: 'AI Agent', en: 'AI Agents', ja: 'AIエージェント' },
    icon: 'Bot',
    color: '#6366f1',
    description: { zh: '智能体平台、框架与代码 Agent，构建自主工作流。', en: 'Agent platforms, frameworks and coding agents.', ja: 'エージェント基盤・フレームワーク・コードエージェント。' },
    sort: 3, level: 1,
  },
  // ---- 一级：开发工具 ----
  {
    slug: 'dev-tools',
    name: { zh: '开发工具', en: 'Dev Tools', ja: '開発ツール' },
    icon: 'Wrench',
    color: '#f59e0b',
    description: { zh: 'API 调试、模型管理、部署平台等开发效率工具。', en: 'API debugging, model management, deploy platforms.', ja: 'APIデバッグ・モデル管理・デプロイ基盤。' },
    sort: 4, level: 1,
  },
  // ---- 一级：基础设施 ----
  {
    slug: 'infrastructure',
    name: { zh: '基础设施', en: 'Infrastructure', ja: 'インフラ' },
    icon: 'HardDrive',
    color: '#06b6d4',
    description: { zh: '免费服务器、域名、代理节点，建站与上网基础。', en: 'Free servers, domains, proxy nodes.', ja: '無料サーバー・ドメイン・プロキシ。' },
    sort: 5, level: 1,
  },
  // ---- 一级：学习资源 ----
  {
    slug: 'learning',
    name: { zh: '学习资源', en: 'Learning', ja: '学習リソース' },
    icon: 'BookOpen',
    color: '#8b5cf6',
    description: { zh: '官方文档、课程、提示词、论文，从入门到研究。', en: 'Official docs, courses, prompting, papers.', ja: '公式ドキュメント・講座・プロンプト・論文。' },
    sort: 6, level: 1,
  },
  // ---- 一级：开源模型 ----
  {
    slug: 'open-models',
    name: { zh: '开源模型', en: 'Open Models', ja: 'オープンモデル' },
    icon: 'Brain',
    color: '#14b8a6',
    description: { zh: '开源大模型平台与下载，HuggingFace、ModelScope 等。', en: 'Open model platforms & downloads.', ja: 'オープンソースモデル基盤・ダウンロード。' },
    sort: 7, level: 1,
  },
  // ---- 一级：邀请码 ----
  {
    slug: 'invite-codes',
    name: { zh: '邀请码/激活码', en: 'Invite Codes', ja: '招待コード' },
    icon: 'Key',
    color: '#f59e0b',
    description: { zh: '平台、软件、游戏的邀请码与激活码，低调入口。', en: 'Invite & activation codes for platforms, software, games.', ja: 'プラットフォーム・ソフト・ゲームの招待コード。' },
    sort: 8, level: 1,
  },

  // ==========================================================================
  // 二级分类：API 服务
  // ==========================================================================
  {
    slug: 'free-api', parent: 'api-services',
    name: { zh: '免费 API', en: 'Free APIs', ja: '無料API' },
    icon: 'Gift', color: '#22c55e',
    description: { zh: '官方免费层、社区公益站、开源端点，零成本接入大模型。', en: 'Vendor free tiers, community relays, open endpoints.', ja: 'ベンダー無料枠・コミュニティ中継・OSSエンドポイント。' },
    sort: 1, level: 2,
  },
  {
    slug: 'paid-relays', parent: 'api-services',
    name: { zh: '付费中转', en: 'Paid Relays', ja: '有料中継' },
    icon: 'Network', color: '#0ea5e9',
    description: { zh: '国内/海外 API 中转与聚合平台，按量计费稳定可靠。', en: 'Domestic/overseas API relays & aggregation.', ja: '国内/海外API中継・集約プラットフォーム。' },
    sort: 2, level: 2,
  },
  {
    slug: 'free-chat', parent: 'api-services',
    name: { zh: '免费聊天镜像', en: 'Free Chat Mirrors', ja: '無料チャットミラー' },
    icon: 'MessageSquare', color: '#f43f5e',
    description: { zh: '免登录直连的 ChatGPT/Claude 等对话镜像，开箱即用。', en: 'No-login ChatGPT/Claude chat mirrors.', ja: 'ログイン不要のChatGPT/Claudeミラー。' },
    sort: 3, level: 2,
  },

  // ==========================================================================
  // 三级分类：免费 API
  // ==========================================================================
  {
    slug: 'official-free-tier', parent: 'free-api',
    name: { zh: '官方免费层', en: 'Official Free Tiers', ja: '公式無料枠' },
    icon: 'Shield', color: '#16a34a',
    description: { zh: '厂商官方免费额度：Cohere、Fireworks、Groq、GitHub Models 等。', en: 'Official vendor free tiers: Cohere, Fireworks, Groq, GitHub Models.', ja: '公式無料枠：Cohere、Fireworks、Groqなど。' },
    sort: 1, level: 3,
  },
  {
    slug: 'community-charity', parent: 'free-api',
    name: { zh: '社区公益站', en: 'Community Charity', ja: 'コミュニティ公益' },
    icon: 'Heart', color: '#ec4899',
    description: { zh: '个人/社区运营的免费 API 网关，每日签到领额度，CLI 友好。', en: 'Community-run free API gateways with daily check-in quotas.', ja: 'コミュニティ運営の無料APIゲートウェイ。' },
    sort: 2, level: 3,
  },
  {
    slug: 'open-endpoints', parent: 'free-api',
    name: { zh: '开源兼容端点', en: 'Open Endpoints', ja: 'OSS互換エンドポイント' },
    icon: 'Github', color: '#6b7280',
    description: { zh: '开源项目提供的兼容 API 端点，可自托管。', en: 'Open-source compatible API endpoints, self-hostable.', ja: 'OSS互換APIエンドポイント、セルフホスト可。' },
    sort: 3, level: 3,
  },

  // ==========================================================================
  // 三级分类：付费中转
  // ==========================================================================
  {
    slug: 'domestic-relays', parent: 'paid-relays',
    name: { zh: '国内中转', en: 'Domestic Relays', ja: '国内中継' },
    icon: 'Globe', color: '#0284c7',
    description: { zh: '国内可直连的 API 中转站，低延迟，支持支付宝/微信。', en: 'Domestic API relays with Alipay/WeChat.', ja: '国内接続可能なAPI中継、Alipay/WeChat対応。' },
    sort: 1, level: 3,
  },
  {
    slug: 'overseas-relays', parent: 'paid-relays',
    name: { zh: '海外中转', en: 'Overseas Relays', ja: '海外中継' },
    icon: 'Plane', color: '#7c3aed',
    description: { zh: '海外 API 中转与聚合平台，模型丰富，需海外支付。', en: 'Overseas API relays with rich model selection.', ja: '海外API中継、モデル豊富。' },
    sort: 2, level: 3,
  },
  {
    slug: 'aggregation-platforms', parent: 'paid-relays',
    name: { zh: '聚合平台', en: 'Aggregation', ja: '集約プラットフォーム' },
    icon: 'Layers', color: '#0891b2',
    description: { zh: '多模型聚合管理平台，一个 Key 调用多家 API。', en: 'Multi-model aggregation with unified API key.', ja: 'マルチモデル集約、単一Keyで複数API呼び出し。' },
    sort: 3, level: 3,
  },

  // ==========================================================================
  // 三级分类：免费聊天镜像
  // ==========================================================================
  {
    slug: 'claude-mirrors', parent: 'free-chat',
    name: { zh: 'Claude 镜像', en: 'Claude Mirrors', ja: 'Claudeミラー' },
    icon: 'MessageCircle', color: '#d97706',
    description: { zh: '免费 Claude 网页对话镜像，免登录直连。', en: 'Free Claude web chat mirrors, no login.', ja: '無料Claudeウェブチャットミラー。' },
    sort: 1, level: 3,
  },
  {
    slug: 'gpt-mirrors', parent: 'free-chat',
    name: { zh: 'GPT 镜像', en: 'GPT Mirrors', ja: 'GPTミラー' },
    icon: 'MessageSquare', color: '#10b981',
    description: { zh: '免费 ChatGPT 网页对话镜像，免登录直连。', en: 'Free ChatGPT web chat mirrors, no login.', ja: '無料ChatGPTウェブチャットミラー。' },
    sort: 2, level: 3,
  },
  {
    slug: 'multi-model-mirrors', parent: 'free-chat',
    name: { zh: '多模型镜像', en: 'Multi-model Mirrors', ja: 'マルチモデルミラー' },
    icon: 'MessagesSquare', color: '#dc2626',
    description: { zh: '支持多模型切换的免费聊天界面。', en: 'Free chat interfaces with multi-model switching.', ja: 'マルチモデル切替可能な無料チャット。' },
    sort: 3, level: 3,
  },

  // ==========================================================================
  // 二级分类：AI 应用
  // ==========================================================================
  {
    slug: 'chat-assistants', parent: 'ai-apps',
    name: { zh: '对话助手', en: 'Chat Assistants', ja: 'チャットアシスタント' },
    icon: 'MessageCircle', color: '#db2777',
    description: { zh: 'ChatGPT、Claude、Gemini、豆包等通用对话 AI。', en: 'ChatGPT, Claude, Gemini, Doubao and more.', ja: 'ChatGPT、Claude、Gemini、豆包など。' },
    sort: 1, level: 2,
  },
  {
    slug: 'coding-tools', parent: 'ai-apps',
    name: { zh: '编程工具', en: 'Coding Tools', ja: 'コーディングツール' },
    icon: 'Code', color: '#be185d',
    description: { zh: 'Cursor、Windsurf、Copilot 等 AI 编程助手与 IDE。', en: 'Cursor, Windsurf, Copilot and AI coding IDEs.', ja: 'Cursor、Windsurf、Copilotなど。' },
    sort: 2, level: 2,
  },
  {
    slug: 'creative-tools', parent: 'ai-apps',
    name: { zh: '创作工具', en: 'Creative Tools', ja: 'クリエイティブツール' },
    icon: 'Palette', color: '#9d174d',
    description: { zh: '图像、视频、音频、写作等 AI 创作工具。', en: 'AI tools for image, video, audio and writing.', ja: '画像・動画・音声・執筆向けAIツール。' },
    sort: 3, level: 2,
  },
  {
    slug: 'search-research', parent: 'ai-apps',
    name: { zh: '搜索研究', en: 'Search & Research', ja: '検索・研究' },
    icon: 'Search', color: '#831843',
    description: { zh: 'Perplexity、Felo、秘塔等 AI 搜索与研究助手。', en: 'Perplexity, Felo and AI search assistants.', ja: 'Perplexity、FeloなどのAI検索。' },
    sort: 4, level: 2,
  },

  // ==========================================================================
  // 三级分类：创作工具
  // ==========================================================================
  {
    slug: 'image-gen', parent: 'creative-tools',
    name: { zh: '图像生成', en: 'Image Gen', ja: '画像生成' },
    icon: 'Image', color: '#f472b6',
    description: { zh: 'Midjourney、Stable Diffusion、即梦等 AI 绘画。', en: 'Midjourney, Stable Diffusion and AI image tools.', ja: 'Midjourney、Stable Diffusionなど。' },
    sort: 1, level: 3,
  },
  {
    slug: 'video-gen', parent: 'creative-tools',
    name: { zh: '视频生成', en: 'Video Gen', ja: '動画生成' },
    icon: 'Video', color: '#ec4899',
    description: { zh: 'Sora、Runway、可灵等 AI 视频生成。', en: 'Sora, Runway and AI video generation.', ja: 'Sora、RunwayなどのAI動画生成。' },
    sort: 2, level: 3,
  },
  {
    slug: 'audio-gen', parent: 'creative-tools',
    name: { zh: '音频生成', en: 'Audio Gen', ja: '音声生成' },
    icon: 'Music', color: '#db2777',
    description: { zh: 'Suno、Udio 等 AI 音乐与语音生成。', en: 'Suno, Udio and AI music/audio generation.', ja: 'Suno、UdioなどのAI音楽生成。' },
    sort: 3, level: 3,
  },
  {
    slug: 'writing-assist', parent: 'creative-tools',
    name: { zh: '写作辅助', en: 'Writing Assist', ja: '執筆支援' },
    icon: 'PenLine', color: '#be185d',
    description: { zh: 'AI 写作、文案、润色工具。', en: 'AI writing, copywriting and editing tools.', ja: 'AI執筆・コピーライティング・校正。' },
    sort: 4, level: 3,
  },

  // ==========================================================================
  // 二级分类：AI Agent
  // ==========================================================================
  {
    slug: 'agent-platforms', parent: 'ai-agents',
    name: { zh: 'Agent 平台', en: 'Agent Platforms', ja: 'エージェント基盤' },
    icon: 'LayoutGrid', color: '#4f46e5',
    description: { zh: 'Coze、Dify、n8n、扣子等可视化 Agent 搭建平台。', en: 'Coze, Dify, n8n and visual agent platforms.', ja: 'Coze、Dify、n8nなど。' },
    sort: 1, level: 2,
  },
  {
    slug: 'agent-frameworks', parent: 'ai-agents',
    name: { zh: 'Agent 框架', en: 'Agent Frameworks', ja: 'エージェントフレームワーク' },
    icon: 'Boxes', color: '#6366f1',
    description: { zh: 'AutoGPT、LangGraph、CrewAI、AutoGen 等开发框架。', en: 'AutoGPT, LangGraph, CrewAI, AutoGen frameworks.', ja: 'AutoGPT、LangGraph、CrewAIなど。' },
    sort: 2, level: 2,
  },
  {
    slug: 'code-agents', parent: 'ai-agents',
    name: { zh: '代码 Agent', en: 'Code Agents', ja: 'コードエージェント' },
    icon: 'Terminal', color: '#818cf8',
    description: { zh: 'Roo Code、OpenHands、Devin 等自主编程 Agent。', en: 'Roo Code, OpenHands, Devin coding agents.', ja: 'Roo Code、OpenHands、Devinなど。' },
    sort: 3, level: 2,
  },

  // ==========================================================================
  // 二级分类：开发工具
  // ==========================================================================
  {
    slug: 'api-tools', parent: 'dev-tools',
    name: { zh: 'API 工具', en: 'API Tools', ja: 'APIツール' },
    icon: 'Plug', color: '#d97706',
    description: { zh: 'Postman、Apifox、Hoppscotch 等 API 调试工具。', en: 'Postman, Apifox, Hoppscotch API tools.', ja: 'Postman、Apifoxなど。' },
    sort: 1, level: 2,
  },
  {
    slug: 'model-managers', parent: 'dev-tools',
    name: { zh: '模型管理', en: 'Model Managers', ja: 'モデル管理' },
    icon: 'Cpu', color: '#b45309',
    description: { zh: 'Ollama、LM Studio、Jan 等本地模型管理工具。', en: 'Ollama, LM Studio, Jan local model managers.', ja: 'Ollama、LM Studio、Janなど。' },
    sort: 2, level: 2,
  },
  {
    slug: 'deploy-platforms', parent: 'dev-tools',
    name: { zh: '部署平台', en: 'Deploy Platforms', ja: 'デプロイ基盤' },
    icon: 'Rocket', color: '#92400e',
    description: { zh: 'Vercel、Render、Railway、Cloudflare Pages 等部署平台。', en: 'Vercel, Render, Railway, Cloudflare Pages.', ja: 'Vercel、Render、Railwayなど。' },
    sort: 3, level: 2,
  },

  // ==========================================================================
  // 二级分类：基础设施
  // ==========================================================================
  {
    slug: 'free-servers', parent: 'infrastructure',
    name: { zh: '免费服务器/VPS', en: 'Free Servers', ja: '無料サーバー' },
    icon: 'Server', color: '#0891b2',
    description: { zh: '云厂商免费层、永久免费 VPS、免费托管。', en: 'Cloud free tiers, always-free VPS, free hosting.', ja: 'クラウド無料枠・永久無料VPS・無料ホスティング。' },
    sort: 1, level: 2,
  },
  {
    slug: 'free-domains', parent: 'infrastructure',
    name: { zh: '免费域名', en: 'Free Domains', ja: '無料ドメイン' },
    icon: 'Globe', color: '#0e7490',
    description: { zh: 'eu.org、FreeDNS、US.KG 等免费域名与二级域名。', en: 'eu.org, FreeDNS, US.KG free domains.', ja: 'eu.org、FreeDNSなど。' },
    sort: 2, level: 2,
  },
  {
    slug: 'proxy-nodes', parent: 'infrastructure',
    name: { zh: '代理节点', en: 'Proxy Nodes', ja: 'プロキシ' },
    icon: 'Wifi', color: '#155e75',
    description: { zh: '免费节点订阅与代理客户端，科学上网工具。', en: 'Free proxy subscriptions and clients.', ja: '無料プロキシ購読・クライアント。' },
    sort: 3, level: 2,
  },

  // ==========================================================================
  // 三级分类：免费服务器
  // ==========================================================================
  {
    slug: 'cloud-free-tier', parent: 'free-servers',
    name: { zh: '云厂商免费层', en: 'Cloud Free Tiers', ja: 'クラウド無料枠' },
    icon: 'Cloud', color: '#06b6d4',
    description: { zh: 'AWS、GCP、Oracle、Azure 等云厂商免费额度。', en: 'AWS, GCP, Oracle, Azure free tiers.', ja: 'AWS、GCP、Oracle、Azure無料枠。' },
    sort: 1, level: 3,
  },
  {
    slug: 'free-hosting', parent: 'free-servers',
    name: { zh: '免费托管', en: 'Free Hosting', ja: '無料ホスティング' },
    icon: 'Home', color: '#0891b2',
    description: { zh: 'Render、Netlify、Vercel、Fly.io 等免费应用托管。', en: 'Render, Netlify, Vercel, Fly.io free hosting.', ja: 'Render、Netlify、Vercelなど。' },
    sort: 2, level: 3,
  },

  // ==========================================================================
  // 三级分类：代理节点
  // ==========================================================================
  {
    slug: 'free-subscriptions', parent: 'proxy-nodes',
    name: { zh: '免费节点订阅', en: 'Free Subscriptions', ja: '無料ノード購読' },
    icon: 'Rss', color: '#0e7490',
    description: { zh: '免费机场订阅、节点分享，支持 Clash/v2ray。', en: 'Free airport subscriptions, Clash/v2ray compatible.', ja: '無料エアポート購読、Clash/v2ray対応。' },
    sort: 1, level: 3,
  },
  {
    slug: 'node-clients', parent: 'proxy-nodes',
    name: { zh: '节点客户端', en: 'Node Clients', ja: 'ノードクライアント' },
    icon: 'Monitor', color: '#155e75',
    description: { zh: 'v2rayN、Clash、NekoBox 等代理客户端。', en: 'v2rayN, Clash, NekoBox proxy clients.', ja: 'v2rayN、Clash、NekoBoxなど。' },
    sort: 2, level: 3,
  },

  // ==========================================================================
  // 二级分类：学习资源
  // ==========================================================================
  {
    slug: 'official-docs', parent: 'learning',
    name: { zh: '官方文档', en: 'Official Docs', ja: '公式ドキュメント' },
    icon: 'FileText', color: '#7c3aed',
    description: { zh: 'OpenAI、Anthropic、Google 等官方 API 文档与教程。', en: 'OpenAI, Anthropic, Google official docs.', ja: 'OpenAI、Anthropic、Google公式ドキュメント。' },
    sort: 1, level: 2,
  },
  {
    slug: 'courses', parent: 'learning',
    name: { zh: '课程教程', en: 'Courses', ja: 'コース・チュートリアル' },
    icon: 'GraduationCap', color: '#8b5cf6',
    description: { zh: 'DeepLearning.AI、Coursera、B站等 AI 课程。', en: 'DeepLearning.AI, Coursera AI courses.', ja: 'DeepLearning.AI、Courseraなど。' },
    sort: 2, level: 2,
  },
  {
    slug: 'prompting', parent: 'learning',
    name: { zh: '提示词工程', en: 'Prompting', ja: 'プロンプトエンジニアリング' },
    icon: 'Lightbulb', color: '#a78bfa',
    description: { zh: 'Learn Prompting、Prompt Engineering Guide 等。', en: 'Learn Prompting, Prompt Engineering Guide.', ja: 'Learn Promptingなど。' },
    sort: 3, level: 2,
  },
  {
    slug: 'research-papers', parent: 'learning',
    name: { zh: '论文研究', en: 'Papers', ja: '論文・研究' },
    icon: 'Microscope', color: '#c4b5fd',
    description: { zh: 'arXiv、Papers with Code、HuggingFace Papers。', en: 'arXiv, Papers with Code, HuggingFace Papers.', ja: 'arXiv、Papers with Codeなど。' },
    sort: 4, level: 2,
  },

  // ==========================================================================
  // 二级分类：开源模型
  // ==========================================================================
  {
    slug: 'model-platforms', parent: 'open-models',
    name: { zh: '模型平台', en: 'Model Platforms', ja: 'モデル基盤' },
    icon: 'Database', color: '#0d9488',
    description: { zh: 'HuggingFace、ModelScope、Ollama Library 等模型平台。', en: 'HuggingFace, ModelScope, Ollama Library.', ja: 'HuggingFace、ModelScopeなど。' },
    sort: 1, level: 2,
  },
  {
    slug: 'model-downloads', parent: 'open-models',
    name: { zh: '模型下载', en: 'Model Downloads', ja: 'モデルダウンロード' },
    icon: 'Download', color: '#14b8a6',
    description: { zh: '开源模型权重下载、量化模型、GGUF 等格式。', en: 'Open model weights, quantized models, GGUF.', ja: 'オープンモデル重み・量子化モデル。' },
    sort: 2, level: 2,
  },

  // ==========================================================================
  // 二级分类：邀请码
  // ==========================================================================
  {
    slug: 'platform-invites', parent: 'invite-codes',
    name: { zh: '平台邀请', en: 'Platform Invites', ja: 'プラットフォーム招待' },
    icon: 'Globe', color: '#0ea5e9',
    description: { zh: 'AI 平台、云服务、社区论坛邀请码。', en: 'AI platforms, cloud, forum invite codes.', ja: 'AIプラットフォーム・クラウド・フォーラム招待。' },
    sort: 1, level: 2,
  },
  {
    slug: 'professional-apps', parent: 'invite-codes',
    name: { zh: '专业应用', en: 'Professional Apps', ja: 'プロフェッショナルアプリ' },
    icon: 'Briefcase', color: '#8b5cf6',
    description: { zh: '设计、办公、开发、视频剪辑等专业软件激活码。', en: 'Design, office, dev, video editing software keys.', ja: 'デザイン・オフィス・開発・動画編集ソフト。' },
    sort: 2, level: 2,
  },
  {
    slug: 'system-software', parent: 'invite-codes',
    name: { zh: '系统软件', en: 'System Software', ja: 'システムソフト' },
    icon: 'Monitor', color: '#6366f1',
    description: { zh: 'Windows/macOS/Linux 系统工具与开发环境激活码。', en: 'Windows/macOS/Linux system tools & dev env keys.', ja: 'Windows/macOS/Linuxシステムツール。' },
    sort: 3, level: 2,
  },
  {
    slug: 'mobile-apps', parent: 'invite-codes',
    name: { zh: '手机软件', en: 'Mobile Apps', ja: 'モバイルアプリ' },
    icon: 'Smartphone', color: '#ec4899',
    description: { zh: 'iOS/Android 应用内测资格与兑换码。', en: 'iOS/Android beta invites & redemption codes.', ja: 'iOS/Androidベータ招待・引き換えコード。' },
    sort: 4, level: 2,
  },
  {
    slug: 'games', parent: 'invite-codes',
    name: { zh: '游戏', en: 'Games', ja: 'ゲーム' },
    icon: 'Gamepad2', color: '#10b981',
    description: { zh: '各类游戏激活码、内测资格、礼品码。', en: 'Game activation keys, beta invites, gift codes.', ja: 'ゲームアクティベーション・ベータ・ギフトコード。' },
    sort: 5, level: 2,
  },
  // ---- 特殊分类：黑名单（不出现在导航，仅数据标记用） ----
  {
    slug: 'blacklist',
    name: { zh: '已失效', en: 'Blacklisted', ja: '無効' },
    icon: 'XCircle', color: '#6b7280',
    description: { zh: '已确认失效的资源，不展示在导航中。', en: 'Confirmed dead resources, hidden from navigation.', ja: '確認済み無効リソース。' },
    sort: 99, level: 1,
  },
];

/** 对外暴露的子类型 = 全集 − 构建期隐藏分类 */
export const subTypes: SubType[] = ALL_SUBTYPES.filter((s) => isSlugVisible(s.slug));

// ============================================================================
// 场景（用户视角的资源聚合，与分类是交叉关系）
// ============================================================================
const ALL_SCENARIOS: Scenario[] = [
  {
    slug: 'newbie',
    name: { zh: '小白白嫖', en: 'For Beginners', ja: '初心者向け' },
    icon: 'Sparkles', color: '#22c55e',
    description: { zh: '不想折腾、拿来就用的免费资源合集。', en: 'Free resources you can use right away.', ja: '設定不要ですぐ使える無料リソース。' },
    sort: 1,
  },
  {
    slug: 'developer',
    name: { zh: '开发者', en: 'Developers', ja: '開発者' },
    icon: 'Code', color: '#4f46e5',
    description: { zh: '接 API、搭环境、写 Agent 需要的工具与端点。', en: 'APIs, environments and tooling for developers.', ja: 'API・環境構築・Agent開発ツール。' },
    sort: 2,
  },
  {
    slug: 'researcher',
    name: { zh: '研究者', en: 'Researchers', ja: '研究者' },
    icon: 'Microscope', color: '#8b5cf6',
    description: { zh: '论文、长文档、RAG 与多模型对比的趁手资源。', en: 'Papers, long-context, RAG and multi-model tools.', ja: '論文・長文・RAG・マルチモデル比較。' },
    sort: 3,
  },
  {
    slug: 'creator',
    name: { zh: '创作者', en: 'Creators', ja: 'クリエイター' },
    icon: 'Palette', color: '#ec4899',
    description: { zh: '写文案、画图、做音乐、剪视频的 AI 好帮手。', en: 'AI sidekicks for writing, art, music and video.', ja: '文章・イラスト・音楽・動画制作のAI助手。' },
    sort: 4,
  },
  {
    slug: 'freshman',
    name: { zh: '新生工具包', en: 'Freshman Kit', ja: '新入生キット' },
    icon: 'Backpack', color: '#f97316',
    description: { zh: '开学季一站式合集：学习资源、实用工具、开箱即用的 AI。', en: 'One-stop kit for the new semester.', ja: '新学期向け学習・ツール・AIまとめ。' },
    sort: 5,
  },
  {
    slug: 'invite-codes',
    name: { zh: '邀请码/激活码', en: 'Invite Codes', ja: '招待コード' },
    icon: 'Key', color: '#f59e0b',
    description: { zh: '各类软件、游戏、平台的邀请码与激活码。', en: 'Invite & activation codes for software, games, platforms.', ja: 'ソフト・ゲーム・プラットフォームの招待コード。' },
    sort: 6, hidden: true,
  },
];
export const scenarios: Scenario[] = ALL_SCENARIOS.filter((s) => isSlugVisible(s.slug));

// ============================================================================
// 分类 → 场景默认映射（资源未显式声明 scenarios 时的回退）
// ============================================================================
export const SUBTYPE_SCENARIOS: Record<string, string[]> = {
  // API 服务
  'free-api': ['newbie', 'developer', 'researcher'],
  'official-free-tier': ['developer', 'researcher'],
  'community-charity': ['newbie', 'developer'],
  'open-endpoints': ['developer'],
  'paid-relays': ['developer', 'researcher'],
  'domestic-relays': ['developer'],
  'overseas-relays': ['developer', 'researcher'],
  'aggregation-platforms': ['developer'],
  'free-chat': ['newbie', 'freshman'],
  'claude-mirrors': ['newbie', 'freshman'],
  'gpt-mirrors': ['newbie', 'freshman'],
  'multi-model-mirrors': ['newbie', 'freshman'],
  // AI 应用
  'chat-assistants': ['newbie', 'creator', 'researcher', 'freshman'],
  'coding-tools': ['developer', 'freshman'],
  'creative-tools': ['creator', 'newbie'],
  'image-gen': ['creator'],
  'video-gen': ['creator'],
  'audio-gen': ['creator'],
  'writing-assist': ['creator'],
  'search-research': ['researcher'],
  // AI Agent
  'agent-platforms': ['developer', 'creator'],
  'agent-frameworks': ['developer', 'researcher'],
  'code-agents': ['developer'],
  // 开发工具
  'api-tools': ['developer'],
  'model-managers': ['developer', 'researcher'],
  'deploy-platforms': ['developer'],
  // 基础设施
  'free-servers': ['newbie', 'developer'],
  'cloud-free-tier': ['developer'],
  'free-hosting': ['developer', 'newbie'],
  'free-domains': ['newbie', 'developer'],
  'proxy-nodes': ['newbie', 'developer'],
  'free-subscriptions': ['newbie'],
  'node-clients': ['newbie', 'developer'],
  // 学习资源
  'official-docs': ['developer', 'researcher'],
  'courses': ['newbie', 'developer', 'researcher', 'freshman'],
  'prompting': ['developer', 'researcher', 'creator'],
  'research-papers': ['researcher'],
  // 开源模型
  'model-platforms': ['developer', 'researcher'],
  'model-downloads': ['developer', 'researcher'],
  // 邀请码
  'platform-invites': ['invite-codes'],
  'professional-apps': ['invite-codes'],
  'system-software': ['invite-codes'],
  'mobile-apps': ['invite-codes'],
  'games': ['invite-codes'],
};

// ============================================================================
// 快捷映射与工具函数
// ============================================================================
export const subTypeMap: Record<string, SubType> = Object.fromEntries(subTypes.map((s) => [s.slug, s]));
export const scenarioMap: Record<string, Scenario> = Object.fromEntries(scenarios.map((s) => [s.slug, s]));

export function getSubType(slug: string): SubType | undefined {
  return subTypeMap[slug];
}
export function getScenario(slug: string): Scenario | undefined {
  return scenarioMap[slug];
}
export function getAllSubTypes(): SubType[] {
  return [...subTypes].sort((a, b) => a.sort - b.sort);
}
export function getAllScenarios(): Scenario[] {
  return [...scenarios].sort((a, b) => a.sort - b.sort);
}

/** 获取某分类的所有子分类（下一级） */
export function getChildren(slug: string): SubType[] {
  return subTypes.filter((s) => s.parent === slug).sort((a, b) => a.sort - b.sort);
}

/** 获取分类的完整祖先链（从一级到当前） */
export function getAncestors(slug: string): SubType[] {
  const chain: SubType[] = [];
  let current: SubType | undefined = subTypeMap[slug];
  while (current) {
    chain.unshift(current);
    current = current.parent ? subTypeMap[current.parent] : undefined;
  }
  return chain;
}

/** 获取一级分类列表 */
export function getTopLevelCategories(): SubType[] {
  return subTypes.filter((s) => s.level === 1).sort((a, b) => a.sort - b.sort);
}

/** 获取叶子分类（没有子分类的） */
export function getLeafCategories(): SubType[] {
  const parents = new Set(subTypes.map((s) => s.parent).filter(Boolean));
  return subTypes.filter((s) => !parents.has(s.slug));
}

export function resolveScenarios(r: Resource): string[] {
  if (r.scenarios && r.scenarios.length) return r.scenarios;
  return SUBTYPE_SCENARIOS[r.subType] ?? [];
}

export interface ScenarioTreeNode {
  scenario: Scenario;
  subTypes: SubType[];
  count: number;
}

export function buildScenarioTree(resources: Resource[]): ScenarioTreeNode[] {
  const byScenario = new Map<string, Set<string>>();
  const countByScenario = new Map<string, number>();
  for (const r of resources) {
    const scs = resolveScenarios(r);
    for (const sc of scs) {
      if (!byScenario.has(sc)) byScenario.set(sc, new Set());
      byScenario.get(sc)!.add(r.subType);
      countByScenario.set(sc, (countByScenario.get(sc) ?? 0) + 1);
    }
  }
  return scenarios
    .filter((s) => !s.hidden && byScenario.has(s.slug))
    .map((s) => ({
      scenario: s,
      subTypes: [...byScenario.get(s.slug)!]
        .map((slug) => subTypeMap[slug])
        .filter(Boolean)
        .sort((a, b) => a.sort - b.sort),
      count: countByScenario.get(s.slug) ?? 0,
    }));
}
