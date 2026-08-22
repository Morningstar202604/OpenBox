import { useEffect, useState } from 'react';
import { useAuthStore } from '@/store/useAuthStore';
import {
  getPendingSubmissions,
  reviewSubmission,
  isAdminEmail,
} from '@/lib/data';
import type { Submission } from '@/lib/types';
import { useToastStore } from '@/store/useToastStore';
import { fmtDate } from '@/lib/format';
import { EmptyState } from '@/components/EmptyState';
import { Icon } from '@/components/Icon';

/**
 * 管理员审核页（issue #11）：待审投稿队列 + 通过/拒绝。
 * - 入口：#/admin（不在导航暴露，站长直接输 URL）
 * - 权限：客户端 VITE_ADMIN_EMAILS 预判显隐；服务端 RLS（0006 is_admin()）强制执行
 *   —— 未授权者即使改包进入，查询也会被 RLS 拦截返回空。
 */
export function AdminPage() {
  const user = useAuthStore((s) => s.user);
  const push = useToastStore((s) => s.push);
  const [busyId, setBusyId] = useState<string | null>(null);

  const isAdmin = isAdminEmail(user?.email);

  // 派生权限态：非管理员不进入加载分支，无需 effect 内同步重置
  const [loaded, setLoaded] = useState<{ uid: string; list: Submission[] } | null>(null);
  useEffect(() => {
    if (!isAdmin || !user) return;
    let m = true;
    getPendingSubmissions().then((list) => {
      if (m) setLoaded({ uid: user.id, list });
    });
    return () => {
      m = false;
    };
  }, [isAdmin, user]);
  const items = isAdmin && user && loaded?.uid === user.id ? loaded.list : [];
  const loading = isAdmin && !!user && !loaded;

  const review = async (id: string, decision: 'approved' | 'rejected') => {
    setBusyId(id);
    const res = await reviewSubmission(id, decision);
    setBusyId(null);
    if (res.ok) {
      setLoaded((prev) => (prev ? { ...prev, list: prev.list.filter((x) => x.id !== id) } : prev));
      push(decision === 'approved' ? '已通过并合并进列表' : '已拒绝', 'success');
    } else {
      push(res.message ?? '操作失败', 'error');
    }
  };

  return (
    <div className="mx-auto max-w-3xl">
      <h2 className="mb-1 flex items-center gap-2 text-xl font-bold text-[var(--color-fg)]">
        <Icon name="ShieldCheck" size={20} /> 投稿审核
      </h2>
      <p className="mb-6 text-xs text-[var(--color-muted)]">
        待审队列（最多显示最近 100 条）。权限由数据库 RLS 强制执行，本页仅对
        VITE_ADMIN_EMAILS 名单内的登录邮箱可见。
      </p>

      {!user ? (
        <EmptyState icon="Lock" title="请先登录管理员账号" />
      ) : !isAdmin ? (
        <EmptyState icon="ShieldOff" title={`当前账号 ${user.email ?? ''} 不在管理员名单`} />
      ) : loading ? (
        <p className="text-sm text-[var(--color-muted)]">加载中…</p>
      ) : items.length === 0 ? (
        <EmptyState icon="Inbox" title="暂无待审投稿" />
      ) : (
        <div className="space-y-3">
          {items.map((s) => (
            <div key={s.id} className="card p-4">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-semibold text-[var(--color-fg)]">{s.name}</p>
                  <a
                    href={s.url}
                    target="_blank"
                    rel="noopener noreferrer nofollow"
                    className="block truncate text-xs text-[var(--color-primary)] hover:underline"
                  >
                    {s.url}
                  </a>
                  <p className="mt-1 line-clamp-2 text-xs text-[var(--color-muted)]">{s.summary}</p>
                  <p className="mt-1 text-[10px] text-[var(--color-muted)]">
                    分类 {s.subType} · {fmtDate(s.createdAt)}
                  </p>
                </div>
                <div className="flex shrink-0 gap-2">
                  <button
                    className="btn btn-primary btn-sm"
                    disabled={busyId === s.id}
                    onClick={() => s.id && review(s.id, 'approved')}
                  >
                    <Icon name="Check" size={14} /> 通过
                  </button>
                  <button
                    className="btn btn-ghost btn-sm"
                    disabled={busyId === s.id}
                    onClick={() => s.id && review(s.id, 'rejected')}
                  >
                    <Icon name="X" size={14} /> 拒绝
                  </button>

                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
