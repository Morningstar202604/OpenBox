import { useMemo, useState } from 'react';
import { useT } from '@/i18n/useI18n';
import { useResources } from '@/hooks/useResources';
import { useFavoritesStore } from '@/store/useFavoritesStore';
import { ResourceList } from '@/components/ResourceList';
import { EmptyState } from '@/components/EmptyState';
import { navigate } from '@/hooks/useHashRoute';
import { Icon } from '@/components/Icon';
import { Modal } from '@/components/Modal';

const GROUP_COLORS = ['#6366f1', '#ec4899', '#f59e0b', '#10b981', '#3b82f6', '#ef4444', '#8b5cf6', '#14b8a6'];

export function FavoritesPage() {
  const t = useT();
  const ids = useFavoritesStore((s) => s.ids);
  const groups = useFavoritesStore((s) => s.groups);
  const groupAssignments = useFavoritesStore((s) => s.groupAssignments);
  const createGroup = useFavoritesStore((s) => s.createGroup);
  const deleteGroup = useFavoritesStore((s) => s.deleteGroup);
  const renameGroup = useFavoritesStore((s) => s.renameGroup);
  const moveToGroup = useFavoritesStore((s) => s.moveToGroup);
  const getGroupIds = useFavoritesStore((s) => s.getGroupIds);

  const { resources: all } = useResources({ sort: 'default' });
  const [activeGroup, setActiveGroup] = useState<string | null>(null);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newGroupName, setNewGroupName] = useState('');
  const [newGroupColor, setNewGroupColor] = useState(GROUP_COLORS[0]);
  const [editingGroup, setEditingGroup] = useState<string | null>(null);
  const [editName, setEditName] = useState('');
  const [moveTarget, setMoveTarget] = useState<string | null>(null); // resourceId being moved

  const favs = useMemo(() => all.filter((r) => ids.includes(r.id)), [all, ids]);

  const currentIds = activeGroup ? getGroupIds(activeGroup) : getGroupIds(null);
  const currentResources = all.filter((r) => currentIds.includes(r.id));

  const ungroupedCount = ids.filter((id) => !groupAssignments[id]).length;

  const handleCreate = () => {
    if (!newGroupName.trim()) return;
    createGroup(newGroupName.trim(), newGroupColor);
    setNewGroupName('');
    setShowCreateModal(false);
  };

  const handleRename = () => {
    if (!editName.trim() || !editingGroup) return;
    renameGroup(editingGroup, editName.trim());
    setEditingGroup(null);
    setEditName('');
  };

  const handleDelete = (groupId: string) => {
    if (confirm('确定删除这个分组吗？分组内的资源会移到「未分组」。')) {
      deleteGroup(groupId);
      if (activeGroup === groupId) setActiveGroup(null);
    }
  };

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-[var(--color-fg)]">{t('nav.favorites')}</h1>
        <button className="btn btn-primary btn-sm" onClick={() => setShowCreateModal(true)}>
          <Icon name="Plus" size={16} />
          新建分组
        </button>
      </div>

      {favs.length === 0 ? (
        <EmptyState
          icon="Heart"
          title={t('common.empty')}
          hint={
            <button className="btn btn-primary btn-sm mt-3" onClick={() => navigate('/home')}>
              {t('home.browseCategories')}
            </button>
          }
        />
      ) : (
        <>
          {/* 分组标签栏 */}
          <div className="flex flex-wrap items-center gap-2">
            <button
              onClick={() => setActiveGroup(null)}
              className={`rounded-lg px-3 py-1.5 text-sm transition-colors ${
                activeGroup === null
                  ? 'bg-[var(--color-primary-soft)] text-[var(--color-primary)]'
                  : 'text-[var(--color-muted)] hover:bg-[var(--color-bg-soft)]'
              }`}
            >
              全部 ({ids.length})
            </button>
            <button
              onClick={() => setActiveGroup(null)}
              className={`rounded-lg px-3 py-1.5 text-sm transition-colors ${
                activeGroup === null && ungroupedCount > 0
                  ? 'bg-[var(--color-bg-soft)] text-[var(--color-fg)]'
                  : 'text-[var(--color-muted)] hover:bg-[var(--color-bg-soft)]'
              }`}
            >
              未分组 ({ungroupedCount})
            </button>
            {groups.map((g) => {
              const count = ids.filter((id) => groupAssignments[id] === g.id).length;
              return (
                <div key={g.id} className="group relative">
                  <button
                    onClick={() => setActiveGroup(g.id)}
                    className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm transition-colors ${
                      activeGroup === g.id
                        ? 'bg-[var(--color-primary-soft)] text-[var(--color-primary)]'
                        : 'text-[var(--color-muted)] hover:bg-[var(--color-bg-soft)]'
                    }`}
                  >
                    <span className="h-2 w-2 rounded-full" style={{ backgroundColor: g.color }} />
                    {g.name} ({count})
                  </button>
                  <div className="absolute right-0 top-full z-10 mt-1 hidden rounded-lg border border-[var(--color-border)] bg-[var(--color-bg)] p-1 shadow-lg group-hover:block">
                    <button
                      className="block w-full rounded px-3 py-1.5 text-left text-xs hover:bg-[var(--color-bg-soft)]"
                      onClick={() => { setEditingGroup(g.id); setEditName(g.name); }}
                    >
                      重命名
                    </button>
                    <button
                      className="block w-full rounded px-3 py-1.5 text-left text-xs text-[var(--color-danger)] hover:bg-[var(--color-bg-soft)]"
                      onClick={() => handleDelete(g.id)}
                    >
                      删除分组
                    </button>
                  </div>
                </div>
              );
            })}
          </div>

          {/* 资源列表 */}
          {currentResources.length === 0 ? (
            <EmptyState
              icon="Folder"
              title="这个分组还没有资源"
              hint={<span className="text-sm text-[var(--color-muted)]">在资源卡片上点击收藏，然后移动到分组</span>}
            />
          ) : (
            <div className="space-y-3">
              {currentResources.map((r) => (
                <div key={r.id} className="relative">
                  <ResourceList resources={[r]} />
                  <div className="absolute right-3 top-3 z-10">
                    <button
                      className="rounded-lg bg-[var(--color-bg)] p-1.5 text-xs text-[var(--color-muted)] shadow hover:text-[var(--color-primary)]"
                      onClick={() => setMoveTarget(r.id)}
                      title="移动到分组"
                    >
                      <Icon name="FolderMove" size={14} />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </>
      )}

      {/* 新建分组弹窗 */}
      <Modal open={showCreateModal} onClose={() => setShowCreateModal(false)} ariaLabel="新建分组">
        <div className="space-y-4">
          <h3 className="text-lg font-semibold">新建分组</h3>
          <div>
            <label className="mb-1.5 block text-sm font-medium">分组名称</label>
            <input
              type="text"
              value={newGroupName}
              onChange={(e) => setNewGroupName(e.target.value)}
              placeholder="如：常用API、备用聊天站"
              className="input w-full"
              autoFocus
            />
          </div>
          <div>
            <label className="mb-1.5 block text-sm font-medium">颜色</label>
            <div className="flex gap-2">
              {GROUP_COLORS.map((c) => (
                <button
                  key={c}
                  onClick={() => setNewGroupColor(c)}
                  className={`h-7 w-7 rounded-full transition-transform ${newGroupColor === c ? 'scale-110 ring-2 ring-offset-2' : ''}`}
                  style={{ backgroundColor: c, ['--tw-ring-color' as string]: c }}
                />
              ))}
            </div>
          </div>
          <div className="flex justify-end gap-2">
            <button className="btn btn-ghost btn-sm" onClick={() => setShowCreateModal(false)}>取消</button>
            <button className="btn btn-primary btn-sm" onClick={handleCreate}>创建</button>
          </div>
        </div>
      </Modal>

      {/* 重命名弹窗 */}
      <Modal open={!!editingGroup} onClose={() => setEditingGroup(null)} ariaLabel="重命名分组">
        <div className="space-y-4">
          <h3 className="text-lg font-semibold">重命名分组</h3>
          <input
            type="text"
            value={editName}
            onChange={(e) => setEditName(e.target.value)}
            className="input w-full"
            autoFocus
          />
          <div className="flex justify-end gap-2">
            <button className="btn btn-ghost btn-sm" onClick={() => setEditingGroup(null)}>取消</button>
            <button className="btn btn-primary btn-sm" onClick={handleRename}>保存</button>
          </div>
        </div>
      </Modal>

      {/* 移动到分组弹窗 */}
      <Modal open={!!moveTarget} onClose={() => setMoveTarget(null)} ariaLabel="移动到分组">
        <div className="space-y-2">
          <h3 className="mb-2 text-lg font-semibold">移动到分组</h3>
          <button
            className="w-full rounded-lg px-3 py-2 text-left text-sm hover:bg-[var(--color-bg-soft)]"
            onClick={() => { if (moveTarget) moveToGroup(moveTarget, null); setMoveTarget(null); }}
          >
            未分组
          </button>
          {groups.map((g) => (
            <button
              key={g.id}
              className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-sm hover:bg-[var(--color-bg-soft)]"
              onClick={() => { if (moveTarget) moveToGroup(moveTarget, g.id); setMoveTarget(null); }}
            >
              <span className="h-2 w-2 rounded-full" style={{ backgroundColor: g.color }} />
              {g.name}
            </button>
          ))}
          {groups.length === 0 && (
            <p className="py-4 text-center text-sm text-[var(--color-muted)]">还没有分组，先创建一个吧</p>
          )}
        </div>
      </Modal>
    </div>
  );
}
