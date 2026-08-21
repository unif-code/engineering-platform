import {
  getRouteRegistration,
  isRouteKey,
  type NavigationGroupKey,
  type NavigationItem,
  type RouteKey,
} from '@/features/navigation';
import type { MenuRow } from './type';

const GROUP_RANK: Record<NavigationGroupKey, number> = {
  user: 0,
  admin: 1,
};

interface RegisteredMenu {
  group: NavigationGroupKey;
  icon: MenuRow['icon'];
  key: RouteKey;
  name: string;
  order: number;
  path: string;
}

function compareMenuRows(left: RegisteredMenu, right: RegisteredMenu): number {
  const groupDifference = GROUP_RANK[left.group] - GROUP_RANK[right.group];
  if (groupDifference !== 0) {
    return groupDifference;
  }

  const orderDifference = left.order - right.order;
  if (orderDifference !== 0) {
    return orderDifference;
  }

  return left.key.localeCompare(right.key);
}

export function projectNavigationToMenuRows(
  navigation: NavigationItem[],
): MenuRow[] {
  return navigation
    .flatMap<RegisteredMenu>((item) => {
      if (!isRouteKey(item.routeKey)) {
        return [];
      }

      const registration = getRouteRegistration(item.routeKey);
      if (!registration?.menu || registration.group === null) {
        return [];
      }

      return [
        {
          group: registration.group,
          icon: registration.icon,
          key: item.routeKey,
          name: item.name,
          order: item.sort,
          path: registration.path,
        },
      ];
    })
    .sort(compareMenuRows);
}
