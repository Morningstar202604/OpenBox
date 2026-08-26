import { useEffect, useRef, useState } from 'react';
import { useT } from '@/i18n/useI18n';
import { getVerificationStats, getLocalVote, submitVerification, type VerificationStats } from '@/lib/data';
import { useToastStore } from '@/store/useToastStore';
import { fmtDate } from '@/lib/format';
import { Icon } from './Icon';

/**
 * 社区验证投票（「还能不能薅」社区验证：薅到投「还能用」、踩坑投「已失效」，
 * 帮后来人确认状态；本设备防重复，统计云端共享/本地兜底）。
 * big=true 用于详情页（带引导文案），默认紧凑行用于卡片。
 */
export function VerifyWidget({ resourceId, big = false }: { resourceId: string; big?: boolean }) {
  const t = useT();
  const push = useToastStore((s) => s.push);
  const [stats, setStats] = useState<VerificationStats>({ ok: 0, dead: 0, total: 0, lastAt: null });
  const [voted, setVoted] = useState<'ok' | 'dead' | null>(null);
  const [loading, setLoading] = useState(true);
  // 双击竞态锁：voted 异步更新前的第二次点击不再放行（乐观统计不再双加）
  const votingRef = useRef(false);

  useEffect(() => {
    let m = true;
    getVerificationStats(resourceId).then((s) => {
      if (m) {
        setStats(s);
        // 本设备已投标记（防重复）：统一走数据层的 getLocalVote，不再自行解析 localStorage
        setVoted(getLocalVote(resourceId)?.result ?? null);
        setLoading(false);
      }
    });
    return () => {
      m = false;
    };
  }, [resourceId]);

  const vote = async (r: 'ok' | 'dead') => {
    if (voted || votingRef.current) return;
    votingRef.current = true;
    // 先占位再提交：UI 即时反馈，服务端 23505 兜底真实去重
    setVoted(r);
    const res = await submitVerification(resourceId, r);
    votingRef.current = false;
    if (!res.ok) {
      setVoted(null);
      push(res.message ?? 'error', 'error');
      return;
    }
    // 服务端去重命中（该设备此前已投过）：不计乐观增量，统计以云端为准
    if (!res.duplicate) {
      setStats((s) => ({
        ok: s.ok + (r === 'ok' ? 1 : 0),
        dead: s.dead + (r === 'dead' ? 1 : 0),
        total: s.total + 1,
        lastAt: new Date().toISOString(),
      }));
    }
    push(res.duplicate ? res.message ?? t('verify.thanks') : t('verify.thanks'), 'success');
  };

  // loading 渲染占位骨架（固定高度）：统计异步返回时卡片不再集体跳动（CLS）
  if (loading) {
    return <div className={big ? 'h-[62px]' : 'h-[30px]'} aria-hidden="true" />;
  }

  const btnBase =
    'inline-flex items-center gap-1 rounded-md border px-2 py-1 text-xs font-medium transition-colors disabled:cursor-not-allowed disabled:opacity-50 max-sm:min-h-[36px]';
  const btnOk =
    voted === 'ok'
      ? 'border-[var(--color-success)] bg-[var(--color-success-soft)] text-[var(--color-success)] vote-pop'
      : 'border-[var(--color-border)] text-[var(--color-muted)] hover:border-[var(--color-success)] hover:text-[var(--color-success)] hover:-translate-y-px';
  const btnDead =
    voted === 'dead'
      ? 'border-[var(--color-danger)] bg-[var(--color-danger-soft)] text-[var(--color-danger)] vote-pop'
      : 'border-[var(--color-border)] text-[var(--color-muted)] hover:border-[var(--color-danger)] hover:text-[var(--color-danger)] hover:-translate-y-px';

  return (
    <div className={big ? 'rounded-xl border border-[var(--color-border)] p-3' : ''}>
      {big && (
        <p className="mb-2 flex items-center gap-1.5 text-xs text-[var(--color-muted)]">
          <Icon name="Activity" size={14} />
          {t('verify.cta')}
        </p>
      )}
      <div className="flex flex-wrap items-center gap-2">
        <button
          className={`${btnBase} ${btnOk}`}
          disabled={!!voted}
          onClick={() => vote('ok')}
          aria-pressed={voted === 'ok'}
          aria-label={t('verify.ok')}
        >
          <Icon name="ThumbsUp" size={13} /> {t('verify.ok')}
          {stats.ok > 0 && <span className="tabular-nums opacity-75">{stats.ok}</span>}
        </button>
        <button
          className={`${btnBase} ${btnDead}`}
          disabled={!!voted}
          onClick={() => vote('dead')}
          aria-pressed={voted === 'dead'}
          aria-label={t('verify.dead')}
        >
          <Icon name="AlertTriangle" size={13} /> {t('verify.dead')}
          {stats.dead > 0 && <span className="tabular-nums opacity-75">{stats.dead}</span>}
        </button>
        {stats.total > 0 && (
          <span className="inline-flex items-center gap-1 text-xs text-[var(--color-muted)]" aria-live="polite">
            <Icon name="Users" size={13} />
            {stats.total} {t('verify.people')}
            {stats.lastAt && (
              <span className="inline-flex items-center gap-0.5">
                · {t('verify.recent')} {fmtDate(stats.lastAt)}
              </span>
            )}
          </span>
        )}
      </div>
    </div>
  );
}
