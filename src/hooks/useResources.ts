import { useEffect, useState } from 'react';
import { getResources, type ResourceQuery } from '@/lib/data';
import type { Resource } from '@/lib/types';

/**
 * 统一资源加载：query 变化自动重新拉取。
 * 内部用 JSON 序列化做 effect 依赖，避免调用方每次渲染传入新对象引用导致反复加载。
 * 首页/榜单/分类/搜索/场景/收藏/我的 等页面复用同一套「加载 + 卸载防竞态」逻辑。
 */
export function useResources(query: ResourceQuery = {}): { resources: Resource[]; loading: boolean } {
  const key = JSON.stringify(query);
  const [resources, setResources] = useState<Resource[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let m = true;
    setLoading(true);
    getResources(JSON.parse(key) as ResourceQuery).then((list) => {
      if (m) {
        setResources(list);
        setLoading(false);
      }
    });
    return () => {
      m = false;
    };
  }, [key]);

  return { resources, loading };
}
