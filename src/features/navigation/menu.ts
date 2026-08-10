import type { MenuDataItem } from '@ant-design/pro-components';
import type { NavigationItem } from '@/services/navigation';
import {
  getRouteRegistration,
  isRouteKey,
  type NavigationGroupKey,
  type RouteRegistration,
} from './registry';

interface RegisteredNavigationItem {
  item: NavigationItem;
  registration: RouteRegistration;
}

const GROUPS: Array<{
  group: NavigationGroupKey;
  key: string;
  name: string;
}> = [
  { group: 'user', key: 'group-user', name: '用户端' },
  { group: 'admin', key: 'group-admin', name: '管理端' },
];

function compareNavigationItems(
  first: RegisteredNavigationItem,
  second: RegisteredNavigationItem,
): number {
  if (first.registration.group === 'admin') {
    if (first.item.routeKey === 'admin') {
      return second.item.routeKey === 'admin' ? 0 : -1;
    }
    if (second.item.routeKey === 'admin') {
      return 1;
    }
  }

  return first.item.order - second.item.order;
}

export function buildMenuData(items: NavigationItem[]): MenuDataItem[] {
  const registeredItems = [...items]
    .filter((item) => isRouteKey(item.routeKey))
    .flatMap<RegisteredNavigationItem>((item) => {
      const registration = getRouteRegistration(item.routeKey);
      return registration ? [{ item, registration }] : [];
    })
    .sort(compareNavigationItems);

  return GROUPS.flatMap<MenuDataItem>(({ group, key, name }) => {
    const children = registeredItems
      .filter(({ registration }) => registration.group === group)
      .map(({ item, registration }) => ({
        key: item.routeKey,
        name: item.name,
        path: registration.path,
        icon: registration.icon,
      }));

    return children.length === 0
      ? []
      : [{ key, name, type: 'group', children }];
  });
}
