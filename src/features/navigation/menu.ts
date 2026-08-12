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

const ARCHITECTURE_MENU_NAMES: Partial<Record<string, string>> = {
  'admin.grants': 'Grant 管理（新增）',
  'admin.organization': '组织管理（新增）',
  'admin.policies': 'Policy 发布（新增）',
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
      .map(({ item, registration }) => ({
        key: item.routeKey,
        name: ARCHITECTURE_MENU_NAMES[item.routeKey] ?? item.name,
        path: registration.path,
        icon: registration.icon,
      }));

    return children.length === 0
      ? []
      : [{ key, name, type: 'group', children }];
  });
}
