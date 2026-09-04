# OpenBox × Cloudflare Pages 部署手册

> **2026-08 现状提示**：`pages.dev` 域名在大陆长期不可达，且 deploy.yml 自动触发已暂禁用（commit `25c40b7`）。
> 本方案现定位为**海外镜像/备份**，不再新增投入。主力与推荐部署请改用：
> 校内网部署 [`DEPLOY-SCHOOL.md`](./DEPLOY-SCHOOL.md)（校园场景首选）·
> 腾讯 EdgeOne Pages [`EDGEONE_DEPLOY.md`](./EDGEONE_DEPLOY.md)（公网门面，大陆可达）。

> 目标：用网站「免费服务器」分类里收录的 **Cloudflare Pages**（免绑卡、全球 CDN）托管 OpenBox，
> 再用「免费域名」分类里的 **eu.org / us.kg / is-a.dev** 等二级域名挂上自定义根域名。
> 全程免费。当前以 **Cloudflare Pages 为唯一生产部署**：push `main` 触发 `.github/workflows/deploy.yml`
> 自动构建并直传根域 `openbox-nav-5ke.pages.dev`；旧的 GitHub Pages `/OpenBox/` 子路径方案已弃用。

---

## 0. 前置条件

- 一个 Git 仓库（OpenBox 主仓库：`github.com/Morningstar202604/OpenBox`；镜像 `gitee.com/badhope/OpenBox` 与 `github.com/Morningstar202604/OpenBox`）
- 一个 Cloudflare 账号（免费版即可，注册免绑卡）
- 一个能收验证邮件的邮箱
- Node.js 20（本地预览用，非必须——也可纯控制台部署）
- Wrangler（可选，本地命令行部署用）：`npm i -g wrangler`

---

## 1. 给项目加上部署配置（已帮你写好）

仓库里已新增 3 个文件，提交即可：

| 文件 | 作用 |
|------|------|
| `wrangler.toml` | 本地命令行部署用（Pages 项目名 + 输出目录 `docs/`）；**生产部署走 CI，不依赖它** |
| `public/_headers` | 静态资源长缓存、安全响应头 |
| `.github/workflows/deploy.yml` | 推送 `main` 自动 `npm ci` → `VITE_BASE_URL=/ VITE_BUILD_DIR=dist npm run build` → 直传 Cloudflare Pages 根域 |

> `vite.config.ts` 的 `base` = `process.env.VITE_BASE_URL ?? '/OpenBox/'`：
> 本地 `npm run build` 默认 `/OpenBox/` 产 `docs/`（GitHub Pages 预览用）；
> CI 显式设 `VITE_BASE_URL=/`、`VITE_BUILD_DIR=dist`，构建到 `dist/` 并直传根域，路由为真实路径（如 `/resource/xxx`）。

### 1.1 提交配置

```bash
git add wrangler.toml public/_headers .github/workflows/deploy.yml vite.config.ts
git commit -m "ci: 新增 Cloudflare Pages 部署配置"
git push origin main
```

---

## 2. 在 Cloudflare 创建 Pages 项目

两种方式任选其一：

### 方式 A：控制台连 Git（推荐，零命令行）

1. 登录 [dash.cloudflare.com](https://dash.cloudflare.com) → **Workers & Pages** → **Create** → **Pages** → **Connect to Git**
2. 授权 GitHub，选中 `OpenBox` 仓库
3. 构建配置：
   - **Project name**：`openbox`
   - **Production branch**：`main`
   - **Build command**：`VITE_BASE_URL=/ VITE_BUILD_DIR=dist npm run build`
   - **Build output directory**：`dist`
   - **Node.js version**：20（Settings → Environment variables 里设 `NODE_VERSION=20`）
4. 点 **Save and Deploy** → 等约 1 分钟，拿到 `openbox-nav-5ke.pages.dev` 预览域名

> 注意：控制台连 Git 时，Cloudflare 自己跑构建；仓库里的 `deploy.yml`（GitHub Actions）是另一条
> 自动部署线路。二者都会部署到同一 `openbox-nav` 项目，**不要同时触发以免重复构建**。

### 方式 B：API Token + Wrangler（仓库 CI 自动部署）

适合想让 `git push` 自动上线的场景：

1. Cloudflare → **My Profile → API Tokens → Create Token**
   - 模板选 **Edit Cloudflare Workers**，再加 **Account → Cloudflare Pages → Edit** 权限
   - 复制生成的 Token
2. 取 **Account ID**：右下角「坊间」或 `wrangler whoami`
3. 在 GitHub 仓库 **Settings → Secrets → Actions** 新增：
   - `CLOUDFLARE_API_TOKEN` = 上面的 Token
   - `CLOUDFLARE_ACCOUNT_ID` = Account ID
4. 之后每次 `git push origin main`，`deploy.yml` 会自动部署

---

## 3. 申请免费自定义域名

从网站「免费域名」分类里挑一个（都收录在 `src/data/curated.ts` 的 `free-domain` 子类）：

| 域名服务 | 特点 | 申请方式 | 适合 |
|----------|------|----------|------|
| **eu.org** | 1996 年起的老牌免费二级域，`your.eu.org`，可自托管 NS 到 Cloudflare | [nic.eu.org](https://nic.eu.org/) 填表，人工审核 几天~几周 | 长期项目、不在乎短 |
| **us.kg** (digitalplat) | 真顶级域、GitHub 登录基本秒批 | [domain.digitalplat.org](https://domain.digitalplat.org/) | 想要短域名、等不及审核 |
| **is-a.dev** | 开发者气质 `.dev` 后缀，提 GitHub PR 加 JSON | [is-a.dev](https://is-a.dev) | 作品集/项目页 |

> 推荐 **us.kg**：GitHub 登录、秒批、能托管到 Cloudflare 管解析，
> 是 eu.org 之外最省心的选择。

### 3.1 以 us.kg 为例

1. 打开 [domain.digitalplat.org](https://domain.digitalplat.org/)，GitHub 登录
2. 申请一个前缀，如 `openbox`，得到 `openbox.us.kg`
3. 在 Digitalplat 后台把 NS 改为 Cloudflare 的：`drake.ns.cloudflare.com` / `rita.ns.cloudflare.com`
   （或按其文档用 CNAME 接入）

---

## 4. 在 Cloudflare 绑定自定义域名

1. 回到 Pages 项目 `openbox` → **Settings → Custom domains → Set up a domain**
2. 填入你申请的免费域名（如 `openbox.us.kg`）
3. Cloudflare 会自动：
   - 给该域名加 **CNAME** 指向 `openbox-nav-5ke.pages.dev`
   - 签发 **免费 SSL 证书**（Universal SSL，自动续期）
4. 等 DNS 生效（通常几分钟~几小时），访问 `https://openbox.us.kg` 即可看到站点

> 若域名 NS 不在 Cloudflare，需去域名提供商后台手动加 CNAME：
> `openbox.us.kg` → `openbox-nav-5ke.pages.dev`，并开启代理（橙色云）。

---

## 5. 验证

- [ ] `https://openbox-nav-5ke.pages.dev` 能打开
- [ ] `https://openbox.us.kg`（你的免费域名）能打开且带小绿锁
- [ ] 三语切换、分类浏览、投稿页正常
- [ ] 控制台 → Analytics 能看到访问数据

---

## 6. 故障排查

| 现象 | 原因 | 解决 |
|------|------|------|
| 页面空白 / 资源 404 | `base` 路径不对 | CI 已设 `VITE_BASE_URL=/`；本地预览用 `npm run build`（默认 `/OpenBox/`）需在 `/OpenBox/` 路径访问 |
| 构建失败 `tsc` 报错 | Node 版本低 | 设 `NODE_VERSION=20` |
| 自定义域名一直待验证 | DNS 未生效 / NS 没改 | 用 `dig openbox.us.kg` 看是否指向 pages.dev |
| SSL 红锁 | 证书未签发 | 等几分钟，或手动点「Retry Certificate」 |

---

## 7. 成本

- Cloudflare Pages：免费（静态站流量不限、请求 10 万/天）
- us.kg / eu.org / is-a.dev：免费
- 合计：**$0 / 月**
