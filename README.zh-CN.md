# OpenBox · 开源 AI 资源导航

[English](./README.md) | [简体中文](./README.zh-CN.md) | [日本語](./README.ja.md)

**免费 AI 资源，每日巡检，一处直达。**

280+ 条人工精选资源，覆盖 11 个分类：免费模型 API、中转站、聊天镜像、免费服务器与域名、AI 应用、开发工具、学习资料。每条资源由自动巡检加社区投票共同把关——免费额度挂了，卡片上直接看得见，不用等注册踩坑。

在线访问：[openbox-nav-5ke.pages.dev](https://openbox-nav-5ke.pages.dev)

## 为什么做这个

网上的免费 AI 资源清单烂得很快：链接失效、悄悄要绑卡、门槛不写清。OpenBox 用三件事解决：

1. **自动巡检**——定时任务每天探测全部链接（HTTP 探测 + DNS 兜底 + 连续两次失败才判死），结果直接回填站点。
2. **社区验证**——每张卡片有「还能用 / 已失效」投票，按设备去重，访客在两次巡检之间维持列表新鲜。
3. **门槛明说**——要不要邀请码、是否锁区、后期收不收费，卡片上写明白。

## 收录内容

- **分类**：免费 API、聊天镜像、中转站、代理节点、免费服务器/VPS、免费域名、AI 应用、智能体、开源模型、实用工具、学习资源、公益站、邀请码/激活码
- **场景筛选**：小白白嫖、开发者、研究者、创作者、新生工具包
- 名称/简介/标签/模型的跨语言搜索
- 网格/列表双视图、深夜模式、移动端底部 Tab
- 可选 Supabase 后端：投稿审核、评论、评分、收藏云同步；完全不配置也能用
- PWA：可安装，首次访问后离线可用

## 快速开始

```bash
git clone https://github.com/Morningstar202604/OpenBox.git
cd OpenBox
npm install --legacy-peer-deps
npm run dev        # http://localhost:5173/OpenBox/
npm run build      # tsc + vite 构建 + SPA 路径生成
```

## 部署方案（全部零成本）

| 目标 | 指南 |
|---|---|
| 学校/校园内网（推荐） | [DEPLOY-SCHOOL.md](./DEPLOY-SCHOOL.md) |
| 大陆可直连的公网站点 | [EDGEONE_DEPLOY.md](./EDGEONE_DEPLOY.md)（腾讯 EdgeOne Pages 免费版） |
| 海外镜像 | [CLOUDFLARE_DEPLOY.md](./CLOUDFLARE_DEPLOY.md) |

推送 `main` 分支即触发 GitHub Actions 自动构建；未配置 Cloudflare 密钥时部署步骤自动跳过，不会报错。

## 数据质量

- `npm run audit:data`——七项自动化内容体检（自相矛盾、无时点价格承诺、伪标签、过期数字）
- `npm run monitor`——带状态的每日巡检引擎，产出 `resource-status.json`
- `supabase/migrations/0001`–`0008` 内置行级安全与匿名写频控

## 参与贡献

不需要会写代码：投稿资源、投验证票、评论区写避坑经验、报告失效链接、补翻译都可以，见 [CONTRIBUTING.md](./CONTRIBUTING.md)。代码贡献走标准的 fork → 分支 → PR 流程。

如果 OpenBox 帮你省下了找免费资源的功夫，点个 Star 让更多人看到它，就是最好的支持。

## 许可

[Apache-2.0](./LICENSE) © Morningstar202604
