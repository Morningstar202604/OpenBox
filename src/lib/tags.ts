// 过滤掉中转站社区投稿里自报的「评分X.X / 可用率XX%」类噪声标签。
// 这些数值与 status 字段自相矛盾（如 status=ok 却带「可用率0%」），
// 占据卡片 chips 空间、干扰核心信息，故在紧凑展示层（卡片/列表/精选）统一隐藏。
const NOISE_TAG = /^(评分|可用率)/;

/** 返回适合在 chips 中紧凑展示的标签（已剔除噪声评分/可用率标签）。 */
export function displayTags(tags: string[] | undefined): string[] {
  return (tags ?? []).filter((t) => !NOISE_TAG.test(t));
}
