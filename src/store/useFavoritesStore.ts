// 收藏仓库
// 设计：对外 API（ids / toggle / has / clear）保持不变，组件无需改动。
// - 未登录：纯本地（localStorage，key=ob_favorites），行为与重构前一致。
// - 已登录：本地状态仍为主，同时把每次变更镜像到 Supabase favorites 表（云端收藏）；
//   登录成功时自动把云端收藏合并进本地（并集，本地优先），实现跨设备同步且不丢本地已有项。
import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { getSupabase, hasSupabase, AUTH_ENABLED } from '@/lib/supabase';
import { readJSON, writeJSON } from '@/lib/storage';
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

// 待删队列：云端删除失败（网络/RLS）时记录，避免下次 syncFromCloud 用并集把
// 已删项「复活」；登录同步时排除并自动重试。
const PENDING_DELETE_KEY = 'ob_fav_pending_deletes';

function readPendingDeletes(): string[] {
  return readJSON<string[]>(PENDING_DELETE_KEY, []);
}

function writePendingDeletes(ids: string[]) {
  // 存储不可用时不阻塞（最坏情况是删除被复活，与旧行为一致）
  if (ids.length) writeJSON(PENDING_DELETE_KEY, ids);
  else writeJSON(PENDING_DELETE_KEY, []);
}

interface FavoritesGroup {
  id: string;
  name: string;
  color: string;
}

interface FavoritesState {
  ids: string[];
  groups: FavoritesGroup[];
  groupAssignments: Record<string, string>; // resourceId -> groupId
  toggle: (id: string) => void;
  has: (id: string) => boolean;
  clear: () => void;
  createGroup: (name: string, color?: string) => string;
  deleteGroup: (groupId: string) => void;
  renameGroup: (groupId: string, name: string) => void;
  moveToGroup: (resourceId: string, groupId: string | null) => void;
  getGroupIds: (groupId: string | null) => string[];
  /** 登录后从云端合并收藏（本地优先，并集，排除待删项） */
  syncFromCloud: () => Promise<void>;
}

export const useFavoritesStore = create<FavoritesState>()(
  persist(
    (set, get) => ({
      ids: [],
      groups: [],
      groupAssignments: {},
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
          void getSupabase()
            .then((sb) => {
              if (!sb) return;
              if (added) {
                return sb.from('favorites').upsert({ user_id: uid, resource_id: id });
              }
              return sb.from('favorites').delete().eq('user_id', uid).eq('resource_id', id);
            })
            .then((res) => {
              const failed = !res || res.error;
              const pending = readPendingDeletes().filter((x) => x !== id);
              if (failed && !added) pending.push(id); // 删除失败 → 记入待删队列
              writePendingDeletes(pending);
            })
            .catch(() => {
              const pending = readPendingDeletes().filter((x) => x !== id);
              if (!added) pending.push(id);
              writePendingDeletes(pending);
            });
        }
      },
      has: (id) => get().ids.includes(id),
      clear: () => set({ ids: [], groups: [], groupAssignments: {} }),
      createGroup: (name, color = '#6366f1') => {
        const id = `g_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;
        set((s) => ({ groups: [...s.groups, { id, name, color }] }));
        return id;
      },
      deleteGroup: (groupId) => {
        set((s) => {
          const nextAssignments = { ...s.groupAssignments };
          for (const [rid, gid] of Object.entries(nextAssignments)) {
            if (gid === groupId) delete nextAssignments[rid];
          }
          return { groups: s.groups.filter((g) => g.id !== groupId), groupAssignments: nextAssignments };
        });
      },
      renameGroup: (groupId, name) => {
        set((s) => ({
          groups: s.groups.map((g) => (g.id === groupId ? { ...g, name } : g)),
        }));
      },
      moveToGroup: (resourceId, groupId) => {
        set((s) => {
          const next = { ...s.groupAssignments };
          if (groupId === null) delete next[resourceId];
          else next[resourceId] = groupId;
          return { groupAssignments: next };
        });
      },
      getGroupIds: (groupId) => {
        const { ids, groupAssignments } = get();
        if (groupId === null) return ids.filter((id) => !groupAssignments[id]);
        return ids.filter((id) => groupAssignments[id] === groupId);
      },
      syncFromCloud: async () => {
        const uid = useAuthStore.getState().user?.id;
        if (!authOn || !uid) return;
        const sb = await getSupabase();
        if (!sb) return;
        const { data, error } = await sb.from('favorites').select('resource_id').eq('user_id', uid);
        if (error || !data) return;
        const cloudIds = (data as { resource_id: string }[]).map((r) => r.resource_id);
        const pending = readPendingDeletes();
        // 重试上次失败的云端删除
        const stillPending: string[] = [];
        for (const id of pending) {
          try {
            const { error: delErr } = await sb
              .from('favorites')
              .delete()
              .eq('user_id', uid)
              .eq('resource_id', id);
            if (delErr) stillPending.push(id);
          } catch {
            stillPending.push(id);
          }
        }
        writePendingDeletes(stillPending);
        // 并集：本地已有项优先保留，云端补充；但待删项（删除未成功的）不复活
        const pendingSet = new Set(stillPending);
        const merged = Array.from(
          new Set([...get().ids, ...cloudIds.filter((id) => !pendingSet.has(id))]),
        );
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
