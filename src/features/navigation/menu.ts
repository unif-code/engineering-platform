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
  registration: RouteRegistration & { group: NavigationGroupKey };
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

const PROTOTYPE_BADGED_ROUTE_KEYS = new Set([
  'admin.grants',
  'admin.organization',
  'admin.policies',
]);

function readUnreadCount(meta: Record<string, unknown>): number | undefined {
  const unreadCount = meta.unreadCount;
  return typeof unreadCount === 'number' &&
    Number.isSafeInteger(unreadCount) &&
    unreadCount > 0
    ? unreadCount
    : undefined;
}

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

  const sortDifference = first.item.sort - second.item.sort;
  if (sortDifference !== 0) {
    return sortDifference;
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
      return registration?.menu && registration.group !== null
        ? [
            {
              item,
              registration: registration as RouteRegistration & {
                group: NavigationGroupKey;
              },
            },
          ]
        : [];
    })
    .sort(compareNavigationItems);

  return GROUPS.flatMap<MenuDataItem>(({ group, key, name }) => {
    const children = registeredItems
      .filter(({ registration }) => registration.group === group)
      .map(({ item, registration }) => {
        const unreadCount = readUnreadCount(item.meta);
        return {
          key: item.routeKey,
          name: item.name,
          path: registration.path,
          icon: registration.icon,
          ...(PROTOTYPE_BADGED_ROUTE_KEYS.has(item.routeKey)
            ? { prototypeBadge: '新增' }
            : {}),
          ...(unreadCount === undefined ? {} : { unreadCount }),
        };
      });

    return children.length === 0
      ? []
      : [{ key, name, type: 'group', children }];
  });
}
