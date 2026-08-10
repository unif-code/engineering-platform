import { request } from '@umijs/max';
import { normalizeApiError } from '@/services/transport';
import type { NavigationItem } from './type';

export async function getNavigation(): Promise<NavigationItem[]> {
  try {
    return await request<NavigationItem[]>('/api/v1/navigation', {
      method: 'GET',
    });
  } catch (error) {
    throw normalizeApiError(error);
  }
}

export type { NavigationItem } from './type';
