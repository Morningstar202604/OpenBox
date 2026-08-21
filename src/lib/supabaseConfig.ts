// Supabase 连接配置（占位模式：仓库中仅保留占位值，生产必须通过 .env 注入）。
//
// 设计原则：GitHub Pages 等静态托管不会打包 .env，因此仓库中保留占位值，
// 使默认构建回退为纯静态本地模式（不依赖任何后端）。部署到生产环境时，
// 务必通过构建平台的环境变量注入真正的 VITE_SUPABASE_URL 与 VITE_SUPABASE_ANON_KEY。
//
// 为什么不留真实 anon key 在仓库中：
//   1. anon key 虽设计为可公开，但仓库中硬编码意味着所有 fork 和克隆都自动
//      绑定站长的生产 Supabase 项目，造成数据混淆与潜在刷量风险。
//   2. 部署者环境变量注入才是标准做法，避免 fork 部署者无意中写入原站数据库。
//
// 本地开发：复制 .env.example 为 .env，填入真实凭证即可覆盖此文件。
// 部署平台：在构建环境变量中设置 VITE_SUPABASE_URL 与 VITE_SUPABASE_ANON_KEY。
//
// ⚠️ 切勿在此写入 service_role / secret key —— 那等于把数据库管理权公开给所有人。
export const SUPABASE_URL = "";  // 留空 = 纯静态模式，env 注入后自动启用
export const SUPABASE_ANON_KEY = "";  // 留空 = 纯静态模式，env 注入后自动启用

// Supabase API 代理地址（可选）。
// 国内用户直连 supabase.co 延迟高（300-800ms），可通过 Cloudflare Worker 反代加速。
// 配置方法：在 Cloudflare 创建 Worker 代理转发到 SUPABASE_URL，然后将 Worker URL 填在这里。
// 留空则直连 Supabase（默认行为）。
// 本地开发可用 .env 的 VITE_SUPABASE_PROXY_URL 覆盖。
export const SUPABASE_PROXY_URL = "";
