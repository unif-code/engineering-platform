export { APP_PATHS, type RouteKey } from '@/constants/route';
export type { NavigationItem } from '@/services/navigation';
export { buildMenuData } from './menu';
export {
  getRouteRegistration,
  isRouteKey,
  type NavigationGroupKey,
  ROUTE_REGISTRY,
  type RouteRegistration,
} from './registry';
export { fetchNavigation } from './service';
