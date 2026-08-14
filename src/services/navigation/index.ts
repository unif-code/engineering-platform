import { api } from '@/services/generated';
import { requireApiData } from '@/services/transport';
import type { NavigationItem } from './type';

export async function getNavigation(): Promise<NavigationItem[]> {
  return requireApiData(await api.GET('/api/v1/navigation')).map((item) => ({
    ...item,
    meta: item.meta ?? {},
    sort: item.order,
  }));
}

export type { NavigationItem } from './type';
