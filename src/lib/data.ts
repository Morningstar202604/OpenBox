// 数据访问层（Data Access Layer）· 门面（Facade）
// 设计：
//   - 上层页面/组件只依赖本文件的导出，无需关心数据来自本地种子还是 Supabase。
//   - 2026-08 拆分：原 671 行单文件按域拆为五个模块（resources/submissions/
//     verifications/comments/admin），公共基座在 data/shared —— 各域可独立演进，
//     对外 API 签名保持不变（export * 全量再导出），调用方零改动。
//   - 域间依赖方向：submissions/comments/admin → resources(缓存失效) → shared；
//     verifications → shared + resources(缓存失效)。无循环依赖。
export * from './data/resources';
export * from './data/submissions';
export * from './data/verifications';
export * from './data/comments';
export * from './data/admin';
