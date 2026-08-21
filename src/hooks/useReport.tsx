import { useState } from 'react';
import { submitReport } from '@/lib/data';
import { ReportModal } from '@/components/ReportModal';

/**
 * 举报弹窗统一封装：管理开关状态 + 绑定提交逻辑。
 * ResourceCard / ResourceRow 共用，避免重复写 showReport state 与 onSubmit 包装。
 */
export function useReport(resource: { id: string; name: string }) {
  const [show, setShow] = useState(false);
  const node = show ? (
    <ReportModal
      resourceName={resource.name}
      resourceId={resource.id}
      onClose={() => setShow(false)}
      onSubmit={async (id, reason, note) => (await submitReport(id, reason, note)).ok}
    />
  ) : null;
  return { open: () => setShow(true), node };
}
