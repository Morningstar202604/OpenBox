// 收藏仓库
// 设计：对外 API（ids / toggle / has / clear）保持不变，组件无需改动。
// - 未登录：纯本地（localStorage，key=ob_favorites），行为与重构前一致。
// - 已登录：本地状态仍为主，同时把每次变更镜像到 Supabase favorites 表（云端收藏）；
//   登录成功时自动把云端收藏合并进本地（并集，本地优先），实现跨设备同步且不丢本地已有项。
import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { getSupabase, hasSupabase, AUTH_ENABLED } from '@/lib/supabase';
import { useAuthStore } from './useAuthStore';
import { useToastStore } from './useToastStore';
import { useI18nStore } from '@/i18n/useI18n';

const FAV_MSG = {
  added: { zh: '已收藏', en: 'Added to favorites', ja: 'お気に入りに追加しました' },
  addedLocal: {
    zh: '已加入本地收藏，登录后可云同步',
    en: 'Saved locally — sign in to sync across devices',
    ja: 'ローカルに保存しました。ログインで同期できます',
  },
  removed: { zh: '已取消收藏', en: 'Removed from favorites', ja: 'お気に入りを解除しました' },
} as const;

const authOn = AUTH_ENABLED && hasSupabase;

interface FavoritesState {
  ids: string[];
  toggle: (id: string) => void;
  has: (id: string) => boolean;
  clear: () => void;
  /** 登录后从云端合并收藏（本地优先，并集） */
  syncFromCloud: () => Promise<void>;
}

export const useFavoritesStore = create<FavoritesState>()(
  persist(
    (set, get) => ({
      ids: [],
      toggle: (id) => {
        const ids = get().ids;
        const added = !ids.includes(id);
        const next = added ? [...ids, id] : ids.filter((x) => x !== id);
        set({ ids: next });
        // 反馈提示：未登录点收藏时告知仅存本地（云同步需登录），避免静默无感知
        try {
          const lang = useI18nStore.getState().lang;
          const uid = useAuthStore.getState().user?.id;
          const msg = !added
            ? FAV_MSG.removed[lang]
            : authOn && uid
              ? FAV_MSG.added[lang]
              : FAV_MSG.addedLocal[lang];
          useToastStore.getState().push(msg, 'success');
        } catch { /* toast 失败不影响收藏 */ }
        // 登录态：镜像到云端收藏表（匿名 key + 用户会话，受 RLS 约束只能改自己的行）
        const uid = useAuthStore.getState().user?.id;
        if (authOn && uid) {
          void getSupabase().then((sb) => {
            if (!sb) return;
            if (added) {
              void sb.from('favorites').upsert({ user_id: uid, resource_id: id });
            } else {
              void sb.from('favorites').delete().eq('user_id', uid).eq('resource_id', id);
            }
          });
        }
      },
      has: (id) => get().ids.includes(id),
      clear: () => set({ ids: [] }),
      syncFromCloud: async () => {
        const uid = useAuthStore.getState().user?.id;
        if (!authOn || !uid) return;
        const sb = await getSupabase();
        if (!sb) return;
        const { data, error } = await sb.from('favorites').select('resource_id').eq('user_id', uid);
        if (error || !data) return;
        const cloudIds = (data as { resource_id: string }[]).map((r) => r.resource_id);
        // 并集：本地已有项优先保留，云端补充
        const merged = Array.from(new Set([...get().ids, ...cloudIds]));
        set({ ids: merged });
      },
    }),
    { name: 'ob_favorites' },
  ),
);

// 登录成功后自动从云端合并收藏（单向并集，不覆盖本地已有）
if (authOn) {
  useAuthStore.subscribe((state, prev) => {
    if (state.user && !prev.user) {
      void useFavoritesStore.getState().syncFromCloud();
    }
  });
}
