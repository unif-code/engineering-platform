import {
  AppstoreOutlined,
  AuditOutlined,
  BarChartOutlined,
  BellOutlined,
  ClusterOutlined,
  ControlOutlined,
  HomeOutlined,
  MenuOutlined,
  ReadOutlined,
  RobotOutlined,
  SafetyCertificateOutlined,
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
  prototype: boolean;
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
    prototype: false,
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
    prototype: false,
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
    prototype: false,
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
    prototype: false,
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
    prototype: false,
    redirectTo: null,
  },
  tasks: {
    access: 'session',
    group: 'user',
    icon: <UnorderedListOutlined />,
    kind: 'page',
    menu: false,
    parent: 'app',
    path: APP_PATHS.tasks,
    prototype: true,
    redirectTo: null,
  },
  'tasks.archived': {
    access: 'session',
    group: null,
    icon: null,
    kind: 'page',
    menu: false,
    parent: 'tasks',
    path: '/tasks/archived',
    prototype: true,
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
    prototype: true,
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
    prototype: false,
    redirectTo: null,
  },
  messages: {
    access: 'session',
    group: 'user',
    icon: <BellOutlined />,
    kind: 'page',
    menu: false,
    parent: 'app',
    path: APP_PATHS.messages,
    prototype: true,
    redirectTo: null,
  },
  'team-board': {
    access: 'session',
    group: 'user',
    icon: <BarChartOutlined />,
    kind: 'page',
    menu: false,
    parent: 'app',
    path: APP_PATHS.teamBoard,
    prototype: true,
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
    prototype: false,
    redirectTo: null,
  },
  admin: {
    access: 'session',
    group: 'admin',
    icon: <ControlOutlined />,
    kind: 'page',
    menu: true,
    parent: 'app',
    path: APP_PATHS.admin,
    prototype: false,
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
    prototype: false,
    redirectTo: null,
  },
  'admin.skills': {
    access: 'session',
    group: 'admin',
    icon: <ReadOutlined />,
    kind: 'page',
    menu: false,
    parent: 'admin',
    path: APP_PATHS.adminSkills,
    prototype: true,
    redirectTo: null,
  },
  'admin.models': {
    access: 'session',
    group: 'admin',
    icon: <RobotOutlined />,
    kind: 'page',
    menu: false,
    parent: 'admin',
    path: APP_PATHS.adminModels,
    prototype: true,
    redirectTo: null,
  },
  'admin.roles': {
    access: 'session',
    group: 'admin',
    icon: <SafetyCertificateOutlined />,
    kind: 'page',
    menu: false,
    parent: 'admin',
    path: APP_PATHS.adminRoles,
    prototype: true,
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
    prototype: false,
    redirectTo: null,
  },
  'admin.menus': {
    access: 'session',
    group: 'admin',
    icon: <MenuOutlined />,
    kind: 'page',
    menu: false,
    parent: 'admin',
    path: APP_PATHS.adminMenus,
    prototype: true,
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
