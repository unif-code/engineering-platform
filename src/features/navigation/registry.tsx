import {
  ApartmentOutlined,
  AppstoreOutlined,
  AuditOutlined,
  BarChartOutlined,
  BellOutlined,
  ClusterOutlined,
  ControlOutlined,
  HomeOutlined,
  KeyOutlined,
  MenuOutlined,
  ReadOutlined,
  RobotOutlined,
  SafetyCertificateOutlined,
  SlidersOutlined,
  TeamOutlined,
  UnorderedListOutlined,
} from '@ant-design/icons';
import type React from 'react';
import { APP_PATHS } from '@/constants/route';

export type NavigationGroupKey = 'user' | 'admin';
export type RouteAccess = 'public' | 'session';
export type RouteKind = 'page' | 'parent' | 'redirect';

export interface RouteRegistration {
  access: RouteAccess;
  group: NavigationGroupKey | null;
  icon: React.ReactNode | null;
  kind: RouteKind;
  menu: boolean;
  parent: string | null;
  path: string;
  redirectTo: string | null;
}

export const ROUTE_REGISTRY = {
  login: {
    access: 'public',
    group: null,
    icon: null,
    kind: 'page',
    menu: false,
    parent: null,
    path: '/login',
    redirectTo: null,
  },
  bootstrap: {
    access: 'public',
    group: null,
    icon: null,
    kind: 'page',
    menu: false,
    parent: null,
    path: '/bootstrap',
    redirectTo: null,
  },
  app: {
    access: 'session',
    group: null,
    icon: null,
    kind: 'parent',
    menu: false,
    parent: null,
    path: '/',
    redirectTo: null,
  },
  root: {
    access: 'session',
    group: null,
    icon: null,
    kind: 'redirect',
    menu: false,
    parent: 'app',
    path: '/',
    redirectTo: APP_PATHS.home,
  },
  home: {
    access: 'session',
    group: 'user',
    icon: <HomeOutlined />,
    kind: 'page',
    menu: true,
    parent: 'app',
    path: APP_PATHS.home,
    redirectTo: null,
  },
  tasks: {
    access: 'session',
    group: 'user',
    icon: <UnorderedListOutlined />,
    kind: 'page',
    menu: true,
    parent: 'app',
    path: APP_PATHS.tasks,
    redirectTo: null,
  },
  'tasks.detail': {
    access: 'session',
    group: null,
    icon: null,
    kind: 'page',
    menu: false,
    parent: 'tasks',
    path: '/tasks/:taskId',
    redirectTo: null,
  },
  workspaces: {
    access: 'session',
    group: 'user',
    icon: <AppstoreOutlined />,
    kind: 'page',
    menu: true,
    parent: 'app',
    path: APP_PATHS.workspaces,
    redirectTo: null,
  },
  messages: {
    access: 'session',
    group: 'user',
    icon: <BellOutlined />,
    kind: 'page',
    menu: true,
    parent: 'app',
    path: APP_PATHS.messages,
    redirectTo: null,
  },
  'team-board': {
    access: 'session',
    group: 'user',
    icon: <BarChartOutlined />,
    kind: 'page',
    menu: true,
    parent: 'app',
    path: APP_PATHS.teamBoard,
    redirectTo: null,
  },
  audit: {
    access: 'session',
    group: 'user',
    icon: <AuditOutlined />,
    kind: 'page',
    menu: true,
    parent: 'app',
    path: APP_PATHS.audit,
    redirectTo: null,
  },
  admin: {
    access: 'session',
    group: 'admin',
    icon: <ControlOutlined />,
    kind: 'page',
    menu: false,
    parent: 'app',
    path: APP_PATHS.admin,
    redirectTo: null,
  },
  'admin.workspaces': {
    access: 'session',
    group: 'admin',
    icon: <ClusterOutlined />,
    kind: 'page',
    menu: true,
    parent: 'admin',
    path: APP_PATHS.adminWorkspaces,
    redirectTo: null,
  },
  'admin.organization': {
    access: 'session',
    group: 'admin',
    icon: <ApartmentOutlined />,
    kind: 'page',
    menu: true,
    parent: 'admin',
    path: APP_PATHS.adminOrganization,
    redirectTo: null,
  },
  'admin.skills': {
    access: 'session',
    group: 'admin',
    icon: <ReadOutlined />,
    kind: 'page',
    menu: true,
    parent: 'admin',
    path: APP_PATHS.adminSkills,
    redirectTo: null,
  },
  'admin.models': {
    access: 'session',
    group: 'admin',
    icon: <RobotOutlined />,
    kind: 'page',
    menu: true,
    parent: 'admin',
    path: APP_PATHS.adminModels,
    redirectTo: null,
  },
  'admin.roles': {
    access: 'session',
    group: 'admin',
    icon: <SafetyCertificateOutlined />,
    kind: 'page',
    menu: true,
    parent: 'admin',
    path: APP_PATHS.adminRoles,
    redirectTo: null,
  },
  'admin.users': {
    access: 'session',
    group: 'admin',
    icon: <TeamOutlined />,
    kind: 'page',
    menu: true,
    parent: 'admin',
    path: APP_PATHS.adminUsers,
    redirectTo: null,
  },
  'admin.grants': {
    access: 'session',
    group: 'admin',
    icon: <KeyOutlined />,
    kind: 'page',
    menu: true,
    parent: 'admin',
    path: APP_PATHS.adminGrants,
    redirectTo: null,
  },
  'admin.policies': {
    access: 'session',
    group: 'admin',
    icon: <SlidersOutlined />,
    kind: 'page',
    menu: true,
    parent: 'admin',
    path: APP_PATHS.adminPolicies,
    redirectTo: null,
  },
  'admin.menus': {
    access: 'session',
    group: 'admin',
    icon: <MenuOutlined />,
    kind: 'page',
    menu: true,
    parent: 'admin',
    path: APP_PATHS.adminMenus,
    redirectTo: null,
  },
  'access-denied': {
    access: 'session',
    group: null,
    icon: null,
    kind: 'page',
    menu: false,
    parent: 'app',
    path: '/403',
    redirectTo: null,
  },
} as const satisfies Record<string, RouteRegistration>;

export type RouteKey = keyof typeof ROUTE_REGISTRY;

export interface MatchedRouteRegistration {
  registration: RouteRegistration;
  routeKey: RouteKey;
}

export function isRouteKey(value: string): value is RouteKey {
  return Object.hasOwn(ROUTE_REGISTRY, value);
}

export function getRouteRegistration(
  value: string,
): RouteRegistration | undefined {
  return isRouteKey(value) ? ROUTE_REGISTRY[value] : undefined;
}

export function findRouteRegistration(
  pathname: string,
): MatchedRouteRegistration | undefined {
  for (const [routeKey, registration] of Object.entries(ROUTE_REGISTRY)) {
    if (registration.kind === 'parent') {
      continue;
    }
    if (matchesRegisteredPath(registration.path, pathname)) {
      return {
        registration,
        routeKey: routeKey as RouteKey,
      };
    }
  }
  return undefined;
}

function matchesRegisteredPath(pattern: string, pathname: string): boolean {
  const normalize = (value: string) =>
    value === '/' ? value : value.replace(/\/+$/, '');
  const patternSegments = normalize(pattern).split('/');
  const pathSegments = normalize(pathname).split('/');

  return (
    patternSegments.length === pathSegments.length &&
    patternSegments.every(
      (segment, index) =>
        (segment.startsWith(':') && pathSegments[index].length > 0) ||
        segment === pathSegments[index],
    )
  );
}
