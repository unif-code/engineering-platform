import type { NavigationItem } from '@/services/navigation';

const ROUTE_PATHS: Record<string, string> = {
  home: '/home',
  admin: '/admin',
};

export function buildMenuData(
  items: NavigationItem[],
): Array<{ path: string; name: string }> {
  return [...items]
    .sort((first, second) => first.order - second.order)
    .flatMap((item) => {
      if (!Object.hasOwn(ROUTE_PATHS, item.routeKey)) {
        return [];
      }
      const path = ROUTE_PATHS[item.routeKey];
      return [{ path, name: item.name }];
    });
}
