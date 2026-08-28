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
  requirements: {
    access: 'session',
    group: 'user',
    kind: 'page',
    path: '/requirements',
  },
  'requirements.detail': {
    access: 'session',
    kind: 'page',
    parent: 'requirements',
    path: '/requirements/:requirementId',
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
    requirements: UnorderedListOutlined,
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
      requirements: '/requirements',
    });
  });

  it('锁定 19 个产品屏幕，并为具体页面提供唯一路径', () => {
    const screenEntries = Object.entries(ROUTE_REGISTRY).filter(
      ([routeKey, registration]) =>
        routeKey !== 'bootstrap' && registration.kind === 'page',
    );
    const screenPaths = screenEntries.map(
      ([, registration]) => registration.path,
    );

    expect(screenEntries.map(([routeKey]) => routeKey)).toEqual([
      'login',
      'home',
      'requirements',
      'requirements.detail',
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
    expect(new Set(screenPaths).size).toBe(screenPaths.length);
  });

  it('只接受对象自身的 dotted key，拒绝旧 camelCase、未知值和原型属性', () => {
    expect(isRouteKey('admin.users')).toBe(true);
    expect(getRouteRegistration('admin.users')).toBe(
      ROUTE_REGISTRY['admin.users'],
    );
    expect(isRouteKey('adminUsers')).toBe(false);
    expect(isRouteKey('requirements.archived')).toBe(false);
    expect(isRouteKey('tasks')).toBe(false);
    expect(isRouteKey('tasks.detail')).toBe(false);
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
    expect(ROUTE_REGISTRY['requirements.detail']).toMatchObject({
      group: null,
      icon: null,
    });
    expect(ROUTE_REGISTRY.admin).toMatchObject({
      menu: true,
      path: '/admin',
    });
    for (const routeKey of [
      'admin',
      'requirements',
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

  it('不注册旧 Task 与归档 routeKey，动态 Requirement 详情按唯一页面匹配', () => {
    expect(getRouteRegistration('requirements.archived')).toBeUndefined();
    expect(getRouteRegistration('tasks')).toBeUndefined();
    expect(getRouteRegistration('tasks.detail')).toBeUndefined();
    expect(findRouteRegistration('/tasks')).toBeUndefined();
    expect(findRouteRegistration('/tasks/task-42')).toBeUndefined();
    expect(findRouteRegistration('/requirements/archived')).toMatchObject({
      routeKey: 'requirements.detail',
    });
    expect(findRouteRegistration('/requirements/requirement-42')).toMatchObject(
      {
        routeKey: 'requirements.detail',
      },
    );
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
