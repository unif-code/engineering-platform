// 数据缝：后端计划 Task 8 的 OpenAPI Artifact 就绪后，由本仓 owner 执行其 Task 10/11，
// 将当前调用切到 '@/services/generated'；页面、hooks 与公开 Feature API 不改。
import { getNavigation, type NavigationItem } from '@/services/navigation';

export async function fetchNavigation(): Promise<NavigationItem[]> {
  try {
    return await getNavigation();
  } catch {
    return [];
  }
}
