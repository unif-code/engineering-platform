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

const GROUP_RANK: Record<NavigationGroupKey, number> = {
  user: 0,
  admin: 1,
};

function compareNavigationItems(
  first: RegisteredNavigationItem,
  second: RegisteredNavigationItem,
): number {
  const groupDifference =
    GROUP_RANK[first.registration.group] -
    GROUP_RANK[second.registration.group];
  if (groupDifference !== 0) {
    return groupDifference;
  }

  if (
    first.registration.group === 'admin' &&
    second.registration.group === 'admin'
  ) {
    if (first.item.routeKey === 'admin') {
      return second.item.routeKey === 'admin' ? 0 : -1;
    }
    if (second.item.routeKey === 'admin') {
      return 1;
    }
  }

  const orderDifference = first.item.order - second.item.order;
  if (orderDifference !== 0) {
    return orderDifference;
  }

  if (first.item.routeKey === second.item.routeKey) {
    return 0;
  }

  return first.item.routeKey < second.item.routeKey ? -1 : 1;
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
