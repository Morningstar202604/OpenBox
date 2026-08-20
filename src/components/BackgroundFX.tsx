/**
 * 全局动态背景层：坐标纸网格 + 缓慢漂移的青绿光晕。
 * 固定全屏、置于内容之下（-z-10），颜色由主题变量驱动自动适配暗色；
 * 动画仅用 transform/opacity，并受全局 prefers-reduced-motion 压制。
 */
export function BackgroundFX() {
  return (
    <div aria-hidden className="bg-fx">
      <div className="bg-fx-grid" />
      <div className="bg-fx-blob bg-fx-blob-1" />
      <div className="bg-fx-blob bg-fx-blob-2" />
      <div className="bg-fx-blob bg-fx-blob-3" />
    </div>
  );
}
