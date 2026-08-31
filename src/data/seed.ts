// 本地种子数据：作为「未配置 Supabase 时」的兜底数据源，也作为生产库的初始内容。
// 内容来源：① 既有策展数据（src/data/sites.ts，API/中转类）经映射复用；② 新分类的精选真实条目。
import type { Resource, ResourceType } from '@/lib/types';
import { normalizeUrlKey, urlHost } from '@/lib/url';
import { SUBTYPE_SCENARIOS, isSlugVisible } from './taxonomy';
import { sites, deriveFeatures, type Site } from './sites';
import { curatedResources } from './curated';
import { isBlacklisted } from './blacklist';

// ---- 旧 Category -> 新 slug 映射（黑名单整体丢弃） ----
const LEGACY_MAP: Record<string, string> = {
  linuxdo: 'free-api',
  overseas: 'free-api',
  domestic: 'free-api',
  freerelay: 'relays',
  paidrelay: 'relays',
  tool: 'tools',
  freechat: 'freechat',
};

// 逐条改道表（按 id）：真公益站被旧分类映射压在 free-api/relays 下，归位 charity。
// 注意：ggboom/v-api/bmapi/helpcoder 虽名带「公益」，但 2026-08-22 审计已定性为商业网关
// （见各自 tips），维持 relays 不改——此处只收经核实的社区公益站。
const LEGACY_SUBTYPE_OVERRIDE: Record<string, string> = {
  huainova: 'charity', // Huainova公益站：Linux.do 社区免费 Claude/GPT，真公益
};

function mapLegacy(s: Site): Resource | null {
  const category = LEGACY_MAP[s.category];
  if (!category) return null; // blacklist 等不纳入新站
  // 逐条改道：真公益站被旧分类压在 free-api 下的，归位 charity（审计记录见各自 tips）
  const subType = LEGACY_SUBTYPE_OVERRIDE[s.id] ?? category;
  return {
    id: s.id,
    subType,
    scenarios: SUBTYPE_SCENARIOS[subType] ?? [],
    name: s.name,
    url: s.url,
    type: s.type,
    status: s.status,
    summary: s.tagline ?? s.desc,
    description: s.desc,
    tags: s.features && s.features.length ? s.features : deriveFeatures(s),
    models: s.models,
    pricing: s.billing,
    register: s.register,
    pros: s.pros,
    cons: s.cons,
    tips: s.tips,
    official: s.category === 'official-free-tier',
    // featured 一律 false：此前的 featuredIds（wzw/duckcoding-free 等）指向已被
    // 白名单/黑名单过滤掉的条目，是死配置；首页精选由 curated 条目的 featured 标记驱动
    featured: false,
  };
}

// ---- 免费中转站存活白名单（2026-08-04 HTTP 实跳验证）----
// 原 sites.ts 中 160+ 个免费镜像/公益站已不可达（超时/404/关站），
// 此类站点生命周期极短，仅保留经 curl -L 实测可访问的。
// 纪律：status='dead' 或实测 5xx 的条目不得入列（aifast/apikeyfun 曾被误收，已移除）。
const ALIVE_LEGACY_URLS = new Set([
'https://aierxin.cc', 'https://1000zhen.com', 'https://4router.net', 'https://80aj.com', 'https://ai.huaibao.top',
  'https://ai.huan666.de',
  'https://aigc2d.com', 'https://aigcbar.com', 'https://aiproxy.best', 'https://anticode.cn',
  'https://api.aizzz.xyz', 'https://api.bltcy.ai', 'https://api.gemai.cc', 'https://api.honglin.asia', 'https://api.lmuai.com',
  'https://api.rcouyi.com', 'https://api2d.com', 'https://api2gpt.com',
  'https://apinav.cc', 'https://apiyi.com', 'https://bailian.console.aliyun.com', 'https://cgs.skybyte.me/',
  'https://chatgptplus.cn', 'https://chatz.free2gpt.com', 'https://cloud.tencent.com/product/hunyuan',
  'https://code.wenwen-ai.com', 'https://cubence.com', 'https://developers.cloudflare.com/workers-ai', 'https://duckllm.com', 'https://gemini.chat',
  'https://keylabs.ai', 'https://kimi.ai', 'https://ohmygpt.com', 'https://platform.openai.com', 'https://qwen.ai',
  'https://replicate.com', 'https://siliconflow.cn', 'https://tencentcloud.com', 'https://together.ai', 'https://xfyun.cn',
  'https://zerooneai.com',
]);

const legacyAliveHosts = new Set([...ALIVE_LEGACY_URLS].map(urlHost));

const legacyResources: Resource[] = sites
  // host 级匹配：全串精确匹配会因尾斜杠/协议/WWW 差异漏判（如 'https://cgs.skybyte.me/'）
  .filter((s) => legacyAliveHosts.has(urlHost(s.url)))
  .map(mapLegacy)
  .filter((r): r is Resource => r !== null);

// ---- 新分类精选条目（均为稳定、可公开验证的真实项目/产品） ----

/** 已生成的 id 集合：中文名等非 ASCII 名称会被替换成纯连字符，导致多个资源共用同一 id（如
 *  「通义千问/文心一言/智谱清言/讯飞星火」此前都是 `cur-ai-apps-----`），这里对冲突项追加
 *  内容 hash 保证唯一，同时保持既有非冲突 id 不变（不影响已收藏/已投票数据）。 */
const usedIds = new Set<string>();

/** 简单稳定的字符串 hash（djb2），用于为冲突 id 追加唯一后缀 */
function strHash(s: string): string {
  let h = 5381;
  for (let i = 0; i < s.length; i++) h = ((h << 5) + h + s.charCodeAt(i)) >>> 0;
  return h.toString(36);
}

function mk(subType: string, name: string, url: string, extra: Partial<Resource> = {}): Resource {
  const base = `cur-${subType}-${name}`.replace(/[^a-zA-Z0-9-]/g, '-').toLowerCase();
  let id: string = base;
  if (usedIds.has(id)) id = `${base}-${strHash(name)}`;
  usedIds.add(id);
  return {
    subType,
    scenarios: SUBTYPE_SCENARIOS[subType] ?? [],
    name,
    url,
    type: 'free' as ResourceType,
    status: 'unknown',
    summary: '',
    description: '',
    tags: [],
    ...extra,
    id, // id 放在 extra 之后，确保不被 Partial<Resource> 的可选 id 覆盖为 undefined
  };
}

const curated: Resource[] = [
  // ===== 免费 API：官方/社区稳定免费额度（OpenAI 兼容为主），与 freechat 镜像站区分 =====
  mk('official-free-tier', 'Google AI Studio (Gemini)', 'https://aistudio.google.com', {
    type: 'freemium', status: 'ok', official: true, featured: true,
    summary: 'Google AI Studio｜官方Gemini免费额度',
    description: 'Google AI Studio是免费模型API，官方 Gemini 系列 playground 含免费额度。适合新手与开发者，支持多模态输入。',
    tags: ['大模型', '免费', '官方', '多模态', '海外'], models: ['Gemini 2.5/3 Flash', 'Gemini Pro'],
    pros: ['官方免费', '上下文长'], cons: ['区域限制'], tips: '免费版足够日常原型验证。',
    steps: [
      '打开 AI Studio 并用 Google 账号登录（免费），无需绑卡',
      '左侧「Get API key」创建一个 API key（仅首次需要）',
      '在 API 设置中选择可用区域，按 OpenAI 兼容格式调用 Gemini API 即可',
    ],
  }),
  mk('official-free-tier', 'Groq', 'https://groq.com', {
    type: 'freemium', status: 'ok', official: true,
    summary: 'Groq｜海外LPU极速推理免费档',
    description: 'Groq是免费模型API，以 LPU 提供极低延迟推理并含免费档。适合开发者，OpenAI 兼容覆盖 Llama、Qwen 等。',
    tags: ['大模型', '免费', '推理', '海外', 'OpenAI兼容'], models: ['Llama', 'Gemma', 'Qwen'],
    pros: ['速度极快', '免费额度'], cons: ['模型受限'],
  }),
  mk('official-free-tier', 'Cerebras', 'https://cerebras.ai', {
    type: 'freemium', status: 'ok', official: true,
    summary: 'Cerebras｜海外高速推理免费档',
    description: 'Cerebras是免费模型API，提供高速推理并含免费档。适合开发者，OpenAI 兼容支持 GPT-OSS、GLM。',
    tags: ['大模型', '免费', '推理', '海外', 'OpenAI兼容'], models: ['GPT-OSS', 'GLM'], pros: ['额度大', '快'],
  }),
  mk('official-free-tier', 'GitHub Models', 'https://github.com/marketplace/models', {
    type: 'free', status: 'ok', official: true,
    summary: 'GitHub Models｜官方前沿模型免费试用',
    description: 'GitHub Models是免费模型API，在统一接口试用 Claude、GPT、Llama 等前沿模型。适合开发者，官方 OpenAI 兼容。',
    tags: ['大模型', '免费', '官方', '海外', 'OpenAI兼容'], models: ['GPT', 'Claude', 'Llama', 'Phi'],
    pros: ['前沿模型', '集成 GitHub'], cons: ['限额'],
  }),
  mk('official-free-tier', 'Mistral Platform', 'https://mistral.ai', {
    type: 'freemium', status: 'ok', official: true,
    summary: 'Mistral Platform｜官方模型免费档',
    description: 'Mistral Platform是免费模型API，提供 Mistral、Codestral 开放模型含免费档。适合开发者，官方 OpenAI 兼容。',
    tags: ['大模型', '免费', '官方', '海外', 'OpenAI兼容'], models: ['Mistral', 'Codestral'], pros: ['欧洲合规', '免费档'],
  }),
  mk('official-free-tier', 'SiliconFlow (硅基流动)', 'https://siliconflow.cn', {
    type: 'freemium', status: 'ok', official: true,
    summary: '国内可用的多模型 API，注册送免费额度，OpenAI 兼容。',
    description: 'SiliconFlow 聚合 Qwen、DeepSeek、GLM 等开源模型，提供国内直连 API 与免费额度，兼容 OpenAI 接口。',
    tags: ['国产', 'OpenAI兼容'], models: ['Qwen', 'DeepSeek', 'GLM'], pros: ['国内直连', '免费额度'],
  }),
  mk('domestic-relays', 'Together AI', 'https://www.together.ai', {
    type: 'freemium', status: 'ok', official: true,
    summary: 'Together AI｜海外开放模型推理平台',
    description: 'Together AI 是商业开放模型推理平台（serverless/微调），2025-07 起取消免费试用，最低充值 $5 可用。适合需要批量推理的开发者，OpenAI 兼容。',
    tags: ['海外', 'OpenAI兼容'], models: ['Llama', 'Qwen', 'DeepSeek'], pros: ['模型多'],
  }),
  mk('official-free-tier', 'NVIDIA NIM', 'https://build.nvidia.com', {
    type: 'freemium', status: 'ok', official: true,
    summary: 'NVIDIA NIM｜官方推理微服务免费档',
    description: 'NVIDIA NIM是免费模型API，以容器化微服务形式提供推理端点含免费档。适合开发者，官方 OpenAI 兼容。',
    tags: ['大模型', '免费', '官方', '海外', 'OpenAI兼容'], models: ['Nemotron', 'Llama'], pros: ['官方优化'],
  }),
  mk('official-free-tier', 'Hugging Face Inference', 'https://huggingface.co/inference-api', {
    type: 'freemium', status: 'ok', official: true,
    summary: 'Hugging Face Inference｜开源模型免费推理',
    description: 'Hugging Face Inference是免费模型API，Serverless 推理调用海量开源模型含免费档。适合开发者，OpenAI 兼容。',
    tags: ['大模型', '免费', '开源', '海外', 'OpenAI兼容'], models: ['Llama', 'Mistral', 'Qwen'], pros: ['模型海量'],
  }),
  mk('official-free-tier', 'Pollinations', 'https://pollinations.ai', {
    type: 'free', status: 'ok', official: true,
    summary: 'Pollinations｜免密钥文本图像免费API',
    description: 'Pollinations是免费模型API，免注册免密钥生成文本与图像含 OpenAI 兼容。适合新手与开发者，轻量集成即用。',
    tags: ['免费', '无需密钥', 'OpenAI兼容'], models: ['开放模型'], pros: ['零门槛'], cons: ['限流'],
  }),
  mk('official-free-tier', 'SambaNova', 'https://sambanova.ai', {
    type: 'freemium', status: 'ok', official: true,
    summary: 'SambaNova｜官方超快推理免费档',
    description: 'SambaNova是免费模型API，提供超快推理可试用 Llama 3.1 405B 等大模型。适合开发者，官方 OpenAI 兼容。',
    tags: ['大模型', '免费', '官方', '海外', 'OpenAI兼容'], models: ['Llama 3.1 405B', 'Llama 3.1 70B'],
    pros: ['超大模型', '速度极快'], cons: ['需绑卡', '额度有限'],
  }),
  mk('official-free-tier', '阶跃星辰 StepFun', 'https://platform.stepfun.com', {
    type: 'freemium', status: 'ok', official: true,
    summary: '阶跃星辰 StepFun｜国产官方模型免费档',
    description: '阶跃星辰 StepFun是免费模型API，国产官方提供 Step-2 与 Step-3.5-Flash 等模型含免费档。适合国内开发者，OpenAI 兼容。',
    tags: ['大模型', '免费', '官方', '国产', 'OpenAI兼容'], models: ['Step-2', 'Step-3.5-Flash'],
    pros: ['编码优化', '国内直连'], cons: ['额度有限'],
  }),
  mk('official-free-tier', 'OVHcloud AI Endpoints', 'https://endpoints.ai.cloud.ovh.net', {
    type: 'free', status: 'ok', official: true,
    summary: 'OVHcloud AI Endpoints｜永久免费匿名API',
    description: 'OVHcloud AI Endpoints是免费模型API，提供永久免费匿名层无需注册。适合开发者，海外托管 Llama、Mistral 等。',
    tags: ['官方', '海外', '免费', '匿名'], models: ['Llama', 'Mistral', 'Qwen'],
    pros: ['无需注册', '永久免费'], cons: ['速率低', '仅 EU'],
  }),

  // ===== 中转站：以 OpenAI 兼容聚合为主（与 freechat 镜像区分，此处为 API 网关类） =====
  mk('overseas-relays', 'OpenRouter', 'https://openrouter.ai', {
    type: 'freemium', status: 'ok', official: true, featured: true,
    summary: 'OpenRouter｜聚合多模型含免费档',
    description: 'OpenRouter是付费中转API，单一接口聚合 OpenAI、Anthropic、Google 等多模型。适合开发者，含 :free 免费档。',
    tags: ['聚合', '海外', 'OpenAI兼容'], models: ['GPT', 'Claude', 'Llama', 'Gemini'],
    pros: ['模型极多', '免费档'], cons: ['免费模型轮换'],
  }),

  // ===== 代理节点：以客户端/核心/聚合项目为主（节点订阅时效性极强，故只列稳定项目） =====
  mk('node-clients', 'v2rayN', 'https://github.com/2dust/v2rayN', {
    type: 'free', status: 'ok',
    summary: 'v2rayN｜Windows 开源 V2Ray 客户端',
    description: 'v2rayN 是 Windows 平台的开源 V2Ray 图形客户端，支持 VMess/VLESS/Trojan/SS 全协议与订阅管理。适合 Windows 用户，开源免费、协议覆盖全。',
    tags: ['客户端', 'Windows', '开源'], protocols: ['vmess', 'vless', 'trojan', 'ss'],
    pros: ['协议最全', '社区活跃', '订阅方便'], cons: ['仅 Windows 原生'],
    tips: '搭配节点订阅地址使用，注意及时更新核心版本。',
  }),
  mk('node-clients', 'v2rayNG', 'https://github.com/2dust/v2rayNG', {
    type: 'free', status: 'ok',
    summary: 'v2rayNG｜Android 开源 V2Ray 客户端',
    description: 'v2rayNG 是 Android 平台的开源 V2Ray 客户端，支持扫码与订阅导入。适合手机用户，界面简洁、开源免费、上手快。',
    tags: ['客户端', 'Android', '开源'], protocols: ['vmess', 'vless', 'trojan', 'ss'],
    pros: ['免费开源', '轻量'], cons: ['仅 Android'],
  }),
  mk('node-clients', 'mihomo (Clash Meta)', 'https://github.com/MetaCubeX/mihomo', {
    type: 'free', status: 'ok',
    summary: 'mihomo (Clash Meta)｜活跃 Clash 分支核心',
    description: 'mihomo（原 Clash Meta）是当前最活跃的 Clash 开源核心，支持真规则、TUN 全局代理与多协议。适合进阶用户，跨平台、规则分流强。',
    tags: ['核心', '开源', '跨平台'], protocols: ['vmess', 'vless', 'trojan', 'ss', 'ssr'],
    pros: ['规则引擎强', '跨平台'], cons: ['需自行配置前端'],
    tips: '可配合 Clash Verge Rev 等 GUI 使用。注意：GitHub 主页现为其他项目（崩铁数据解析库），Clash 内核安装包见 Releases 或使用 Clash Verge Rev 内置版本。',
  }),
  mk('node-clients', 'Clash Verge Rev', 'https://github.com/clash-verge-rev/clash-verge-rev', {
    type: 'free', status: 'ok',
    summary: 'Clash Verge Rev｜基于 mihomo 的跨平台 GUI',
    description: 'Clash Verge Rev 是社区维护的 Clash Verge 增强版，内置 mihomo 核心，支持系统代理与 TUN。适合桌面用户，开源免费、体验顺滑。',
    tags: ['客户端', '跨平台', '开源'], protocols: ['vmess', 'vless', 'trojan', 'ss'],
    pros: ['开箱即用', '界面现代'], cons: ['依赖核心更新'],
  }),
  mk('free-subscriptions', 'sing-box', 'https://github.com/SagerNet/sing-box', {
    type: 'free', status: 'ok',
    summary: 'sing-box｜灵活的下一代代理核心',
    description: 'sing-box 是 SagerNet 团队开发的开源代理核心，统一支持多种入站/出站协议、配置灵活。适合进阶用户，跨平台、路由能力强。',
    tags: ['核心', '开源', '跨平台'], protocols: ['vmess', 'vless', 'trojan', 'ss', 'hysteria', 'tuic'],
    pros: ['协议新', '性能高'], cons: ['配置门槛较高'],
  }),
  mk('free-subscriptions', 'NekoBox', 'https://github.com/MatsuriDayo/NekoBoxForAndroid', {
    type: 'free', status: 'ok',
    summary: 'NekoBox｜移动端 sing-box 图形客户端',
    description: 'NekoBox 是基于 sing-box 的开源图形客户端，提供移动端友好的订阅与分流体验。适合手机用户，开源免费、支持 Android/iOS。',
    tags: ['客户端', '移动端', '开源'], protocols: ['vmess', 'vless', 'trojan', 'ss'],
    pros: ['移动端友好'], cons: ['iOS 需自签'],
  }),
  mk('free-subscriptions', 'hiddify', 'https://github.com/hiddify/hiddify-app', {
    type: 'free', status: 'ok',
    summary: 'hiddify｜多平台开源代理客户端',
    description: 'hiddify 是跨平台的开源代理客户端，内置智能路由与订阅管理。适合各端用户，开源免费、强调易用与抗封锁。',
    tags: ['客户端', '跨平台', '开源'], protocols: ['vmess', 'vless', 'trojan', 'ss'],
    pros: ['多端一致', '易用'], cons: ['体积偏大'],
  }),
  mk('free-subscriptions', 'freefq/freefq', 'https://github.com/freefq/freefq', {
    type: 'free', status: 'dead',
    summary: 'freefq/freefq｜已失效的节点聚合仓库',
    description: 'freefq 曾是 GitHub 免费节点聚合仓库，目前仓库已不可访问（404）下线。已失效，寻找替代请改用其他仍在维护的节点项目。',
    tags: ['订阅聚合', '已失效'], protocols: ['vmess', 'vless', 'trojan', 'ss'],
    pros: [], cons: ['仓库已删', '不可用'],
    tips: '建议移步其他仍在更新的节点聚合源。',
  }),

  // ===== AI 应用 =====
  mk('chat-assistants', 'ChatGPT', 'https://chatgpt.com', {
    type: 'freemium', status: 'ok', official: true,
    summary: 'ChatGPT｜对话式 AI 助手',
    description: 'ChatGPT 是对话式 AI 助手，支持 GPT-4o 等多模型问答与创作。适合新手与创作者，官方出品、免费档可用。',
    tags: ['对话', '海外', '官方'], models: ['GPT-4o', 'GPT-4o mini', 'o系列'],
    pros: ['生态最全', '插件丰富'], cons: ['免费层有限额'], tips: '免费版够日常轻量使用。',
  }),
  mk('chat-assistants', 'Claude', 'https://claude.ai', {
    type: 'freemium', status: 'ok', official: true,
    summary: 'Claude｜长文本对话 AI',
    description: 'Claude 是对话式 AI 助手，长文本与代码能力突出，提供 Opus/Sonnet/Haiku 多档模型。适合研究与开发者，官方出品。',
    tags: ['对话', '海外', '官方'], models: ['Claude Opus', 'Claude Sonnet', 'Claude Haiku'],
    pros: ['长上下文', '代码强'], cons: ['区域限制'],
  }),
  mk('chat-assistants', 'Gemini', 'https://gemini.google.com', {
    type: 'freemium', status: 'ok', official: true,
    summary: 'Gemini｜多模态对话 AI',
    description: 'Gemini 是多模态对话 AI，支持文本、图像与代码理解，提供 Pro/Flash 模型。适合多场景创作，官方出品。',
    tags: ['对话', '多模态', '官方', '海外'], models: ['Gemini Pro', 'Gemini Flash'],
    pros: ['多模态', '免费额度'], cons: ['地区限制'],
  }),
  mk('search-research', 'Perplexity', 'https://perplexity.ai', {
    type: 'freemium', status: 'ok',
    summary: 'Perplexity｜AI 搜索问答引擎',
    description: 'Perplexity 是 AI 搜索问答引擎，将检索与生成结合，回答自带来源引用。适合研究型查询，答案可溯源。',
    tags: ['搜索', '海外'], pros: ['有引用', '实时'], cons: ['免费版限额'],
  }),
  mk('chat-assistants', 'Poe', 'https://poe.com', {
    type: 'freemium', status: 'ok',
    summary: 'Poe｜聚合多模型对话平台',
    description: 'Poe 是聚合多模型的对话平台，单站即可调用 GPT、Claude、Llama 等。适合想一站试用多家模型的用户。',
    tags: ['聚合', '海外'], models: ['GPT', 'Claude', 'Llama'], pros: ['多模型', '入口统一'],
  }),
  mk('api-tools', 'Cursor', 'https://cursor.com', {
    type: 'freemium', status: 'ok',
    summary: 'Cursor｜AI 原生代码编辑器',
    description: 'Cursor 是 AI 原生代码编辑器（VS Code 分支），内置代码补全与对话式改写。适合开发者提效，免费版可用基础模型。',
    tags: ['编程', '海外'], pros: ['编码强', '免费档可用'], cons: ['高级模型需订阅'],
  }),
  mk('api-tools', 'v0', 'https://v0.app', {
    type: 'freemium', status: 'ok',
    summary: 'v0｜文本生成前端界面的 AI 工具',
    description: 'v0 是 Vercel 出品的 AI 界面生成器，用提示生成 React/Tailwind 组件与页面。适合快速原型，文本即前端。',
    tags: ['编程', '前端'], pros: ['出图快'], cons: ['需登录'],
  }),
  mk('image-gen', 'Midjourney', 'https://www.midjourney.com', {
    type: 'paid', status: 'ok',
    summary: 'Midjourney｜AI 绘画生成工具',
    description: 'Midjourney 是 AI 绘画生成工具，以高质量图像著称，采用付费订阅制。适合追求画面质感的设计师。',
    tags: ['绘画', '海外'], pros: ['画质顶级'], cons: ['纯付费'],
  }),
  mk('audio-gen', 'Suno', 'https://suno.com', {
    type: 'freemium', status: 'ok',
    summary: 'Suno｜AI 音乐生成工具',
    description: 'Suno 是 AI 音乐生成工具，可据歌词或描述生成含人声与编曲的歌曲。适合音乐创作者，免费档有额度。',
    tags: ['音乐', '海外'], pros: ['生成完整曲'], cons: ['免费有限额'],
  }),
  mk('chat-assistants', 'HuggingChat', 'https://huggingface.co/chat', {
    type: 'free', status: 'ok',
    summary: 'HuggingChat｜开源模型对话助手',
    description: 'HuggingChat 是开源模型对话助手，直接调用 Llama、Mistral 等开源模型，无需密钥。适合注重开源的用户，完全免费。',
    tags: ['对话', '开源', '海外'], models: ['Llama', 'Mistral'], pros: ['真免费', '开源'],
  }),
  mk('official-free-tier', 'Kimi 开放平台', 'https://platform.kimi.com', {
    type: 'freemium', status: 'ok', official: true,
    summary: 'Kimi 开放平台｜国产长上下文 API',
    description: 'Kimi 开放平台是月之暗面官方 API 开放平台，提供 K 系列大模型接口，长上下文、中文友好。适合开发者，新用户有免费额度。',
    tags: ['大模型', '免费', 'OpenAI兼容', '国产', '官方'], pros: ['长上下文', '中文好'], cons: ['高峰限速'],
  }),
  mk('chat-assistants', '豆包', 'https://www.doubao.com', {
    type: 'freemium', status: 'ok', official: true,
    summary: '豆包｜国产 AI 助手',
    description: '豆包是国产 AI 助手，提供对话、写作与图像等能力，网页与 App 均可用。适合日常创作，免费档可用。',
    tags: ['对话', '国产'], pros: ['免费额度大'], cons: ['高级能力需付'],
  }),
  mk('chat-assistants', '通义千问', 'https://chat.qwen.ai', {
    type: 'freemium', status: 'ok', official: true,
    summary: '通义千问｜国产对话大模型',
    description: '通义千问是阿里 AI 对话产品，网页端入口现为 chat.qwen.ai（原 tongyi.aliyun.com 已转为通义实验室模型/API 展示页）。国产对话大模型，覆盖对话、编码与文档场景。适合企业与开发者，免费档可用。',
    tags: ['对话', '国产'], pros: ['生态全', '有API'], cons: ['限额'],
  }),
  mk('chat-assistants', '文心助手（原文心一言）', 'https://wenxin.baidu.com', {
    type: 'freemium', status: 'dead', official: true,
    summary: '文心一言｜国产对话大模型',
    description: '文心助手（原文心一言）是百度 AI 对话产品，产品已更名，定位办公/学习/查资料。国产对话大模型，中文理解扎实，覆盖对话与创作。适合中文用户，当前服务不稳定、可能间歇不可用。',
    tips: '2026-08 巡检：wenxin.baidu.com 返回 404（产品更名迁移，旧链失效），新入口见 yiyan.baidu.com，恢复收录前暂标 dead',
    tags: ['对话', '国产'], pros: ['中文强'], cons: ['限额', '服务迁移中'],
  }),
  mk('chat-assistants', '智谱清言', 'https://chatglm.cn', {
    type: 'freemium', status: 'ok', official: true,
    summary: '智谱清言｜GLM 对话 AI 助手',
    description: '智谱清言是基于 GLM 的对话 AI 助手，支持联网搜索、绘画与代码生成。适合技术与学术场景，国产可用。',
    tags: ['对话', '国产'], models: ['GLM'], pros: ['学术强'],
  }),
  mk('chat-assistants', '讯飞星火', 'https://xinghuo.xfyun.cn', {
    type: 'freemium', status: 'ok', official: true,
    summary: '讯飞星火｜语音对话大模型',
    description: '讯飞星火是支持语音交互的对话大模型，语音识别与合成能力强。适合语音输入与播报场景，国产。',
    tags: ['对话', '国产', '语音'], pros: ['语音强'],
  }),
  mk('chat-assistants', '即梦 AI', 'https://jimeng.jianying.com', {
    type: 'freemium', status: 'ok', official: true,
    summary: '即梦 AI｜AI 绘画与视频工具',
    description: '即梦 AI 是 AI 绘画与视频工具，支持文生图、图生图与文生视频。适合创意素材制作，国产、中文提示友好。',
    tags: ['绘画', '视频', '国产'], pros: ['免费额度', '中文友好'],
  }),
  mk('chat-assistants', '可灵 AI', 'https://klingai.com', {
    type: 'freemium', status: 'ok', official: true,
    summary: '可灵 AI｜AI 视频生成工具',
    description: '可灵 AI 是 AI 视频生成工具，支持文生视频与图生视频。适合短视频创作，国产、专注视频生成。',
    tags: ['视频', '国产'], pros: ['视频质量高'], cons: ['免费有限额'],
  }),
  mk('chat-assistants', 'NotebookLM', 'https://notebooklm.google.com', {
    type: 'free', status: 'ok', official: true, featured: true,
    summary: 'NotebookLM｜资料研究助手',
    description: 'NotebookLM 是基于个人资料回答的研究助手，可生成摘要与音频概述。适合文献与报告整理，完全免费。',
    tags: ['研究', '海外', '文档'], pros: ['资料驱动', '播客生成'], cons: ['需登录'],
  }),
  mk('video-gen', 'Runway', 'https://runway.com', {
    type: 'freemium', status: 'ok',
    summary: 'Runway｜AI 视频生成与编辑',
    description: 'Runway 是 AI 视频生成与编辑工具，提供文生视频、剪辑与特效。适合影视级创作，免费档含额度。',
    tags: ['视频', '海外'], pros: ['专业级'], cons: ['免费有限额'],
  }),
  mk('chat-assistants', 'Leonardo.ai', 'https://leonardo.ai', {
    type: 'freemium', status: 'ok',
    summary: 'Leonardo.ai｜AI 图像生成工具',
    description: 'Leonardo.ai 是 AI 图像生成工具，支持多风格与社区模型。适合创意设计，免费版每日有积分。',
    tags: ['绘画', '海外'], pros: ['免费积分', '风格多'], cons: ['高级模型需付'],
  }),
  mk('chat-assistants', 'Genspark', 'https://genspark.com', {
    type: 'free', status: 'ok',
    summary: 'Genspark｜AI 一站式工作站',
    description: 'Genspark 是一站式 AI 工作空间：AI 搜索为基础，含 AI Employee/Email Agent/Phone Call 等 Agent 能力与 100+ 创作工具。 AI 一站式工作站，提供聊天、生图、PPT 与开发等多功能。适合多任务处理，完全免费。',
    tags: ['工作站', '海外', '免费'], pros: ['多模型', '全功能', '全年免费'], cons: ['新平台'],
  }),

  // ===== 实用工具 =====
  mk('model-managers', 'Ollama', 'https://ollama.com', {
    type: 'free', status: 'ok',
    summary: 'Ollama｜本地一行命令运行大模型',
    description: 'Ollama 是本地运行大模型的极简工具，一行命令拉起 Llama、Mistral、Qwen 等开源模型。适合注重隐私的开发者，支持多系统。',
    tags: ['本地推理', '开源'], pros: ['本地隐私', '易用'], cons: ['吃显存'],
    tips: '`ollama run qwen2.5` 即可体验。',
  }),
  mk('api-tools', 'LangChain', 'https://github.com/langchain-ai/langchain', {
    type: 'free', status: 'ok',
    summary: 'LangChain｜最流行的 LLM 应用开发框架',
    description: 'LangChain 是 LLM 应用开发框架，提供链式调用、工具调用与记忆等抽象。适合 Python/JS 开发者，生态最流行。',
    tags: ['框架', '开源'], pros: ['生态大'], cons: ['抽象偏重'],
  }),
  mk('api-tools', 'LlamaIndex', 'https://github.com/run-llama/llama_index', {
    type: 'free', status: 'ok',
    summary: 'LlamaIndex｜面向 RAG 的数据框架',
    description: 'LlamaIndex 是面向 RAG 的数据框架，专注数据接入与检索增强生成。适合构建知识库问答，开源易扩展。',
    tags: ['框架', 'RAG', '开源'], pros: ['检索强'], cons: ['偏专业'],
  }),
  mk('api-tools', 'Open WebUI', 'https://github.com/open-webui/open-webui', {
    type: 'free', status: 'ok',
    summary: 'Open WebUI｜自托管 ChatGPT 风格界面',
    description: 'Open WebUI 是自托管 ChatGPT 风格界面，对接 Ollama/API，提供多模型对话与 RAG。适合私有化部署，注重隐私。',
    tags: ['界面', '开源', '自托管'], pros: ['体验好', '可私有'], cons: ['需部署'],
  }),
  mk('api-tools', 'ComfyUI', 'https://github.com/Comfy-Org/ComfyUI', {
    type: 'free', status: 'ok',
    summary: 'ComfyUI｜节点式 Stable Diffusion 引擎',
    description: 'ComfyUI 是节点式生成工作流引擎（图像/视频/3D/音频多模态），支持可视化搭建与 API 调用。节点式 Stable Diffusion 工作流引擎，用可视化节点编排图像生成。适合进阶生图与视频，开源可控。',
    tags: ['绘画', '开源'], pros: ['流程可控'], cons: ['学习曲线陡'],
  }),
  mk('api-tools', 'Flowise', 'https://github.com/FlowiseAI/Flowise', {
    type: 'free', status: 'ok',
    summary: 'Flowise｜拖拽式 LLM 应用搭建平台',
    description: 'Flowise 是拖拽式 LLM 应用搭建平台，低代码构建 Agent 与 RAG 流程。适合快速验证想法，开源易上手。',
    tags: ['低代码', '开源'], pros: ['上手快'], cons: ['复杂场景受限'],
    tips: '项目已归档（Sunset notice），官方停止维护；替代品可看 Dify、LangFlow。',
  }),
  mk('api-tools', 'n8n', 'https://n8n.io', {
    type: 'freemium', status: 'ok',
    summary: 'n8n｜开源工作流自动化平台',
    description: 'n8n 是开源工作流自动化平台，可视化编排并内置 AI 节点。适合把 LLM 接入业务系统，开源可自托管。',
    tags: ['自动化', '开源'], pros: ['集成多'], cons: ['高级功能付费'],
  }),
  mk('api-tools', 'LiteLLM', 'https://github.com/BerriAI/litellm', {
    type: 'free', status: 'ok',
    summary: 'LiteLLM｜统一调用上百种 LLM 的网关',
    description: 'LiteLLM 是统一调用上百种 LLM 的代理网关，提供 OpenAI 兼容接口。适合统一鉴权与计费，便于切换模型。',
    tags: ['网关', '开源'], pros: ['统一接口'], cons: ['需自部署'],
  }),
  mk('node-clients', 'V2Ray 官网', 'https://www.v2ray.com', {
    type: 'free', status: 'ok',
    summary: 'V2Ray 官网｜核心文档与下载',
    description: 'V2Ray 是主流开源代理核心，官网提供项目文档与版本说明、核心下载。适合使用者与开发者，权威官方入口、完全免费。',
    tags: ['文档', '代理'], protocols: ['vmess', 'vless'], pros: ['权威'], cons: ['偏技术'],
  }),
  mk('api-tools', 'Google Antigravity', 'https://antigravity.google', {
    type: 'free', status: 'ok', official: true,
    summary: 'Google Antigravity｜Google 出品的 AI IDE',
    description: 'Google Antigravity 是 Google 以智能体为核心的 AI IDE，整合 Gemini 等模型与多 Agent 协作。适合开发者，个人版公测期免费。',
    tags: ['编程', '官方', '免费'], pros: ['公测免费', 'Agent 强'], cons: ['新平台', '需 Google 账号'],
  }),
  mk('api-tools', 'GitHub Copilot', 'https://github.com/features/copilot', {
    type: 'freemium', status: 'ok', official: true,
    summary: 'GitHub Copilot｜IDE 代码补全标杆',
    description: 'GitHub Copilot 是 IDE 代码补全工具，深度集成 VS Code 并提供补全、对话与 Agent 模式。适合开发者，学生/开源者免费。',
    tags: ['编程', '官方'], pros: ['生态好', '免费档'], cons: ['高级模型需订阅'],
  }),
  mk('api-tools', 'Codeium (已并入 Devin)', 'https://devin.ai', {
    type: 'freemium', status: 'unstable',
    summary: 'Codeium (已并入 Devin)｜已并入 Devin，稳定性差',
    description: 'Codeium (已并入 Devin) 是原免费代码补全工具，团队并入 Devin 后产品形态可能变化。稳定性差，域名已迁至 devin.ai。',
    tags: ['编程'], pros: ['曾是免费标杆'], cons: ['已合并', '服务变更中'],
  }),
  mk('api-tools', 'Devin Desktop（原 Windsurf）', 'https://devin.ai/desktop', {
    type: 'freemium', status: 'ok',
    summary: 'Devin Desktop｜AI 编程 IDE 与 Agent 指挥台（原 Windsurf）',
    description: 'Devin Desktop（原 Windsurf）是 Cognition 出品的 AI 编程 IDE，Windsurf 独立产品已并入 Devin 生态。 AI 原生编辑器（原 Codeium 出品），以 Cascade Agent 实现多文件编辑与命令执行。2026 年已并入 Devin 并整体更名 Devin Desktop（原价计划不变），官网现展示 Devin Desktop。',
    tags: ['编程', '海外'], pros: ['Agent 强', '含免费 IDE 档'], cons: ['高级档价格高'],
    pricing: 'Free $0 / Pro $20/月 / Max $200/月（2026-08 核对，以官网为准）',
    tips: '2026-08-23 实站核对：codeium.com/windsurf 已更名 Devin Desktop，FAQ 明确「仅改品牌名」，原计划与定价自动平移；Pro 为 $20/月（旧口径 $15 已停）。',
  }),
  mk('api-tools', 'Bolt.new', 'https://bolt.new', {
    type: 'freemium', status: 'ok',
    summary: 'Bolt.new｜浏览器内一句话生成全栈应用',
    description: 'Bolt.new 是浏览器内 AI 开发工具，从提示直接生成并运行 React/全栈项目。适合快速原型，免环境搭建。',
    tags: ['编程', '前端'], pros: ['出原型快'], cons: ['需登录'],
  }),
  mk('api-tools', 'Lovable', 'https://lovable.dev', {
    type: 'freemium', status: 'ok',
    summary: 'Lovable｜自然语言生成可部署 Web 应用',
    description: 'Lovable 是对话式 Web 应用生成工具，内置 Supabase 后端集成。适合非重度开发者，免费档有限额度。',
    tags: ['编程', '前端'], pros: ['全栈生成'], cons: ['免费有限额'],
  }),
  mk('api-tools', 'AnythingLLM', 'https://anythingllm.com', {
    type: 'free', status: 'ok',
    summary: 'AnythingLLM｜私有化知识库问答工具',
    description: 'AnythingLLM 是私有化知识库问答工具，支持文档入库、RAG 与多模型对话。适合注重隐私的用户，可本地或自托管。',
    tags: ['RAG', '自托管', '开源'], pros: ['可私有', '易用'], cons: ['需资源'],
  }),
  mk('api-tools', 'Continue', 'https://continue.dev', {
    type: 'free', status: 'unstable',
    summary: 'Continue｜开源 AI 编程插件（已被 Cursor 收购）',
    description: 'Continue 是开源 IDE AI 助手，可接任意模型，已被 Cursor 团队收购。稳定性待观察，后续走向不确定。',
    tags: ['编程', '开源'], pros: ['开源', '多模型'], cons: ['被收购', '未来不确定'],
  }),
  mk('api-tools', 'Replit', 'https://replit.com', {
    type: 'freemium', status: 'ok',
    summary: 'Replit｜云端 IDE，内置 AI Agent',
    description: 'Replit 是云端 IDE，提供浏览器内开发环境与 Agent，可直接运行部署应用。适合快速开发与分享，免费档可用。',
    tags: ['IDE', '云'], pros: ['免配置'], cons: ['性能受限'],
  }),
  mk('api-tools', 'Aider', 'https://aider.chat', {
    type: 'free', status: 'ok',
    summary: 'Aider｜终端 AI 编程 Pair',
    description: 'Aider 是终端 AI 编程助手，在命令行中与仓库协作，支持多文件编辑与 Git 集成。适合开发者本地使用。',
    tags: ['编程', '开源'], pros: ['轻量', '强控制'], cons: ['需命令行'],
  }),
  mk('code-agents', 'Roo Code (已迁至 roomote)', 'https://roomote.dev', {
    type: 'free', status: 'dead',
    summary: 'Roo Code (已迁至 roomote)｜已正式关停',
    description: 'Roo Code (已迁至 roomote) 是原 VS Code AI Agent 扩展，官方于 2026 年 5 月 15 日起停止服务。已关停，域名迁至 roomote.dev。',
    tags: ['编程', '开源', '已关停'], pros: [], cons: ['已关停'],
  }),
  mk('agent-frameworks', 'CrewAI', 'https://crewai.com', {
    type: 'free', status: 'ok',
    summary: 'CrewAI｜多智能体编排框架',
    description: 'CrewAI 是多智能体编排框架，用角色化 Agent 与任务流水线构建协作系统。适合自动化工作流，开源易用。',
    tags: ['框架', 'Agent', '开源'], pros: ['多Agent'], cons: ['偏专业'],
  }),
  mk('model-managers', 'LM Studio', 'https://lmstudio.ai', {
    type: 'free', status: 'ok',
    summary: 'LM Studio｜本地模型图形化运行工具',
    description: 'LM Studio 是本地模型 GUI，图形化加载 GGUF 等模型并聊天，提供 OpenAI 兼容本地服务。适合本地推理，开源。',
    tags: ['本地推理', '开源'], pros: ['易用', '隐私'], cons: ['吃显存'],
  }),

  // ===== 学习资源 =====
  mk('prompting', 'Learn Prompting', 'https://learnprompting.org', {
    type: 'free', status: 'ok',
    summary: 'Learn Prompting｜系统化提示词免费课程',
    description: 'Learn Prompting 是系统化的提示词工程免费课程，覆盖从入门到进阶的内容。适合新手到研究者，中英双语、完全免费。',
    tags: ['课程', '提示词', '海外'], pros: ['体系全', '免费'],
  }),
  mk('courses', 'FlowGPT', 'https://flowgpt.com', {
    type: 'free', status: 'ok',
    summary: 'FlowGPT｜海量提示词社区与模板库',
    description: 'FlowGPT 是汇集用户分享提示词的社区与模板库，覆盖写作、编程、角色扮演等场景。适合各类型使用者，免费、模板丰富。',
    tags: ['提示词', '社区', '海外'], pros: ['模板多'], cons: ['质量参差'],
  }),
  mk('courses', 'OpenAI Cookbook', 'https://github.com/openai/openai-cookbook', {
    type: 'free', status: 'ok',
    summary: 'OpenAI Cookbook｜官方 API 示例合集',
    description: 'OpenAI Cookbook 是官方示例合集，提供大量可运行的 API 调用代码。适合开发者，开源免费、手把手教接入。',
    tags: ['文档', '示例', '开源'], pros: ['权威', '实用'],
  }),
  mk('courses', 'LLM 入门 cookbook', 'https://github.com/datawhalechina/llm-cookbook', {
    type: 'free', status: 'ok',
    summary: 'LLM 入门 cookbook｜中文 LLM 实战教程',
    description: 'LLM 入门 cookbook 是 Datawhale 出品的中文 LLM 实战教程，基于吴恩达课程实践。适合国内开发者，开源免费、友好入门。',
    tags: ['课程', '开源', '中文'], pros: ['中文友好'],
  }),
  mk('courses', 'Hugging Face 课程', 'https://huggingface.co/learn', {
    type: 'free', status: 'ok',
    summary: 'Hugging Face 课程｜从 Transformer 到扩散模型',
    description: 'Hugging Face 课程提供从 Transformer 到扩散模型的免费课程，含 NLP、Diffusers 与 Web 推理。适合学习者，开源、体系完整。',
    tags: ['课程', '开源', '海外'], pros: ['体系全'],
  }),
  mk('api-tools', 'PromptPerfect', 'https://promptperfect.jina.ai', {
    type: 'freemium', status: 'unstable',
    summary: 'PromptPerfect｜提示词优化工具（将关停）',
    description: 'PromptPerfect 是一键优化提示词工具，自动改写并翻译以适配多模型。稳定性差，将于 2026 年 9 月 1 日关停。',
    tags: ['提示词', '工具'], pros: ['易用'], cons: ['免费有限', '即将关停'],
  }),
  mk('courses', 'DeepLearning.AI', 'https://www.deeplearning.ai', {
    type: 'free', status: 'ok', official: true,
    summary: 'DeepLearning.AI｜吴恩达团队免费短课',
    description: 'DeepLearning.AI 是吴恩达团队出品的 AI 学习平台，提供与 OpenAI/Anthropic 合作的免费短课。适合各阶段，官方、免费。',
    tags: ['课程', '官方', '海外'], pros: ['权威', '免费'],
  }),
  mk('courses', 'Google Cloud 生成式 AI', 'https://www.cloud.google.com/training', {
    type: 'free', status: 'ok', official: true,
    summary: 'Google Cloud 生成式 AI｜Google 官方学习路径',
    description: 'Google Cloud 生成式 AI 培训（原 cloud.google.com/learn/generative-ai 已 404）：涵盖生成式 AI 课程、文档与 Cloud Skills Boost 免费实验室。 是 Google 官方的免费学习路径，含 Gemini 提示设计与实验。适合学习者，官方权威、免费。',
    tags: ['课程', '官方', '海外'], pros: ['权威'],
  }),
  mk('courses', 'Microsoft 生成式 AI 入门', 'https://github.com/microsoft/generative-ai-for-beginners', {
    type: 'free', status: 'ok', official: true,
    summary: 'Microsoft 生成式 AI 入门｜微软开源 21 课',
    description: 'Microsoft 生成式 AI 入门是微软开源的 21 课仓库，从零讲生成式 AI 并含中文内容。适合系统学习，开源免费、友好。',
    tags: ['课程', '开源', '中文'], pros: ['体系全', '免费'],
  }),
  mk('courses', 'OpenAI Academy', 'https://openai.com/academy', {
    type: 'free', status: 'ok', official: true,
    summary: 'OpenAI Academy｜OpenAI 官方免费课程',
    description: 'OpenAI Academy 是 OpenAI 官方的免费课程与直播平台，覆盖 AI 基础到进阶。适合各阶段学习者，官方、免费。',
    tags: ['课程', '官方', '海外'], pros: ['权威', '免费'],
  }),
  mk('courses', 'Coddy 提示工程', 'https://coddy.tech', {
    type: 'free', status: 'ok',
    summary: 'Coddy 提示工程｜带证书的交互课',
    description: 'Coddy 提示工程是边写边学的交互式课程，含测验与完成证书。适合自学者，免费、可拿证书。',
    tags: ['课程', '海外'], pros: ['交互', '证书'],
  }),
  mk('courses', 'FreeAcademy 提示课', 'https://freeacademy.ai', {
    type: 'free', status: 'ok',
    summary: 'FreeAcademy 提示课｜多门免费提示短课',
    description: 'FreeAcademy 提示课提供提示工程入门与实战的免费短课，模板驱动、即学即用。适合自学者，免费、上手快。',
    tags: ['课程', '海外'], pros: ['实用'],
  }),
  mk('courses', 'Coursera 提示工程 (Vanderbilt)', 'https://www.coursera.org/learn/prompt-engineering', {
    type: 'free', status: 'ok', official: true,
    summary: 'Coursera 提示工程 (Vanderbilt)｜范德堡大学课',
    description: 'Coursera 提示工程（Vanderbilt）是范德堡大学的提示工程课程，模式化教学、可免费旁听。适合系统学习，官方、证书另付费。',
    tags: ['课程', '官方', '海外'], pros: ['体系深'],
  }),
  mk('courses', 'Scrimba 提示工程', 'https://scrimba.com', {
    type: 'freemium', status: 'ok',
    summary: 'Scrimba 提示工程｜开发者交互式课程',
    description: 'Scrimba 提示工程是面向开发者的交互式课程，可暂停改写、落在日常工作里。适合开发者，部分免费、实战导向。',
    tags: ['课程', '海外'], pros: ['实践性强'],
  }),
  mk('courses', 'Simplilearn SkillUp', 'https://www.simplilearn.com/skillup-free-online-courses/prompt-engineering', {
    type: 'free', status: 'ok',
    summary: 'Simplilearn SkillUp｜多门免费提示课',
    description: 'Simplilearn SkillUp 提供提示工程入门到进阶的免费自定进度课程与证书。适合自学者，免费、灵活。',
    tags: ['课程', '海外'], pros: ['免费证书'],
  }),
  mk('api-tools', '2026 AI 免费资源地图', 'https://yangmao.ai/en/free-map', {
    type: 'free', status: 'ok',
    summary: '2026 AI 免费资源地图｜免费算力/API/工具汇总',
    description: '2026 AI 免费资源地图 是汇总免费 GPU/API/工具/课程的资源地图，持续追踪整理。适合按图索骥找免费资源。',
    tags: ['资源地图', '汇总'], pros: ['持续更新'],
  }),
  mk('api-tools', 'aifreeplan', 'https://aifreeplan.com', {
    type: 'free', status: 'ok',
    summary: 'aifreeplan｜AI 工具免费额度对比站',
    description: 'aifreeplan 是对比 91+ AI 工具免费额度与限制的资源站，整理各产品免费档与试用细节。适合选型比价。',
    tags: ['资源地图', '汇总'], pros: ['对比清晰'],
  }),
];

// 编辑人气分（静态、全局、可解释）：用于「热门榜」排序的默认信号。
// 后续接入后端（Supabase）时，可替换为收藏数/点击量等真实信号，组件无需改动。
// 导出供 data-integrity 测试断言「每个键必须命中一条真实资源名」，
// 防止改名后键静默失配（DeepSeek API/Dify/Kimi 曾失配，人气分静默归 0）。
export const POPULARITY_BY_NAME: Record<string, number> = {
  'Google AI Studio (Gemini)': 95,
  OpenRouter: 92,
  Groq: 85,
  Cerebras: 82,
  'Hugging Face Inference': 80,
  ChatGPT: 94,
  Claude: 92,
  Gemini: 88,
  'Kimi 开放平台': 80,
  '豆包': 82,
  Ollama: 88,
  LangChain: 84,
  NotebookLM: 84,
  'GitHub Copilot': 83,
  Cursor: 85,
  Midjourney: 82,
  Suno: 80,
  ComfyUI: 80,
  n8n: 78,
  AnythingLLM: 78,
  'Learn Prompting': 80,
  'DeepLearning.AI': 82,
  'Microsoft 生成式 AI 入门': 80,
};

const curatedRanked: Resource[] = curated.map((r) => ({
  ...r,
  popularity: POPULARITY_BY_NAME[r.name] ?? 0,
}));

/** 全站种子资源（旧数据映射 + 社区精选 + 人气分；黑名单死链一律过滤，防止回流） */
export const seedResources: Resource[] = (() => {
  // 统一保证 id 唯一：curated.ts 为手工维护，个别条目 id 曾重复（如两条 "ob-api-"），
  // 重复会导致详情页/收藏/验证/评论按 id 关联时串数据。这里对重复项追加序号后缀，
  // 使每个资源都有稳定唯一的 id（首个出现者保持原 id，不影响既有收藏）。
  const seen = new Set<string>();
  const dedupe = (r: Resource): Resource => {
    let id = r.id;
    if (seen.has(id)) {
      let n = 2;
      while (seen.has(`${id}-${n}`)) n++;
      id = `${id}-${n}`;
    }
    seen.add(id);
    return id === r.id ? r : { ...r, id };
  };
  // 去重：curated.ts（社区精选）与 legacy（旧 sites）中存在与手工 curated 同名的资源
  // （如 ChatGPT / Claude / Cursor / Ollama / SiliconFlow / Together AI 各出现两次），
  // 按 name 去重，保留手工 curated（描述更完整、来源更稳）那份，消除首页/详情页重复展示与分类错乱。
  const curatedSeedNames = new Set(curatedRanked.map((r) => r.name.toLowerCase()));
  const merged = [
    ...legacyResources.filter((r) => !curatedSeedNames.has(r.name.toLowerCase())),
    ...curatedRanked,
    ...curatedResources.filter((r) => !curatedSeedNames.has(r.name.toLowerCase())),
  ];
  // 跨源 URL 去重：同一服务（归一化 URL 相同）被错误归类到多个 subType 时，仅保留首次出现者。
  // 合并顺序 legacy → curatedRanked → curatedResources 已保证「更权威版本优先」：
  // legacy 实测白名单 > 手工精选 > 社区投稿。name 去重作为二级防护，覆盖大小写不一致的同名双份。
  const seenUrl = new Set<string>();
  const seenName = new Set<string>();
  const deduped = merged.filter((r) => {
    // 归一化同站判定（协议/www/端口/尾斜杠差异不再产生双份条目）
    const u = normalizeUrlKey(r.url || '');
    const n = (r.name || '').toLowerCase().trim();
    if (!u || seenUrl.has(u) || seenName.has(n)) return false;
    seenUrl.add(u);
    seenName.add(n);
    return true;
  });
  return deduped
    .filter((r) => !isBlacklisted(r.url))
    .filter((r) => isSlugVisible(r.subType))
    .map(dedupe);
})();

/** 统计各子类型资源数（用于首页卡片角标） */
export function countBySubType(): Record<string, number> {
  const acc: Record<string, number> = {};
  for (const r of seedResources) acc[r.subType] = (acc[r.subType] ?? 0) + 1;
  return acc;
}
