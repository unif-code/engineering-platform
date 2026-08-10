import type { RouteKey } from '@/features/navigation';

export interface MenuRow {
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
  key: string;
  name: string;
  path: string;
  group: MenuGroup;
  order: number;
  visible: boolean;
}
