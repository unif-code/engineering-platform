// 数据缝：V0.2 Task 10 锁定 api-v0.2.0 OpenAPI Artifact 后，
// 在 '@/services/navigation' 的 domain client 底层接入 '@/services/generated'。
// 本 Feature service、页面、hooks 与公开 Feature API 均无需改动。
import { getNavigation, type NavigationItem } from '@/services/navigation';

export async function fetchNavigation(): Promise<NavigationItem[]> {
  return getNavigation();
}
