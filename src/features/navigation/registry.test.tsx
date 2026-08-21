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
import { isValidElement, type JSXElementConstructor } from 'react';
import { describe, expect, it } from 'vitest';
import { APP_PATHS } from '@/constants/route';
import {
  findRouteRegistration,
  getRouteRegistration,
  isRouteKey,
  ROUTE_REGISTRY,
  type RouteKey,
} from './registry';

const expectedRoutes = {
  login: {
    access: 'public',
    kind: 'page',
    path: '/login',
  },
  bootstrap: {
    access: 'public',
    kind: 'page',
    path: '/bootstrap',
  },
  app: {
    access: 'session',
    kind: 'parent',
    path: '/',
  },
  root: {
    access: 'session',
    kind: 'redirect',
    path: '/',
    redirectTo: '/home',
  },
  home: {
    access: 'session',
    group: 'user',
    kind: 'page',
    path: '/home',
  },
  tasks: {
    access: 'session',
    group: 'user',
    kind: 'page',
    path: '/tasks',
  },
  'tasks.archived': {
    access: 'session',
    group: null,
    kind: 'redirect',
    parent: 'tasks',
    path: '/tasks/archived',
    redirectTo: '/tasks?view=archived',
  },
  'tasks.detail': {
    access: 'session',
    kind: 'page',
    parent: 'tasks',
    path: '/tasks/:taskId',
  },
  workspaces: {
    access: 'session',
    group: 'user',
    kind: 'page',
    path: '/workspaces',
  },
  messages: {
    access: 'session',
    group: 'user',
    kind: 'page',
    path: '/messages',
  },
  'team-board': {
    access: 'session',
    group: 'user',
    kind: 'page',
    path: '/team-board',
  },
  audit: {
    access: 'session',
    group: 'user',
    kind: 'page',
    path: '/audit',
  },
  admin: {
    access: 'session',
    group: 'admin',
    kind: 'page',
    path: '/admin',
  },
  'admin.workspaces': {
    access: 'session',
    group: 'admin',
    kind: 'page',
    path: '/admin/workspaces',
  },
  'admin.organization': {
    access: 'session',
    group: 'admin',
    kind: 'page',
    path: '/admin/organization',
  },
  'admin.skills': {
    access: 'session',
    group: 'admin',
    kind: 'page',
    path: '/admin/skills',
  },
  'admin.models': {
    access: 'session',
    group: 'admin',
    kind: 'page',
    path: '/admin/models',
  },
  'admin.roles': {
    access: 'session',
    group: 'admin',
    kind: 'page',
    path: '/admin/roles',
  },
  'admin.users': {
    access: 'session',
    group: 'admin',
    kind: 'page',
    path: '/admin/users',
  },
  'admin.grants': {
    access: 'session',
    group: 'admin',
    kind: 'page',
    path: '/admin/grants',
  },
  'admin.policies': {
    access: 'session',
    group: 'admin',
    kind: 'page',
    path: '/admin/policies',
  },
  'admin.menus': {
    access: 'session',
    group: 'admin',
    kind: 'page',
    path: '/admin/menus',
  },
  'access-denied': {
    access: 'session',
    kind: 'page',
    path: '/403',
  },
} as const;

const expectedIcons: Partial<Record<RouteKey, JSXElementConstructor<object>>> =
  {
    home: HomeOutlined,
    tasks: UnorderedListOutlined,
    workspaces: AppstoreOutlined,
    messages: BellOutlined,
    'team-board': BarChartOutlined,
    audit: AuditOutlined,
    admin: ControlOutlined,
    'admin.workspaces': ClusterOutlined,
    'admin.organization': ApartmentOutlined,
    'admin.skills': ReadOutlined,
    'admin.models': RobotOutlined,
    'admin.roles': SafetyCertificateOutlined,
    'admin.users': TeamOutlined,
    'admin.grants': KeyOutlined,
    'admin.policies': SlidersOutlined,
    'admin.menus': MenuOutlined,
  };

describe('ROUTE_REGISTRY', () => {
  it('为 config 中全部 public、parent、redirect、page 路由提供精确语义', () => {
    expect(Object.keys(ROUTE_REGISTRY)).toEqual(Object.keys(expectedRoutes));

    for (const [key, expected] of Object.entries(expectedRoutes)) {
      expect(getRouteRegistration(key), key).toMatchObject(expected);
    }

    expect(APP_PATHS).toMatchObject({
      adminGrants: '/admin/grants',
      adminPolicies: '/admin/policies',
      adminUsers: '/admin/users',
      home: '/home',
      teamBoard: '/team-board',
      tasks: '/tasks',
    });
  });

  it('锁定 19 个产品屏幕，并为具体页面提供唯一路径', () => {
    const screenEntries = Object.entries(ROUTE_REGISTRY).filter(
      ([routeKey, registration]) =>
        routeKey !== 'bootstrap' && registration.kind === 'page',
    );
    const concretePaths = screenEntries
      .map(([, registration]) => registration.path)
      .filter((path) => !path.includes(':'));

    expect(screenEntries.map(([routeKey]) => routeKey)).toEqual([
      'login',
      'home',
      'tasks',
      'tasks.detail',
      'workspaces',
      'messages',
      'team-board',
      'audit',
      'admin',
      'admin.workspaces',
      'admin.organization',
      'admin.skills',
      'admin.models',
      'admin.roles',
      'admin.users',
      'admin.grants',
      'admin.policies',
      'admin.menus',
      'access-denied',
    ]);
    expect(new Set(concretePaths).size).toBe(concretePaths.length);
  });

  it('只接受对象自身的 dotted key，拒绝旧 camelCase、未知值和原型属性', () => {
    expect(isRouteKey('admin.users')).toBe(true);
    expect(getRouteRegistration('admin.users')).toBe(
      ROUTE_REGISTRY['admin.users'],
    );
    expect(isRouteKey('adminUsers')).toBe(false);
    expect(isRouteKey('ghost')).toBe(false);
    expect(isRouteKey('constructor')).toBe(false);
    expect(getRouteRegistration('ghost')).toBeUndefined();
    expect(getRouteRegistration('constructor')).toBeUndefined();
  });

  it('为菜单候选页提供 Ant Design 图标，内部路由不伪装成菜单项', () => {
    for (const [routeKey, Icon] of Object.entries(expectedIcons)) {
      const registration = getRouteRegistration(routeKey);

      expect(isValidElement(registration?.icon), routeKey).toBe(true);
      if (isValidElement(registration?.icon)) {
        expect(registration.icon.type).toBe(Icon);
      }
    }

    expect(ROUTE_REGISTRY.login).toMatchObject({ group: null, icon: null });
    expect(ROUTE_REGISTRY.app).toMatchObject({ group: null, icon: null });
    expect(ROUTE_REGISTRY.root).toMatchObject({ group: null, icon: null });
    expect(ROUTE_REGISTRY['tasks.detail']).toMatchObject({
      group: null,
      icon: null,
    });
    expect(ROUTE_REGISTRY['tasks.archived']).toMatchObject({
      icon: null,
      kind: 'redirect',
      menu: false,
      redirectTo: '/tasks?view=archived',
    });
    expect(ROUTE_REGISTRY.admin).toMatchObject({
      menu: false,
      path: '/admin',
    });
    for (const routeKey of [
      'tasks',
      'messages',
      'team-board',
      'admin.workspaces',
      'admin.organization',
      'admin.skills',
      'admin.models',
      'admin.roles',
      'admin.users',
      'admin.grants',
      'admin.policies',
      'admin.menus',
    ] as const) {
      expect(ROUTE_REGISTRY[routeKey], routeKey).toMatchObject({ menu: true });
    }
  });

  it('优先匹配静态归档路由，再匹配动态任务详情，并拒绝未登记路径', () => {
    expect(findRouteRegistration('/tasks/archived')).toMatchObject({
      routeKey: 'tasks.archived',
    });
    expect(findRouteRegistration('/tasks/task-42')).toMatchObject({
      routeKey: 'tasks.detail',
    });
    expect(findRouteRegistration('/admin/users')).toMatchObject({
      routeKey: 'admin.users',
    });
    expect(findRouteRegistration('/admin/organization')).toMatchObject({
      routeKey: 'admin.organization',
    });
    expect(findRouteRegistration('/admin/grants')).toMatchObject({
      routeKey: 'admin.grants',
    });
    expect(findRouteRegistration('/admin/policies')).toMatchObject({
      routeKey: 'admin.policies',
    });
    expect(findRouteRegistration('/not-registered')).toBeUndefined();
  });
});
