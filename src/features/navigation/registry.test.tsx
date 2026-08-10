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
import { isValidElement, type JSXElementConstructor } from 'react';
import { describe, expect, it } from 'vitest';
import { APP_PATHS, type RouteKey } from '@/constants/route';
import { getRouteRegistration, isRouteKey, ROUTE_REGISTRY } from './registry';

const expectedRoutes = {
  home: ['/home', 'user'],
  tasks: ['/tasks', 'user'],
  workspaces: ['/workspaces', 'user'],
  messages: ['/messages', 'user'],
  teamBoard: ['/team-board', 'user'],
  audit: ['/audit', 'user'],
  admin: ['/admin', 'admin'],
  adminWorkspaces: ['/admin/workspaces', 'admin'],
  adminSkills: ['/admin/skills', 'admin'],
  adminModels: ['/admin/models', 'admin'],
  adminRoles: ['/admin/roles', 'admin'],
  adminUsers: ['/admin/users', 'admin'],
  adminMenus: ['/admin/menus', 'admin'],
} as const;

const expectedIcons: Record<RouteKey, JSXElementConstructor<object>> = {
  home: HomeOutlined,
  tasks: UnorderedListOutlined,
  workspaces: AppstoreOutlined,
  messages: BellOutlined,
  teamBoard: BarChartOutlined,
  audit: AuditOutlined,
  admin: ControlOutlined,
  adminWorkspaces: ClusterOutlined,
  adminSkills: ReadOutlined,
  adminModels: RobotOutlined,
  adminRoles: SafetyCertificateOutlined,
  adminUsers: TeamOutlined,
  adminMenus: MenuOutlined,
};

describe('ROUTE_REGISTRY', () => {
  it('为全部已知 routeKey 提供固定 path、分组和 Ant Design 图标', () => {
    expect(Object.keys(ROUTE_REGISTRY)).toEqual(Object.keys(expectedRoutes));
    expect(APP_PATHS).toEqual(
      Object.fromEntries(
        Object.entries(expectedRoutes).map(([key, [path]]) => [key, path]),
      ),
    );

    for (const [key, [path, group]] of Object.entries(expectedRoutes)) {
      const routeKey = key as RouteKey;
      const registration = getRouteRegistration(routeKey);

      expect(registration).toMatchObject({ path, group });
      expect(isValidElement(registration?.icon)).toBe(true);
      if (isValidElement(registration?.icon)) {
        expect(registration.icon.type).toBe(expectedIcons[routeKey]);
      }
    }
  });

  it('只接受对象自身的已知 key，拒绝未知值和原型属性', () => {
    expect(isRouteKey('home')).toBe(true);
    expect(getRouteRegistration('home')).toBe(ROUTE_REGISTRY.home);
    expect(isRouteKey('ghost')).toBe(false);
    expect(isRouteKey('constructor')).toBe(false);
    expect(getRouteRegistration('ghost')).toBeUndefined();
    expect(getRouteRegistration('constructor')).toBeUndefined();
  });

  it('不把任务子路由误注册为后端 navigation routeKey', () => {
    const paths = Object.values(ROUTE_REGISTRY).map(({ path }) => path);

    expect(paths).not.toContain('/tasks/archived');
    expect(paths).not.toContain('/tasks/:taskId');
  });
});
