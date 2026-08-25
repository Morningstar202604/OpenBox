import { beforeEach, describe, expect, it, vi } from 'vitest';

// ---- 环境准备：node 环境下补 localStorage（zustand persist / storage.ts 依赖） ----
const mem = new Map<string, string>();
vi.stubGlobal('localStorage', {
  getItem: (k: string) => (mem.has(k) ? mem.get(k)! : null),
  setItem: (k: string, v: string) => void mem.set(k, String(v)),
  removeItem: (k: string) => void mem.delete(k),
});

// ---- Supabase 假客户端：链式 builder + 可控的 select/delete 结果 ----
// vi.hoisted 保证 vi.mock 工厂可在提升后引用这些可变桩
const h = vi.hoisted(() => {
  type Row = { resource_id: string };
  const selectHolder: { current: { data: Row[] | null; error: { message: string } | null } } = {
    current: { data: [], error: null },
  };
  const deleteHolder: { current: { error: { message: string } | null } } = {
    current: { error: null },
  };
  const upsertCalls: Array<{ user_id: string; resource_id: string }> = [];
  const fromTables: string[] = [];

  function chain(get: () => unknown) {
    const p = {
      select() {
        return p;
      },
      eq() {
        return p;
      },
      delete() {
        return p;
      },
      then: (onF?: (v: unknown) => unknown, onR?: (e: unknown) => unknown) =>
        Promise.resolve(get()).then(onF, onR),
      catch: (onR?: (e: unknown) => unknown) => Promise.resolve(get()).catch(onR),
    };
    return p;
  }

  const sb = {
    from(table: string) {
      fromTables.push(table);
      return {
        select: () => chain(() => selectHolder.current),
        delete: () => chain(() => deleteHolder.current),
        upsert: (row: { user_id: string; resource_id: string }) => {
          upsertCalls.push(row);
          return Promise.resolve({ error: null });
        },
      };
    },
    auth: {
      getSession: async () => ({ data: { session: null } }),
      onAuthStateChange: () => ({ data: { subscription: { unsubscribe() {} } } }),
    },
  };

  return {
    selectHolder,
    deleteHolder,
    upsertCalls,
    fromTables,
    getSupabase: () => Promise.resolve(sb),
  };
});

vi.mock('@/lib/supabase', () => ({
  AUTH_ENABLED: true,
  hasSupabase: true,
  getSupabase: h.getSupabase,
}));

// localStorage 桩就绪后再加载被测模块（persist 在模块初始化时读取存储）
const { useFavoritesStore } = await import('../useFavoritesStore');
const { useAuthStore } = await import('../useAuthStore');
const { readJSON } = await import('@/lib/storage');

const PENDING_KEY = 'ob_fav_pending_deletes';
const readPending = (): string[] => readJSON<string[]>(PENDING_KEY, []);
const flush = () => new Promise((r) => setTimeout(r, 0));

describe('useFavoritesStore 云同步待删队列', () => {
  beforeEach(() => {
    mem.clear();
    h.selectHolder.current = { data: [], error: null };
    h.deleteHolder.current = { error: null };
    h.upsertCalls.length = 0;
    h.fromTables.length = 0;
    useFavoritesStore.setState({ ids: [] });
    // 登录态：让 toggle/sync 走云端镜像分支
    useAuthStore.setState({ user: { id: 'u1' } as never });
  });

  it('toggle 取消收藏且云端删除失败时，id 记入待删队列，本地立即移除', async () => {
    useFavoritesStore.setState({ ids: ['r1'] });
    h.deleteHolder.current.error = { message: 'rls deny' };

    useFavoritesStore.getState().toggle('r1');
    expect(useFavoritesStore.getState().ids).toEqual([]);

    await vi.waitFor(() => expect(readPending()).toEqual(['r1']));
  });

  it('添加收藏成功会顺带清掉同 id 的历史待删项', async () => {
    mem.set(PENDING_KEY, JSON.stringify(['r9']));

    useFavoritesStore.getState().toggle('r9');
    expect(useFavoritesStore.getState().ids).toEqual(['r9']);

    await vi.waitFor(() => expect(readPending()).toEqual([]));
    expect(h.upsertCalls).toEqual([{ user_id: 'u1', resource_id: 'r9' }]);
  });

  it('syncFromCloud 重试上次失败的删除：成功则并入云端全量并清空队列', async () => {
    mem.set(PENDING_KEY, JSON.stringify(['r1']));
    h.selectHolder.current = {
      data: [{ resource_id: 'r1' }, { resource_id: 'r2' }],
      error: null,
    };
    h.deleteHolder.current.error = null;

    await useFavoritesStore.getState().syncFromCloud();

    expect(useFavoritesStore.getState().ids.sort()).toEqual(['r1', 'r2']);
    expect(readPending()).toEqual([]);
  });

  it('syncFromCloud 重试仍失败：待删项不复活、队列保留，其余云端项正常并入', async () => {
    useFavoritesStore.setState({ ids: [] });
    mem.set(PENDING_KEY, JSON.stringify(['r1']));
    h.selectHolder.current = {
      data: [{ resource_id: 'r1' }, { resource_id: 'r2' }],
      error: null,
    };
    h.deleteHolder.current.error = { message: 'network down' };

    await useFavoritesStore.getState().syncFromCloud();

    expect(useFavoritesStore.getState().ids).toEqual(['r2']);
    expect(readPending()).toEqual(['r1']);
  });

  it('未登录时 toggle 仅改本地，不触发任何云端调用', async () => {
    useAuthStore.setState({ user: null });
    useFavoritesStore.getState().toggle('r1');
    await flush();
    expect(useFavoritesStore.getState().ids).toEqual(['r1']);
    expect(h.fromTables).toEqual([]);
    expect(readPending()).toEqual([]);
  });
});
