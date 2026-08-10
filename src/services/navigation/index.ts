import { request } from '@umijs/max';
import { resolveApiEnvelope } from '@/services/transport';
import type { ApiEnvelope } from '@/types/api';
import type { NavigationItem } from './type';

export async function getNavigation(): Promise<NavigationItem[]> {
  return resolveApiEnvelope(
    request<ApiEnvelope<NavigationItem[]>>('/api/v1/navigation', {
      method: 'GET',
    }),
  );
}

export type { NavigationItem } from './type';
