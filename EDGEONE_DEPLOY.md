# OpenBox × 腾讯 EdgeOne Pages 部署手册（¥0 · 公网门面）

> 定位：给校外同学、毕业后访问、以及开源 README 在线 demo 用的**公网入口**。
> 大陆访问质量显著优于 `*.pages.dev`（腾讯自有边缘网络）。
> 免费计划长期有效，**流量与请求数均不限量**；官方欢迎对象明确包含
> 「个人兴趣开发者、教育类等非营利性项目」——与本项目完全对口。
> （政策以 [EdgeOne 官方说明](https://edgeone.ai/zh/document/70405) 当期为准）

---

## 0. 前置条件

- 一个腾讯云账号（微信/QQ 即可注册）
- 代码仓库托管在 **GitHub**（EdgeOne Pages 控制台 Git 集成目前对接 GitHub/GitLab；
  Gitee/GitCode 镜像可先镜像同步到 GitHub，或改用第 4 节的 CLI/直传方式）

## 1. 控制台 Git 集成部署（推荐）

1. 登录 [腾讯云控制台](https://console.cloud.tencent.com) → 搜索「**EdgeOne Pages**」→ 开通免费计划；
2. **创建项目 → 导入 Git 仓库**，授权 GitHub 后选择 OpenBox 仓库与 `main` 分支；
3. 构建配置按下表填写：

| 配置项 | 值 |
|---|---|
| 安装命令 | `npm ci --legacy-peer-deps` |
| 构建命令 | `VITE_BASE_URL=/ VITE_BUILD_DIR=dist npm run build` |
| 输出目录 | `dist` |
| Node 版本 | `20`（环境变量 `NODE_VERSION=20`） |

4. 环境变量（按需）：

| 变量 | 用途 |
|---|---|
| `NODE_VERSION=20` | 构建运行时版本 |
| `VITE_SUPABASE_URL` / `VITE_SUPABASE_ANON_KEY` | 可选：开启投稿审核/登录收藏/评论投票等云功能 |
| `VITE_SUPABASE_PROXY_URL` | 可选：国内直连 Supabase 慢时的 Worker 反代加速 |
| `VITE_HIDDEN_CATEGORIES` | 公网版**不要设置**（保持全量）；如需合规精简再启用 |

5. 点击部署。完成后获得默认域名 `https://<项目名>.edgeone.app`，推送 `main` 自动重新构建上线。

## 2. 与校内版的关系

同一份代码两种产物，互不干扰：

| | 校内版（DEPLOY-SCHOOL.md） | EdgeOne 公网版 |
|---|---|---|
| 分类 | 隐藏敏感分类 | 全量 |
| 后端 | 无（localStorage 兜底） | 可选 Supabase |
| 受众 | 本校同学 | 所有人 |

## 3. 自定义域名

- 默认 `*.edgeone.app` 域名**无需备案**即可使用；
- 绑定自定义域名并使用**中国大陆加速节点**需要 ICP 备案；仅海外节点则不需要。
- 有 eu.org/us.kg 等免费域名的话，CNAME 到 EdgeOne 分配的目标即可（流程同 CLOUDFLARE_DEPLOY.md 第 3–4 节思路）。

## 4. 备选：不经过 GitHub 的部署方式

- **CLI 直传**：本地构建出 `dist/` 后用 EdgeOne Pages 提供的 CLI/控制台上传功能直接发布
  （适合仓库只在 Gitee/GitCode 的场景）；
- 构建命令与本手册第 1 步完全一致。

## 5. 注意事项（免费计划）

- 不承诺服务 SLA（个人/教育项目完全够用，别拿来做生产关键业务）;
- 不适合托管视频/安装包等大文件分发（本项目纯网页，无此需求）;
- 高频异常调用会触发平台防护限流——正常导航站流量远达不到阈值。

---

*配套文档：[`DEPLOY-SCHOOL.md`](./DEPLOY-SCHOOL.md)（校内主力）、[`CLOUDFLARE_DEPLOY.md`](./CLOUDFLARE_DEPLOY.md)（海外镜像）、[`SUPABASE_SETUP.md`](./SUPABASE_SETUP.md)（开启云功能）*
