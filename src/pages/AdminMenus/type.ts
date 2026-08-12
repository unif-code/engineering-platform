import type { ReactNode } from 'react';
import type { RouteKey } from '@/features/navigation';

export interface MenuRow {
  capability: string;
  icon: ReactNode;
  isNew?: boolean;
  key: RouteKey;
  name: string;
  path: string;
  group: 'user' | 'admin';
  order: number;
  visible: boolean;
}

export type MenuGroup = MenuRow['group'];
export type MenuVisibility = 'all' | 'visible' | 'hidden';

export interface MenuQueryParams {
  current?: number;
  pageSize?: number;
  group?: MenuGroup | 'all';
  visible?: MenuVisibility;
}

export interface MenuFormValues {
  capability: string;
  group?: MenuGroup;
  name: string;
  order?: number;
  path?: string;
}
