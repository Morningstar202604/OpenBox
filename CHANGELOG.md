# Changelog

本项目所有重要变更均记录于此文件。

格式参考 [Keep a Changelog](https://keepachangelog.com/)，版本号遵循 [语义化版本](https://semver.org/lang/zh-CN/)。

> **版本约定**：项目从 `0.0.1` 起算，每次更新为一个「小版本」（修订号 +1，如 `0.0.1 → 0.0.2 → 0.0.3`），
> 并在 GitHub / GitCode / Gitee 三端同步打 `vX.Y.Z` 轻量标签。大版本（主/次号）仅在架构级变更时前进。

## [0.0.2] - 2026-08-21

### 修复：资源分类全面核查（逐条实开链接验证）
对全站 247 条资源逐个真实打开链接、对照落地页判断实际性质后修正以下分类错误：

- **10 条非 AI 软件移出「实用工具」**（原误入 tools，实为通用软件；按其 id 语义归入对应邀请码/激活码分类）：
  - → `invite-system`：VS Code、Bitwarden、LibreOffice
  - → `invite-professional`：GIMP、DaVinci Resolve、Figma、Notion、Obsidian、Postman
  - → `invite-mobile`：F-Droid
- **5 条商业聚合网关从「免费 API」移至「中转站」**（实开验证均为按量计费/模型广场+控制台的中转架构）：
  XKiro、LLM7.io、AnyAPI、幻城 API（Liminality）、织云 API（Ziyun Tech）
- **7倍算力从「中转站」移至「公益站」**（实开页面标题为「七倍算力公益站」）
- **EvoMap 从「AI Agent」移至「实用工具」**（实为 AI 自进化基础设施，非 Agent 搭建平台）
- **Stable Diffusion 从「AI 应用」移至「实用工具」**（链接为 stability.ai 官方 API/企业平台，非消费级画图 App）
- **CrewAI 从「实用工具」移至「AI Agent」**（seed 同名去重曾将其归入 tools，实为多智能体编排框架）
- **删除「可灵AI 会员邀请码」冗余条目**（klingai.com 实为产品官网、无邀请码机制，且与 AI 应用分类下的「可灵 AI」URL 重复）

## [0.0.1] - 2026-08-21

### 协议
- **许可证由 CC BY-NC-SA 4.0 变更为 Apache License 2.0**。
  - 允许商业使用，消除"非商业协议"与站内邀请码/返利变现模式之间的冲突。
  - 同步更新 `LICENSE` 全文、`package.json` / `package-lock.json` 的 `license` 字段、README 许可徽章与段落、i18n（中/英/日）许可文案。

### 修复
- **修复 `freechat` 孤儿数据（83 条）**
  - 根因：`src/data/sites.ts` 中有 83 条 `category: 'freechat'`（免费聊天镜像站），但 `seed.ts` 的 `LEGACY_MAP` 未映射该分类，且 `taxonomy.ts` 无此子类型，导致这 83 条在 seed 构建阶段被整批丢弃（占当时 278 条的 30%）。
  - 修复：在 `taxonomy.ts` 新增 `freechat` 子类型（图标 `MessageSquare`，已确认存在于图标组件 MAP），并在 `seed.ts` 的 `LEGACY_MAP` 增加 `freechat: 'freechat'`。
  - 结果：83 条数据恢复为可见分类，`HomePage.tsx` 中原先悬空的 `FEATURED_SUBTYPES` 引用 `'freechat'` 现已生效。
- **分类计数口径统一为「14 大分类」**
  - 修复 README / `index.html` / `package.json` 残留的"13 大分类 / 135+"，与 i18n 已有的"14 大分类"对齐；README 分类枚举补充"免费聊天镜像"。
- **移除 `package.json` 遗留的 `pnpm` 字段**（实际使用 npm 构建）。

### 黑名单复筛（blacklist）
- 对 14 条 `blacklist`（状态 `dead`）资源做最新存活状态复筛：
  - **10 条本机复核确认依旧失效**：`cicoding`(502)、`academic-aiearth`(530)、`c1ns`(404)、`newstop-c1ns`(404)、`tokenlab`(域名出售页)、`tokenriver`(403→atom.com 域名市场)、`zhiyunapi`(连接不可达/已停运)、`gscc-relay`(现直接托管"极省创"营销博客，非中转服务)、`zmzai`(200 但首页空壳/停摆)。
  - **5 条 GitHub 仓库因运行环境屏蔽 github.com 无法复核**（原因为"仓库已删 404"）：`anyrouter-os`、`tokamak`、`veridrop`、`codernav`、`awesome-claude-api`。
  - **结论：14 条全部仍应保留在黑名单，无一条真正复活。**
  - 微调 `gscc-relay` 的 `blacklistReason` 文案，由"跳转至"更正为"现直接托管"。

### 发布
- 新增 **WB 国内访问通道**：`https://a50a62f0345c835a5.app.workbuddy.link`（已写入 README 访问入口，作为国内访问通道，暂代尚未更新的协作者镜像）。

[0.0.2]: https://github.com/weed33834/OpenBox/releases/tag/v0.0.2
[0.0.1]: https://github.com/weed33834/OpenBox/releases/tag/v0.0.1
