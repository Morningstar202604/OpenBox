import { useEffect, useMemo, useState } from 'react';
import { useT, useLocalize } from '@/i18n/useI18n';
import { useAuthStore } from '@/store/useAuthStore';
import { useToastStore } from '@/store/useToastStore';
import { getRatings, upsertRating, type ResourceRatings } from '@/lib/ratings';
import { getRatingDimensions, type RatingDimension } from '@/lib/ratingDimensions';
import { Icon } from './Icon';

/** 5 星展示（按 avg 0-5 部分填充） */
function Stars({ value, size = 14 }: { value: number; size?: number }) {
  const pct = Math.max(0, Math.min(1, value / 5)) * 100;
  return (
    <span className="relative inline-flex" style={{ fontSize: size }}>
      <span className="text-[var(--color-border)]">★★★★★</span>
      <span className="absolute inset-0 overflow-hidden text-amber-400" style={{ width: `${pct}%` }}>★★★★★</span>
    </span>
  );
}

/** 可点击的打分星（1-5，hover 高亮） */
function StarInput({ value, onChange }: { value: number; onChange: (v: number) => void }) {
  const [hover, setHover] = useState(0);
  return (
    <span className="inline-flex" onMouseLeave={() => setHover(0)}>
      {[1, 2, 3, 4, 5].map((n) => (
        <button
          key={n}
          type="button"
          className="px-0.5 text-base leading-none transition-colors"
          style={{ color: (hover || value) >= n ? 'var(--color-warning)' : 'var(--color-border)' }}
          onMouseEnter={() => setHover(n)}
          onClick={() => onChange(n)}
          aria-label={`${n} 星`}
        >
          ★
        </button>
      ))}
    </span>
  );
}

/**
 * 分维度评分组件（「不同模块不同评分体系」的落地）。
 * - 展示：各维度聚合均值 + 票数（只读，所有人可见）。
 * - 打分：需登录（注册后功能）；逐维度选择 1-5 星后提交，upsert 到 ratings 表。
 * - 未登录：提示登录后参与。
 */
export function RatingWidget({ resourceId, subType }: { resourceId: string; subType: string }) {
  const t = useT();
  const localize = useLocalize();
  const user = useAuthStore((s) => s.user);
  const openAuth = useAuthStore((s) => s.openAuth);
  const push = useToastStore((s) => s.push);

  const dims = useMemo(() => getRatingDimensions(subType), [subType]);
  // 派生 loading：state 携带所属资源 id，id 变化即视为加载中
  const [loaded, setLoaded] = useState<{ id: string; data: ResourceRatings } | null>(null);
  const [draft, setDraft] = useState<Record<string, number>>({});
  const [saving, setSaving] = useState(false);
  const loading = loaded?.id !== resourceId;
  const data = loading ? null : loaded!.data;

  useEffect(() => {
    let m = true;
    getRatings(resourceId).then((d) => { if (m) setLoaded({ id: resourceId, data: d }); });
    return () => { m = false; };
  }, [resourceId]);

  const submit = async () => {
    if (!user) { openAuth('signin'); return; }
    const picks = dims.filter((d) => draft[d.key]);
    if (!picks.length) { push(t('rating.pickFirst'), 'info'); return; }
    setSaving(true);
    let okAll = true;
    for (const d of picks) {
      const res = await upsertRating(resourceId, d.key, draft[d.key]);
      if (!res.ok) { okAll = false; push(res.message ?? 'error', 'error'); }
    }
    setSaving(false);
    if (okAll) {
      setDraft({});
      const fresh = await getRatings(resourceId);
      setLoaded({ id: resourceId, data: fresh });
      push(t('rating.saved'), 'success');
    }
  };

  return (
    <div className="mt-6 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] p-4">
      <h3 className="mb-3 flex items-center gap-1.5 text-sm font-semibold text-[var(--color-fg)]">
        <Icon name="Star" size={15} /> {t('rating.title')}
        {loading && <span className="ml-1 text-xs text-[var(--color-muted)]">…</span>}
        {data && data.total > 0 && (
          <span className="ml-1 inline-flex items-center gap-1 text-xs font-normal text-[var(--color-muted)]">
            <Stars value={data.overall} /> {data.overall.toFixed(1)} · {data.total}
          </span>
        )}
      </h3>

      {/* 维度聚合展示（只读） */}
      <div className="space-y-2">
        {dims.map((d: RatingDimension) => {
          const agg = data?.byDimension[d.key];
          return (
            <div key={d.key} className="flex items-center justify-between gap-3 text-sm">
              <span className="text-[var(--color-fg)]">
                {localize(d.label)}
                {d.hint && <span className="ml-1 text-xs text-[var(--color-muted)]">· {localize(d.hint)}</span>}
              </span>
              <span className="flex shrink-0 items-center gap-1.5">
                {agg ? (
                  <>
                    <Stars value={agg.avg} />
                    <span className="text-xs text-[var(--color-muted)]">{agg.avg.toFixed(1)} ({agg.count})</span>
                  </>
                ) : (
                  <span className="text-xs text-[var(--color-muted)]">—</span>
                )}
              </span>
            </div>
          );
        })}
      </div>

      {/* 打分输入（登录后可用） */}
      <div className="mt-4 border-t border-[var(--color-border)] pt-3">
        {user ? (
          <div className="space-y-2">
            <p className="text-xs text-[var(--color-muted)]">{t('rating.yourScore')}</p>
            {dims.map((d) => (
              <div key={d.key} className="flex items-center justify-between gap-3">
                <span className="text-sm text-[var(--color-fg)]">{localize(d.label)}</span>
                <StarInput value={draft[d.key] ?? 0} onChange={(v) => setDraft((p) => ({ ...p, [d.key]: v }))} />
              </div>
            ))}
            <button className="btn btn-primary btn-sm mt-1" onClick={submit} disabled={saving}>
              {saving ? t('common.loading') : t('rating.submit')}
            </button>
          </div>
        ) : (
          <button className="btn btn-ghost btn-sm w-full justify-center" onClick={() => openAuth('signin')}>
            <Icon name="LogIn" size={15} /> {t('rating.loginToRate')}
          </button>
        )}
      </div>
    </div>
  );
}
