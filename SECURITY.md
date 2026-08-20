# 🔒 Security Policy

## Supported Versions

OpenBox 是一个静态前端 + 可选 Supabase 后端的导航站。**当前 `main` 分支的最新版本**接受安全报告。
历史版本不提供安全补丁，请始终升级到最新 commit。

## Reporting a Vulnerability

发现安全漏洞请**不要**直接开公开 Issue，按以下方式私下报告：

1. **首选**：[GitHub Security Advisories](https://github.com/weed33834/OpenBox/security/advisories/new) 提交私密报告（不公开讨论）
2. **备选**：在 [Discussions](https://github.com/weed33834/OpenBox/discussions) 联系 @weed33834，告知详细情况后再走安全建议流程

请在报告中说明：

- 漏洞类型（XSS / CSRF / 凭证泄露 / Supabase RLS 绕过 / 依赖漏洞 / 其他）
- 复现步骤与最小化 PoC
- 影响范围（受影响文件/功能/版本）
- 是否已公开 / 是否已利用

## Response Timeline

- **48 小时内**确认收到
- **7 天内**给出修复方案或时间表
- 修复完成后会公开 CVE 描述与致谢（除非你要求匿名）

## Scope

OpenBox 是**纯静态前端**为主，攻击面有限，主要包括：

- 前端 XSS（用户投稿/评论未转义）
- Supabase RLS 策略绕过（service_role 严禁入前端）
- 第三方资源链接被劫持（外链审计见 `OpenBox_资源核查与反馈处理报告.md`）
- 构建产物泄露（已扫描确认 anon publishable key 之外无敏感信息）

## Out of Scope

- 第三方网站/服务自身的漏洞（请报告给对应平台）
- 社会工程学攻击
- 资源站点自身的宕机/被墙

感谢你的负责任披露。
