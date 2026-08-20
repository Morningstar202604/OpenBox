# Changelog

本项目所有重要变更均记录于此文件�?

格式参�? [Keep a Changelog](https://keepachangelog.com/)，版本号遵循 [语义化版本](https://semver.org/lang/zh-CN/)�?

> **版本约定**：项目从 `0.0.1` 起算，每次更新为一个「小版本」（修订�? +1，如 `0.0.1 �? 0.0.2 �? 0.0.3`），
> 并在 GitHub / GitCode / Gitee 三端同步�? `vX.Y.Z` 轻量标签。大版本（主/次号）仅在架构级变更时前进�?

## [0.0.1] - 2026-08-21

### 协议
- **许可证由 CC BY-NC-SA 4.0 变更�? Apache License 2.0**�?
  - 允许商业使用，消�?"非商业协�?"与站内邀请码/返利变现模式之间的冲突�?
  - 同步更新 `LICENSE` 全文、`package.json` / `package-lock.json` �? `license` 字段、README 许可徽章与段落、i18n（中/�?/日）许可文案�?

### 修复
- **修复 `freechat` 孤儿数据�?83 条）**
  - 根因：`src/data/sites.ts` 中有 83 �? `category: 'freechat'`（免费聊天镜像站），�? `seed.ts` �? `LEGACY_MAP` 未映射该分类，且 `taxonomy.ts` 无此子类型，导致�? 83 条在 seed 构建阶段被整批丢弃（占当�? 278 条的 30%）�?
  - 修复：在 `taxonomy.ts` 新增 `freechat` 子类型（图标 `MessageSquare`，已确认存在于图标组�? MAP），并在 `seed.ts` �? `LEGACY_MAP` �? `freechat: 'freechat'`�?
  - 结果�?83 条数据恢复为可见分类，`HomePage.tsx` 中原本悬空的 `FEATURED_SUBTYPES` 引用 `'freechat'` 现已生效�?
- **分类计数口径统一�? 14 大分�?**
  - 修复 README / `index.html` / `package.json` 残留�?"13 大分�? / 135+"，与 i18n 已有�?"14 大分�?"对齐；README 分类枚举补充"免费聊天镜像"�?
- **移除 `package.json` 遗留�? `pnpm` 字段**（实际使�? npm 构建）�?

### 黑名单复核（blacklist�?
- �? 14 �? `blacklist`（状�? `dead`）资源做最新存活状态复筛：
  - **10 条本机复核确认依旧失�?**：`icoding`(502)、`academic-aiearth`(530)、`c1ns`(404)、`newstop-c1ns`(404)、`tokenlab`(域名出售�?)、`tokenriver`(403→atom.com 域名市场)、`zhiyunapi`(连接不可�?/已停�?)、`gscc-relay`(现直接托�?"极省�?"营销博客，非中继服务)、`zmzai`(200 但首页空�?/停放)�?
  - **5 �? GitHub 仓库因运行环境屏�? github.com 无法复核**（原因为"仓库已删 404"）：`anyrouter-os`、`tokamak`、`veridrop`、`codernav`、`awesome-claude-api`�?
  - **结论�?14 条全部仍应保留在黑名单，无一条真正复活�?**
  - 微调 `gscc-relay` �? `blacklistReason` 文案，由"跳转�?"更正�?"现直接托�?"�?

### 发布
- 新增 **WB 国内访问通道**：`https://a50a62f0345c835a5.app.workbuddy.link`（已写入 README 访问入口，作为国内访问通道，暂代尚未更新的协作者镜像）�?

[0.0.1]: https://github.com/weed33834/OpenBox/releases/tag/v0.0.1
