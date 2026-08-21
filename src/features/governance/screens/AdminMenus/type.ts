import type { ReactNode } from 'react';
import type { NavigationGroupKey, RouteKey } from '@/features/navigation';

export interface MenuRow {
  group: NavigationGroupKey;
  icon: ReactNode;
  key: RouteKey;
  name: string;
  order: number;
  path: string;
}
