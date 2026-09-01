import { useCallback, useEffect, useState } from 'react';
import type { Resource } from '@/lib/types';
import { safeHref } from '@/lib/url';
import { useT, useLocalize } from '@/i18n/useI18n';
import { useDialog } from '@/hooks/useDialog';
import { navigate } from '@/hooks/useHashRoute';
import { getSubType } from '@/data/taxonomy';
import { useFavoritesStore } from '@/store/useFavoritesStore';
import { useToastStore } from '@/store/useToastStore';
import { copyText } from '@/lib/clipboard';
import { Icon } from './Icon';
import { SoftIcon } from './SoftIcon';
import { StatusBadge, TypeBadge } from './Badge';
import { ResourceFlags } from './ResourceFlags';
import { VerifyWidget } from './VerifyWidget';
import { CommentsWidget } from './CommentsWidget';
import { RatingWidget } from './RatingWidget';
import { ApiExample } from './ApiExample';
import { getVerificationStats } from '@/lib/data';
import { scoreResource, type ScoreBreakdown } from '@/lib/ranking';
import { getMachineStatusMap, type MachineStatus } from '@/lib/machineStatus';
import { fmtDate } from '@/lib/format';

function Field({ label, value }: { label: string; value?: string }) {
  if (!value) return null;
  return (
    <div className="flex flex-col gap-0.5">
      <span className="text-xs font-medium text-[var(--color-muted)]">{label}</span>
      <span className="text-sm text-[var(--color-fg)]">{value}</span>
    </div>
  );
}

/**
 * 机器巡检行：展示 CI 每日探测的可达性结果（resource-status.json）。
 * 数据缺失（未部署/请求失败）时返回 null 不占布局；与社区投票互补——
 * 机器看连通性，人看功能是否还真能用。
 */
function MachineCheckLine({ url }: { url: string }) {
  const t = useT();
  const [ms, setMs] = useState<MachineStatus | null>(null);
  useEffect(() => {
    let m = true;
    getMachineStatusMap().then((map) => {
      if (m) setMs(map[url] ?? null);
    });
    return () => {
      m = false;
    };
  }, [url]);

  if (!ms) return null;
  const verdictMeta = {
    ok: { label: t('machine.ok'), cls: 'text-[var(--color-success)]' },
    suspect: { label: t('machine.suspect'), cls: 'text-[var(--color-warning)]' },
    dead: { label: t('machine.dead'), cls: 'text-[var(--color-danger)]' },
  }[ms.v];
  return (
    <p className="mt-2 inline-flex items-center gap-1.5 font-mono text-xs text-[var(--color-muted)]">
      <Icon name="Radar" size={13} className={verdictMeta.cls} />
      {t('machine.checked')} {fmtDate(ms.at, true)} · <span className={verdictMeta.cls}>{verdictMeta.label}</span>
      {ms.v === 'ok' && ms.ms != null && ` · ${ms.ms}ms`}
      {(ms.v === 'suspect' || ms.v === 'dead') && ` · ×${ms.fails ?? 1}`}
    </p>
  );
}

/** 免费 API 专项评分卡（通用混合分：免费度/官方可信/稳定性/新鲜度/功能丰富/人气 + 社区信号） */
function FreeApiScorecard({ resource }: { resource: Resource }) {
  const t = useT();
  const [score, setScore] = useState<ScoreBreakdown | null>(null);
  useEffect(() => {
    let m = true;
    getVerificationStats(resource.id)
      .then((s) => { if (m) setScore(scoreResource(resource, { verifyOk: s.ok, verifyDead: s.dead })); })
      .catch(() => { if (m) setScore(scoreResource(resource)); });
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
    if (await copyText(resource.url)) push(t('detail.copied'), 'success');
    else push(resource.url, 'info');
  };
  const share = async () => {
    const shareText = `【${resource.name}】${resource.summary}\n${resource.url}`;
    if (await copyText(shareText)) push('分享内容已复制', 'success');
    else push(shareText, 'info');
  };
  // 判断是否为 API 类资源（展示调用示例）
  const isApiResource = ['free-api', 'relay', 'api-gateway'].includes(resource.subType) ||
    resource.subType.includes('api') || resource.subType.includes('relay');

  return (
    <>
      <div className="flex items-start gap-3">
        <SoftIcon icon={cat?.icon} color={cat?.color} size={24} className="h-12 w-12" />
        <div className="min-w-0 flex-1">
          <h2 className="text-xl font-bold text-[var(--color-fg)]">{resource.name}</h2>
          <p className="text-sm text-[var(--color-muted)]">{cat ? localize(cat.name) : ''}</p>
        </div>
      </div>

      <div className="mt-4 flex flex-wrap items-center gap-2.5">
        <TypeBadge type={resource.type} />
        <StatusBadge status={resource.status} />
        {/* 官方/部分免费/非免费/需代理 徽章统一由 ResourceFlags 输出，避免「官方」重复渲染 */}
        <ResourceFlags resource={resource} />
      </div>

      {/* 机器巡检（CI 每日探测的可达性，与社区投票互补：机器看连通、人看功能） */}
      <MachineCheckLine url={resource.url} />

      {/* 社区验证投票（「还能不能薅」） */}
      <div className="mt-4">
        <VerifyWidget resourceId={resource.id} big />
      </div>

      {/* 分维度评分（不同模块不同维度；评分需登录） */}
      <RatingWidget resourceId={resource.id} subType={resource.subType} />

      {/* 免费 API 专项评分（8 维，区别于通用混合分） */}
      {resource.subType === 'free-api' && <FreeApiScorecard resource={resource} />}

      <p className="mt-4 text-base leading-7 text-[var(--color-fg)]">{resource.description}</p>

      {resource.guide && (
        <div className="mt-5 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] p-4">
          <p className="mb-2 flex items-center gap-1.5 text-sm font-semibold text-[var(--color-fg)]">
            <Icon name="Wand2" size={15} /> {t('detail.guide')}
          </p>
          <p className="whitespace-pre-line font-mono text-sm leading-relaxed text-[var(--color-muted)]">{resource.guide}</p>
        </div>
      )}

      {/* API 调用示例（仅 API 类资源展示） */}
      {isApiResource && <ApiExample resource={resource} />}

      {resource.steps?.length ? (
        <div className="mt-5 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] p-4">
          <p className="mb-4 flex items-center gap-1.5 text-sm font-semibold text-[var(--color-fg)]">
            <Icon name="ListOrdered" size={15} /> {t('detail.steps')}
          </p>
          <ol className="relative space-y-4 pl-2">
            {/* 时间线竖线 */}
            <span className="absolute left-[11px] top-2 bottom-2 w-px bg-[var(--color-border)]" />
            {resource.steps.map((s, i) => (
              <li key={i} className="relative flex gap-3">
                <span
                  className={`z-10 flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-xs font-bold ${
                    i === 0
                      ? 'bg-[var(--color-primary)] text-[var(--color-primary-fg)] ring-4 ring-[var(--color-primary-soft)]'
                      : 'bg-[var(--color-primary-soft)] text-[var(--color-primary)]'
                  }`}
                >
                  {i + 1}
                </span>
                <span className={`pt-0.5 text-sm leading-relaxed ${i === 0 ? 'font-medium text-[var(--color-fg)]' : 'text-[var(--color-muted)]'}`}>
                  {s}
                </span>
              </li>
            ))}
          </ol>
        </div>
      ) : null}

      {(resource.pros?.length || resource.cons?.length) && (
        <div className="mt-5 grid grid-cols-1 gap-4 sm:grid-cols-2">
          {resource.pros?.length ? (
            <div className="rounded-xl border border-[var(--color-border)] p-3">
              <p className="mb-2 flex items-center gap-1.5 text-sm font-semibold text-[var(--color-success)]">
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
              <p className="mb-2 flex items-center gap-1.5 text-sm font-semibold text-[var(--color-warning)]">
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

      {/* 可点击标签：点击跳转到搜索页 */}
      {resource.tags?.length > 0 && (
        <div className="mt-4 flex flex-wrap items-center gap-1.5">
          <span className="text-xs font-medium text-[var(--color-muted)]">标签：</span>
          {resource.tags.map((tag) => (
            <button
              key={tag}
              onClick={() => navigate(`/search?q=${encodeURIComponent(tag)}`)}
              className="rounded-full border border-[var(--color-border)] px-2 py-0.5 text-xs text-[var(--color-muted)] transition-colors hover:border-[var(--color-primary)] hover:text-[var(--color-primary)]"
            >
              {tag}
            </button>
          ))}
        </div>
      )}

      <div className="mt-6 flex flex-wrap gap-2">
        <a className="btn btn-primary" href={safeHref(resource.url)} target="_blank" rel="noreferrer">
          <Icon name="ExternalLink" size={16} /> {t('common.visit')}
        </a>
        <button className="btn btn-ghost" onClick={copy}>
          <Icon name="Copy" size={16} /> {t('detail.copy')}
        </button>
        <button className="btn btn-ghost" onClick={() => toggleFav(resource.id)}>
          <Icon name="Heart" size={16} fill={fav ? 'var(--color-primary)' : 'none'} color={fav ? 'var(--color-primary)' : undefined} />
          {fav ? t('detail.unfavorite') : t('detail.favorite')}
        </button>
        <button className="btn btn-ghost" onClick={share}>
          <Icon name="Share2" size={16} /> 分享
        </button>
      </div>

      {/* 社区留言区（社区式：分享经验/避坑，匿名可留） */}
      <CommentsWidget resourceId={resource.id} />
    </>
  );
}

/** 弹窗包装（列表点击查看详情时使用） */
export function DetailView({ resource, onClose }: { resource: Resource; onClose: () => void }) {
  const t = useT();
  const [closing, setClosing] = useState(false);
  const handleClose = useCallback(() => {
    setClosing(true);
    setTimeout(() => onClose(), 280);
  }, [onClose]);
  // 焦点陷阱 + 滚动锁 + Esc（关闭走 handleClose 保留退场动画）
  const panelRef = useDialog(handleClose, true);

  return (
    <div
      className={`fixed inset-0 z-[var(--z-modal)] flex items-end justify-center bg-black/40 p-0 backdrop-blur-sm transition-opacity duration-280 sm:items-center sm:p-4 ${closing ? 'opacity-0' : 'opacity-100'}`}
      role="dialog"
      aria-modal="true"
      aria-label={resource.name}
      onClick={handleClose}
    >
      <div
        ref={panelRef}
        tabIndex={-1}
        className={`sheet w-full max-w-2xl overflow-y-auto rounded-t-2xl border border-[var(--color-border)] bg-[var(--color-surface)] p-6 shadow-[var(--shadow-card)] outline-none sm:max-h-[85vh] sm:rounded-2xl `}
        onClick={(e) => e.stopPropagation()}
        style={{ animation: closing ? 'sheet-down 0.28s ease-in both' : 'sheet-up 0.3s ease-out both' }}
      >
        <div className="mb-4 flex justify-end">
          <button className="text-[var(--color-muted)] hover:text-[var(--color-fg)]" onClick={handleClose} aria-label={t('common.close')}>
            <Icon name="X" size={20} />
          </button>
        </div>
        <ResourceDetail resource={resource} />
      </div>
    </div>
  );
}
