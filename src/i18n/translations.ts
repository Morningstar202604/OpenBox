// 轻量国际化：界面文案（导航 / 按钮 / 标签）。资源内容按作者原样展示。
// 分类/场景名走 types.LocalizedText（数据即多语），不在此处。
//
// 按语言分包（issue 待办）：zh 为默认语言随主包静态引入（兜底必需）；
// en/ja 各自独立 chunk，由 useI18n.prepareLocale 按当前语言动态加载——
// 首屏只下载一种语言的文案（gzip 约 -12KB），不再三语全量打包。
import { messages as zh } from './locales/zh';

export type Lang = 'zh' | 'en' | 'ja';

/** 已加载语言包注册表。en/ja 初始为空对象，加载完成前回退 zh。 */
export const dict: Record<Lang, Record<string, string>> = {
  zh,
  en: {},
  ja: {},
};

const localeLoaders: Record<Lang, () => Promise<{ messages: Record<string, string> }>> = {
  zh: () => Promise.resolve({ messages: zh }),
  en: () => import('./locales/en').then((m) => ({ messages: m.messages })),
  ja: () => import('./locales/ja').then((m) => ({ messages: m.messages })),
};

// 并发去重：同一语言的加载中 Promise 被缓存。
// 此前两个并发 loadLocale('en') 会各自动态 import 并先后覆盖 dict[lang]——
// 动态 import 本身有模块缓存所以通常无害，但若加载失败一次，后续调用会
// 因 dict 仍为空而反复重试网络；缓存失败的 Promise 一段时间内直接复用结果。
const pendingLoads = new Map<Lang, Promise<void>>();

/** 加载语言包并合入 dict（幂等：已加载或加载中直接返回同一 Promise） */
export function loadLocale(lang: Lang): Promise<void> {
  if (Object.keys(dict[lang]).length > 0) return Promise.resolve();
  const inflight = pendingLoads.get(lang);
  if (inflight) return inflight;
  const p = localeLoaders[lang]()
    .then(({ messages }) => {
      dict[lang] = messages;
    })
    .finally(() => {
      // 成功后清槽让幂等短路接管；失败也清槽允许下次进入站点时重试
      pendingLoads.delete(lang);
    });
  pendingLoads.set(lang, p);
  return p;
}
