import { useEffect, useState } from 'react';
import type { Resource } from '@/lib/types';
import { useT, useLocalize } from '@/i18n/useI18n';
import { getSubType } from '@/data/taxonomy';
import { useFavoritesStore } from '@/store/useFavoritesStore';
import { useToastStore } from '@/store/useToastStore';
import { Icon } from './Icon';
import { StatusBadge, TypeBadge } from './Badge';
import { ResourceFlags } from './ResourceFlags';
import { VerifyWidget } from './VerifyWidget';
import { CommentsWidget } from './CommentsWidget';
import { RatingWidget } from './RatingWidget';
import { getVerificationStats } from '@/lib/data';
import { scoreFreeApi, type RankScore } from '@/lib/ranking';

function Field({ label, value }: { label: string; value?: string }) {
  if (!value) return null;
  return (
    <div className="flex flex-col gap-0.5">
      <span className="text-xs font-medium text-[var(--color-muted)]">{label}</span>
      <span className="text-sm text-[var(--color-fg)]">{value}</span>
    </div>
  );
}

/** 免费 API 专项评分卡（8 维），仅 free-api 子类型展示（前端/呈现优化 + 启用原本死代码 scoreFreeApi） */
function FreeApiScorecard({ resource }: { resource: Resource }) {
  const t = useT();
  const [score, setScore] = useState<RankScore | null>(null);
  useEffect(() => {
    let m = true;
    getVerificationStats(resource.id)
      .then((s) => { if (m) setScore(scoreFreeApi(resource, { ok: s.ok, dead: s.dead })); })
      .catch(() => { if (m) setScore(scoreFreeApi(resource)); });
    return () => { m = false; };
  }, [resource]);
  if (!score) return null;
  return (
    <div className="mt-5 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] p-4">
      <div className="mb-3 flex items-center justify-between">
        <h3 className="flex items-center gap-1.5 text-sm font-semibold text-[var(--color-fg)]">
          <Icon name="BarChart3" size={15} /> {t('detail.freeApiScore')}
        </h3>
        <span className="rounded-lg bg-[var(--color-primary)] px-2 py-0.5 text-sm font-bold text-[var(--color-primary-fg)]">{score.total}</span>
      </div>
      <div className="space-y-1.5">
        {score.parts.map((p) => (
          <div key={p.label} className="flex items-center gap-2 text-xs">
            <span className="w-20 shrink-0 text-[var(--color-muted)]">{p.label}</span>
            <span className="h-1.5 flex-1 overflow-hidden rounded-full bg-[var(--color-border)]">
              <span className="block h-full rounded-full bg-[var(--color-primary)]" style={{ width: `${Math.max(0, Math.min(100, (p.score / p.max) * 100))}%` }} />
            </span>
            <span className="w-10 shrink-0 text-right text-[var(--color-fg)]">{p.score}/{p.max}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

/** 详情内容（被弹窗与独立页面复用） */
export function ResourceDetail({ resource }: { resource: Resource }) {
  const t = useT();
  const localize = useLocalize();
  const cat = getSubType(resource.subType);
  const fav = useFavoritesStore((s) => s.ids.includes(resource.id));
  const toggleFav = useFavoritesStore((s) => s.toggle);
  const push = useToastStore((s) => s.push);

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(resource.url);
      push(t('detail.copied'), 'success');
    } catch {
      push(resource.url, 'info');
    }
  };

  return (
    <>
      <div className="flex items-start gap-3">
        <span
          className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl"
          style={{ background: `${cat?.color ?? '#888'}1a`, color: cat?.color }}
        >
          <Icon name={cat?.icon ?? 'Globe'} size={24} />
        </span>
        <div className="min-w-0 flex-1">
          <h2 className="text-xl font-bold text-[var(--color-fg)]">{resource.name}</h2>
          <p className="text-sm text-[var(--color-muted)]">{cat ? localize(cat.name) : ''}</p>
        </div>
      </div>

      <div className="mt-4 flex flex-wrap items-center gap-2.5">
        <TypeBadge type={resource.type} />
        <StatusBadge status={resource.status} />
        {resource.official && (
          <span className="badge" style={{ color: 'var(--color-primary)', background: 'var(--color-primary-soft)' }}>
            {t('common.official')}
          </span>
        )}
        <ResourceFlags resource={resource} />
      </div>

      {/* 社区验证投票（「还能不能薅」） */}
      <div className="mt-4">
        <VerifyWidget resourceId={resource.id} big />
      </div>

      {/* 分维度评分（不同模块不同维度；评分需登录） */}
      <RatingWidget resourceId={resource.id} subType={resource.subType} />

      {/* 免费 API 专项评分（8 维，区别于通用混合分） */}
      {resource.subType === 'free-api' && <FreeApiScorecard resource={resource} />}

      <p className="mt-4 text-[15px] leading-7 text-[var(--color-fg)]">{resource.description}</p>

      {resource.guide && (
        <div className="mt-5 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] p-4">
          <p className="mb-2 flex items-center gap-1.5 text-sm font-semibold text-[var(--color-fg)]">
            <Icon name="Wand2" size={15} /> {t('detail.guide')}
          </p>
          <p className="whitespace-pre-line font-mono text-[13px] leading-relaxed text-[var(--color-muted)]">{resource.guide}</p>
        </div>
      )}

      {resource.steps?.length ? (
        <div className="mt-5 rounded-xl border border-[var(--color-border)] p-3">
          <p className="mb-2 flex items-center gap-1.5 text-sm font-semibold text-[var(--color-fg)]">
            <Icon name="ListOrdered" size={15} /> {t('detail.steps')}
          </p>
          <ol className="space-y-1.5 text-sm text-[var(--color-muted)]">
            {resource.steps.map((s, i) => (
              <li key={i} className="flex gap-2">
                <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-[var(--color-primary-soft)] text-xs font-semibold text-[var(--color-primary)]">
                  {i + 1}
                </span>
                <span>{s}</span>
              </li>
            ))}
          </ol>
        </div>
      ) : null}

      {(resource.pros?.length || resource.cons?.length) && (
        <div className="mt-5 grid grid-cols-1 gap-4 sm:grid-cols-2">
          {resource.pros?.length ? (
            <div className="rounded-xl border border-[var(--color-border)] p-3">
              <p className="mb-2 flex items-center gap-1.5 text-sm font-semibold text-[#10b981]">
                <Icon name="ThumbsUp" size={15} /> {t('detail.pros')}
              </p>
              <ul className="space-y-1 text-sm text-[var(--color-muted)]">
                {resource.pros.map((p) => (
                  <li key={p}>· {p}</li>
                ))}
              </ul>
            </div>
          ) : null}
          {resource.cons?.length ? (
            <div className="rounded-xl border border-[var(--color-border)] p-3">
              <p className="mb-2 flex items-center gap-1.5 text-sm font-semibold text-[#f59e0b]">
                <Icon name="AlertTriangle" size={15} /> {t('detail.cons')}
              </p>
              <ul className="space-y-1 text-sm text-[var(--color-muted)]">
                {resource.cons.map((c) => (
                  <li key={c}>· {c}</li>
                ))}
              </ul>
            </div>
          ) : null}
        </div>
      )}

      {resource.tips && (
        <div className="mt-4 rounded-xl bg-[var(--color-primary-soft)] p-3 text-sm text-[var(--color-fg)]">
          <span className="font-semibold">{t('detail.tips')}：</span>
          {resource.tips}
        </div>
      )}

      <div className="mt-5 grid grid-cols-1 gap-4 sm:grid-cols-2">
        <Field label={t('detail.models')} value={resource.models?.join('、')} />
        <Field label={t('detail.protocols')} value={resource.protocols?.join('、')} />
        <Field label={t('detail.region')} value={resource.region} />
        <Field label={t('detail.pricing')} value={resource.pricing} />
        <Field label={t('detail.register')} value={resource.register} />
        <Field label={t('detail.updated')} value={resource.updatedAt} />
      </div>

      <div className="mt-6 flex flex-wrap gap-2">
        <a className="btn btn-primary" href={resource.url} target="_blank" rel="noreferrer">
          <Icon name="ExternalLink" size={16} /> {t('common.visit')}
        </a>
        <button className="btn btn-ghost" onClick={copy}>
          <Icon name="Copy" size={16} /> {t('detail.copy')}
        </button>
        <button className="btn btn-ghost" onClick={() => toggleFav(resource.id)}>
          <Icon name="Heart" size={16} fill={fav ? 'var(--color-primary)' : 'none'} color={fav ? 'var(--color-primary)' : undefined} />
          {fav ? t('detail.unfavorite') : t('detail.favorite')}
        </button>
      </div>

      {/* 社区留言区（社区式：分享经验/避坑，匿名可留） */}
      <CommentsWidget resourceId={resource.id} />
    </>
  );
}

/** 弹窗包装（列表点击查看详情时使用） */
export function DetailView({ resource, onClose }: { resource: Resource; onClose: () => void }) {
  const [closing, setClosing] = useState(false);
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') handleClose(); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);
  const handleClose = () => {
    setClosing(true);
    setTimeout(() => onClose(), 280);
  };

  return (
    <div
      className={`fixed inset-0 z-50 flex items-end justify-center bg-black/40 p-0 backdrop-blur-sm transition-opacity duration-280 sm:items-center sm:p-4 ${closing ? 'opacity-0' : 'opacity-100'}`}
      onClick={handleClose}
    >
      <div
        className={`sheet w-full max-w-2xl overflow-y-auto rounded-t-2xl border border-[var(--color-border)] bg-[var(--color-surface)] p-6 shadow-[var(--shadow-card)] sm:max-h-[85vh] sm:rounded-2xl ${closing ? 'animate-sheet-down' : ''}`}
        onClick={(e) => e.stopPropagation()}
        style={{ animation: closing ? 'sheet-down 0.28s ease-in both' : 'sheet-up 0.3s ease-out both' }}
      >
        <div className="mb-4 flex justify-end">
          <button className="text-[var(--color-muted)] hover:text-[var(--color-fg)]" onClick={handleClose} aria-label="close">
            <Icon name="X" size={20} />
          </button>
        </div>
        <ResourceDetail resource={resource} />
      </div>
    </div>
  );
}
