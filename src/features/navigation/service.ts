// 数据缝：后端计划 Task 8 的 OpenAPI Artifact 就绪后，由本仓 owner 执行 Task 10/11；
// 在 '@/services/navigation' 的 domain client 底层接入 '@/services/generated'。
// 本 Feature service、页面、hooks 与公开 Feature API 均无需改动。
import { getNavigation, type NavigationItem } from '@/services/navigation';

export async function fetchNavigation(): Promise<NavigationItem[]> {
  try {
    return await getNavigation();
  } catch {
    return [];
  }
}
