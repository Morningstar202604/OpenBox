# OpenBox × 校园网部署手册（¥0 · 主力方案）

> 目标：把 OpenBox 部署到**学校内网**的一台常开机器上，全校同学通过校园网秒开。
> 不需要公网 IP、不需要域名备案、不受境外网络波动影响、不需要任何后端服务。
> 产物是纯静态目录 `dist/`——拷走即迁移，机器毕业回收也不怕。

---

## 0. 你需要准备什么

| 需要 | 说明 |
|---|---|
| 一台校内常开机器 | 机房退役电脑、实验室服务器、向网络中心申请的虚拟机均可；1 核 512MB 足够（纯静态） |
| 机器上的 Web 服务器 | 推荐 Caddy（单二进制 + 自动 HTTPS）；Nginx 亦可；最简甚至 Python 也行 |
| （可选）内网域名 | 让网络中心加一条校园网 DNS A 记录，如 `openbox.campus.edu.cn` → 机器内网 IP |

构建在**你自己的电脑**上完成（需要 Node.js 20+），校内机器只负责托管静态文件。

---

## 1. 本地构建「校园版」产物

校园版 = 纯静态模式（不接 Supabase，零后端依赖）+ 隐藏敏感分类（合规优先）。

Linux / macOS / Git Bash：

```bash
npm ci --legacy-peer-deps
VITE_BASE_URL=/ \
VITE_BUILD_DIR=dist \
VITE_SUPABASE_URL= \
VITE_SUPABASE_ANON_KEY= \
VITE_HIDDEN_CATEGORIES=proxy-nodes,relays \
npm run build
```

Windows PowerShell：

```powershell
$env:VITE_BASE_URL="/"; $env:VITE_BUILD_DIR="dist"
$env:VITE_SUPABASE_URL=""; $env:VITE_SUPABASE_ANON_KEY=""
$env:VITE_HIDDEN_CATEGORIES="proxy-nodes,relays"
npm run build
```

说明：
- `VITE_HIDDEN_CATEGORIES=proxy-nodes,relays` 会把「代理节点」「中转站」两个分类从导航、
  资源列表、搜索、SPA 路径目录和 sitemap 中整体剔除（合规考虑，见下文第 7 节）。
  想隐藏其他分类，追加 slug 即可（可用值见 `src/data/taxonomy.ts`）。
- 构建末尾的 `gen-spa-paths.mjs` 会为每个路由生成实体 `index.html`，
  因此**任何静态文件服务器都能正确响应深链**，无需额外 rewrite 规则。
- 产物在 `dist/` 目录（约 2–3 MB，含离线 Service Worker）。

---

## 2. 上传到校内机器

```bash
scp -r dist/ user@campus-server:/srv/openbox/
```

没有 ssh 条件时，U 盘拷贝整个 `dist/` 文件夹同样可行。

---

## 3. Caddy 方案（推荐）

Caddy 单二进制、自动申请续期证书、配置极简。

```bash
# Debian/Ubuntu 官方源安装（其他系统见 https://caddyserver.com/docs/install）
sudo apt install -y debian-keyring debian-archive-keyring apt-transport-https curl
curl -1sLf 'https://dl.cloudflare.com/cloudflare-main.gpg' \
  | sudo gpg --dearmor --yes -o /usr/share/keyrings/caddy-stable-archive-keyring.gpg
curl -1sLf 'https://packages.cloudflare.com/cloudflare/deb/debian.list' \
  | sudo tee /etc/apt/sources.list.d/caddy-stable.list
sudo apt update && sudo apt install -y caddy
```

`/etc/caddy/Caddyfile`：

```text
openbox.campus.edu.cn {
    root * /srv/openbox/dist
    encode zstd gzip

    # SPA 深链兜底（双保险：构建期已生成实体文件，此处覆盖遗漏路径）
    try_files {path} {path}/index.html index.html

    # 带 hash 的静态资源长缓存
    @immutable path /assets/*
    header @immutable Cache-Control "public, max-age=31536000, immutable"

    # Service Worker 不缓存
    header /sw.js Cache-Control "no-cache"

    file_server
}
```

```bash
sudo systemctl reload caddy
```

- 有内网 DNS 记录且用公共 CA：Caddy 自动 HTTPS。
- 无域名/无法签证书：把站点块地址改成 `:8080`，以 HTTP 监听内网端口即可（见第 7 节提示）。

---

## 4. Nginx 替代配置

```nginx
server {
    listen 80;
    server_name openbox.campus.edu.cn;
    root /srv/openbox/dist;
    index index.html;

    location /assets/ {
        add_header Cache-Control "public, max-age=31536000, immutable";
    }
    location = /sw.js {
        add_header Cache-Control "no-cache";
    }
    location / {
        try_files $uri $uri/index.html /index.html;
        gzip on;
        gzip_types text/css application/javascript image/svg+xml;
    }
}
```

## 5. 最简方案（无 root 权限时）

因为深链已有实体文件，任意静态服务器都能跑：

```bash
cd /srv/openbox/dist
python3 -m http.server 8080        # 临时演示
# 或
npx serve -l 8080 .                # 需要 Node
```

正式使用仍建议 Caddy/Nginx（缓存头、并发、开机自启）。用 systemd 保活：

```ini
# /etc/systemd/system/openbox-web.service
[Unit]
Description=OpenBox campus static site
After=network.target

[Service]
WorkingDirectory=/srv/openbox/dist
ExecStart=/usr/bin/python3 -m http.server 8080
Restart=always

[Install]
WantedBy=multi-user.target
```

```bash
sudo systemctl enable --now openbox-web
```

---

## 6. 日常更新流程

内容更新（每周精选/新资源）后：

```bash
git pull && npm ci --legacy-peer-deps
<同第 1 节的环境变量> npm run build
rsync -a --delete dist/ user@campus-server:/srv/openbox/dist/
```

浏览器端 Service Worker 为 autoUpdate 策略：用户下次访问自动换新，无感升级。

---

## 7. 校园版的三个刻意取舍

1. **隐藏敏感分类**：校园网有上网行为审计，「代理节点」「中转站」类内容在校内主动传播
   风险等级完全不同。默认 `VITE_HIDDEN_CATEGORIES=proxy-nodes,relays` 是保护站长本人与指导老师。
   过滤范围：导航/分类页、资源列表与搜索、资源详情路由、SPA 路径目录与产物 sitemap
   （实测全量 304 个路由 → 校园版 226 个，sitmap 零泄漏）。
   *已知边界*：应用 JS 内仍残留惰性字符串（营销文案与其他资源正文中的提及、taxonomy 运行时
   数组），用户界面、搜索结果与直链访问均不可见，仅 devtools 可见；如需字节级净化需构建期
   数据管线，属后续 P2 范畴。
2. **关闭云后端**：`VITE_SUPABASE_*` 留空 → 收藏/投票/评论全部本地 localStorage 兜底，
   无账号体系、无数据出校、零合规负担。日后想开社区功能再按 `SUPABASE_SETUP.md` 接入。
3. **HTTP 环境明示**：若最终走 `http://内网IP:8080`（无 TLS），请在群里告知同学：
   校内非加密环境请勿在站内填写真实邮箱等个人信息（纯浏览无影响）。

---

## 8. 故障排查

| 症状 | 排查 |
|---|---|
| 打开是空白页 | 多半是 base 路径不对：确认构建带了 `VITE_BASE_URL=/`，F12 看 assets 请求路径 |
| 深链 404 | 确认部署的是 `dist/` 而非别的目录；`ls dist/category/` 应能看到分类同名文件夹 |
| 改了内容没生效 | SW 缓存属正常现象：强刷一次（Ctrl+F5）；持续异常检查 sw.js 的 Cache-Control 是否 no-cache |
| 分类里少了「代理节点」 | 这就是 `VITE_HIDDEN_CATEGORIES` 在生效，不是 bug |
| 8080 被占 | 换端口或用 `sudo ss -tlnp` 找占用进程 |

---

*配套文档：[`EDGEONE_DEPLOY.md`](./EDGEONE_DEPLOY.md)（公网门面）、[`CLOUDFLARE_DEPLOY.md`](./CLOUDFLARE_DEPLOY.md)（海外镜像）、评估总纲 [`EXPERT-EVALUATION-2026-08.md`](./EXPERT-EVALUATION-2026-08.md)*
