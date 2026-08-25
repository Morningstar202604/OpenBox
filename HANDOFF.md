# OpenBox 运维交接（2026-08-22 会话总结，新会话先读本文件）

## 项目状态
- 仓库：origin=`gitcode.com/badhope/OpenBox`（主）；镜像 `gitee.com/badhope/OpenBox` + `github.com/Morningstar202604/OpenBox`；**线上：https://openbox-nav.pages.dev**（自建 CF 账号）
- ⚠️ 远程账号：早期记载 `github.com/weed33834`，当前 `.git/config` 实际 github 远程为 `Morningstar202604/OpenBox`（三远程均带推送 token）。推送以 `.git/config` 为准。
- 部署：GitHub Actions（deploy.yml）push main 自动构建直传，凭据在仓库 Secrets（CLOUDFLARE_API_TOKEN/ACCOUNT_ID）
- 云端功能已激活：Supabase 凭据走 Actions Secrets 构建注入；**数据库迁移 0001–0008 已就绪**（0001–0007 此前已应用；0008 = 契约收编与 RLS 收口，幂等可重跑），
  九表全健康（resources/submissions/verifications/comments/reports/favorites/profiles/ratings/admin_emails）
- 分支保护：必需检查名已对齐「Quality Gate (tsc + lint + build)」、评审要求归零，PR 可直接合并
- GitHub 通知：本仓库已设 ignored（站长要求静音），恢复方法：仓库页 Watch 图标改回 All Activity

## 本会话合并的 PR（#21–#32）
- #21 链接巡检二轮（零降级）｜#22 history 路由迁移(#15)｜#23 i18n 按语言分包｜#24 GH Pages 深链兜底
- #25 自建 CF Pages + Actions 自动部署｜#26 注入 Supabase 凭据｜#27 热修 0005 URL 正则超限（{1,500}>255 致投稿全挂）
- #28 分类审计（6 条跨类目错位 + ggboom 双份冲突）｜#29 标签治理（19 条数值伪 tag 转监测快照 + audit:data 工具）
- #30 语义标签对齐（15 条补「大模型」、free-api 免费信号全覆盖、OpenAI兼容补齐）
- #31 补建 ratings 表（评分功能自上线起即 404 的根因修复）｜#32 移动端徽章修正（官方重复渲染/freemium 误标非免费）

## 数据质量工具与经验
- `npm run audit:data`：七项体检（type/status 分布、自夸矛盾、类目-tag 错位、数值伪 tag、
  **时效性数值承诺（2026-08-23 新增）**、**价格最高级话术（同日新增）**、空字段），已入 CI 门禁
- **描述文本质量纪律（2026-08-23 起）**：summary/description/pricing/pros 中禁止无时点限定的
  具体倍率/价格/额度数字——要么加「约/以官网为准」，要么移入带日期戳的 tips；引号内引用官方
  自述不算承诺；品牌名自带数字（如「7倍算力」）、显式日期戳（「2026-07 起」）自动豁免。
  首轮清理 10 条（closeai/api2d/siliconflow/4router/hlool/windsurf/vercel/railway/xkiro/evomap）
- 移动端验证方法论：playwright-core + iPhone 视口(390x844)实拍截图逐页看 + scrollWidth 溢出检测 + 监听 404 响应
- **seed 合并顺序陷阱**：legacy 白名单 > curatedRanked > curatedResources，URL/name 去重保首次出现者——
  改 curated 定性结论时必须同步清理 legacy 白名单（sites.ts ALIVE_LEGACY_URLS），否则旧数据遮蔽新审计
- Postgres 正则 {m,n} 上限 255；CHECK 内正则惰性编译（DDL 能成功、写入才炸）
- **内容真实性核验四层流水线**（2026-08-22 打通）：
  ① HTTP 巡检(check-links) ② 首页标题-品牌关联度比对(本地并发爬虫)
  ③ /api/status 网关探针(one-api 族确证) ④ Playwright 渲染级承诺比对
- **深度核验扩展**（同日第二轮）：⑤ /v1/models 无鉴权探测(54 条确证兼容端点) ⑥ DNS 解析检查
  ⑦ TLS 证书体检 ⑧ WAF 拦截识别 ⑨ RDAP 直连注册局到期扫描(IANA 引导分发，rdap.org 会限流)
- **外部情报交叉比对**（方法⑩）：第三方公益站目录(baipiao.org 等)+社区帖用于发现域名迁移/新入口——
  但目录自身有时效性（仍列猫羽雫运营中），存活判定以实站抓取为准
- 实战战果：ClawApi 域名易主、爱云网/wendabao/bixin 停摆、千帧AI 转型、moyuu 公益定性错误+主站误指 docs、
  ai小白 DNS 失效、AIZZZ WAF 拦截、0dai/初叶 域名迁移后源站 522——均已修正
- **RDAP 临期预警已落 tips**：agentrouter.org(12d)/free2gpt.com(28d)/helpcoder.cc(29d)，到期未续会自然暴露为死链
- **渲染级核验的边界**：登录墙内功能（签到按钮等）未登录不可见，机器无法定罪；
  可持续的真相源=社区验证投票（详情页还能用/已失效），运营上应引导用户投票

## 站长手动项（仅剩）
1. Search Console 提交 https://openbox-nav.pages.dev/sitemap.xml（旧 hash 收录会由客户端重写引导过渡）
2. Turnstile 注册拿 site key/secret（issue #11，拿到后我接入）
3. 旧站 openbox-13o.pages.dev 在对方 CF 账号侧，处置随意
4. /admin 审核：用 33383432254@qq.com 登录后访问 /admin（admin_emails 已登记）

## 待执行任务（新会话按序）
1. Turnstile 接入（等 key）：VerifyWidget 已演化为社区验证投票组件，拿到 key 后在投票/评论/投稿表单接入
2. ~~可选深化：描述文本质量审计、audit:data 纳入 CI 门禁~~ ✅ 均已完成（审计 2026-08-23 上线，门禁此前已入 CI）
