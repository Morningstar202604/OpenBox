/**
 * localStorage 安全读写——全站唯一入口。
 * 收敛此前散落 12 处的 try/catch + JSON.parse/setItem 样板：
 * 隐私模式/配额满/JSON 损坏统一在此降级，调用方不再各自兜底。
 */

/** 读取并反序列化；键不存在或解析失败返回 fallback，绝不抛异常 */
export function readJSON<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key);
    if (raw === null) return fallback;
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

/** 序列化写入；成功返回 true，存储不可用/超配额返回 false（配额满时先删旧值重试一次） */
export function writeJSON(key: string, value: unknown): boolean {
  try {
    localStorage.setItem(key, JSON.stringify(value));
    return true;
  } catch {
    try {
      // 二次尝试：超配额常见于旧数据堆积，去掉本键后重写
      localStorage.removeItem(key);
      localStorage.setItem(key, JSON.stringify(value));
      return true;
    } catch {
      return false;
    }
  }
}

/** 读取原始字符串（非 JSON 场景）；不可用返回 null */
export function readRaw(key: string): string | null {
  try {
    return localStorage.getItem(key);
  } catch {
    return null;
  }
}

/** 写入原始字符串；成功返回 true */
export function writeRaw(key: string, value: string): boolean {
  try {
    localStorage.setItem(key, value);
    return true;
  } catch {
    return false;
  }
}
