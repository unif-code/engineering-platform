import { describe, expect, it } from 'vitest';
import routes from '../config/routes';
import { ROUTE_REGISTRY } from './features/navigation';

interface RouteConfig {
  access?: string;
  component?: string;
  hideInMenu?: boolean;
  layout?: boolean;
  name?: string;
  parentKeys?: string[];
  path?: string;
  redirect?: string;
  routes?: RouteConfig[];
  wrappers?: string[];
}

const expectedComponents = {
  '/login': './Login',
  '/home': './Home',
  '/tasks': './Tasks',
  '/tasks/archived': './Tasks/Archived',
  '/tasks/:taskId': './TaskDetail',
  '/workspaces': './Workspaces',
  '/messages': './Messages',
  '/team-board': './TeamBoard',
  '/audit': './Audit',
  '/admin': './Admin',
  '/admin/workspaces': './AdminWorkspaces',
  '/admin/skills': './AdminSkills',
  '/admin/models': './AdminModels',
  '/admin/roles': './AdminRoles',
  '/admin/users': './AdminUsers',
  '/admin/menus': './AdminMenus',
} as const;

const expectedAdminPaths = [
  '/admin',
  '/admin/workspaces',
  '/admin/skills',
  '/admin/models',
  '/admin/roles',
  '/admin/users',
  '/admin/menus',
] as const;

function collectRoutes(items: readonly RouteConfig[]): RouteConfig[] {
  return items.flatMap((route) => [
    route,
    ...collectRoutes(route.routes ?? []),
  ]);
}

const allRoutes = collectRoutes(routes);

function getRoute(path: string): RouteConfig {
  const route = allRoutes.find(
    (candidate) => candidate.path === path && candidate.component,
  );
  if (!route) {
    throw new Error(`Missing component route: ${path}`);
  }
  return route;
}

describe('route registry integration', () => {
  it('将全部页面绑定到精确且唯一的静态 component route', () => {
    const componentRoutes = allRoutes.filter(
      ({ component, path }) => component && path,
    );
    const components = Object.fromEntries(
      componentRoutes.map(({ component, path }) => [path, component]),
    );

    expect(componentRoutes).toHaveLength(16);
    expect(new Set(componentRoutes.map(({ path }) => path))).toHaveLength(16);
    expect(components).toEqual(expectedComponents);
  });

  it('使用工作台与管理概览的最终 route name', () => {
    expect(getRoute('/home').name).toBe('工作台');
    expect(getRoute('/admin').name).toBe('管理概览');
  });

  it('让 navigation Registry 的每条 path 都有静态页面路由', () => {
    const componentPaths = new Set(Object.keys(expectedComponents));

    expect(Object.values(ROUTE_REGISTRY).map(({ path }) => path)).toEqual([
      '/home',
      '/tasks',
      '/workspaces',
      '/messages',
      '/team-board',
      '/audit',
      '/admin',
      '/admin/workspaces',
      '/admin/skills',
      '/admin/models',
      '/admin/roles',
      '/admin/users',
      '/admin/menus',
    ]);
    for (const { path } of Object.values(ROUTE_REGISTRY)) {
      expect(componentPaths.has(path), path).toBe(true);
    }
  });

  it('登录页绕过布局，根路由受 RouteGuard 保护并重定向到工作台', () => {
    expect(getRoute('/login')).toMatchObject({ layout: false });

    const protectedRoot = routes.find(
      (route) => route.path === '/' && route.wrappers,
    );
    expect(protectedRoot?.wrappers).toEqual(['@/features/auth/RouteGuard']);
    expect(protectedRoot?.routes).toContainEqual({
      path: '/',
      redirect: '/home',
    });
  });

  it('全部七个管理端页面都绑定 canAccessAdmin', () => {
    const adminRoutes = allRoutes.filter(
      ({ component, path }) =>
        component && (path === '/admin' || path?.startsWith('/admin/')),
    );

    expect(adminRoutes.map(({ path }) => path)).toEqual(expectedAdminPaths);
    for (const route of adminRoutes) {
      expect(route.access, route.path).toBe('canAccessAdmin');
    }
  });

  it('让全部管理端页面保持为受 RouteGuard 保护的根路由子级', () => {
    const protectedRoot = routes.find(
      (route) =>
        route.path === '/' &&
        route.wrappers?.includes('@/features/auth/RouteGuard'),
    );
    const protectedAdminRoutes = (protectedRoot?.routes ?? []).filter(
      ({ component, path }) =>
        component && (path === '/admin' || path?.startsWith('/admin/')),
    );
    const topLevelAdminRoutes = routes.filter(
      ({ component, path }) =>
        component && (path === '/admin' || path?.startsWith('/admin/')),
    );

    expect(protectedAdminRoutes.map(({ path }) => path)).toEqual(
      expectedAdminPaths,
    );
    expect(topLevelAdminRoutes).toEqual([]);
  });

  it('归档与详情隐藏在任务父菜单下，且静态归档先于动态详情', () => {
    expect(getRoute('/tasks/archived')).toMatchObject({
      hideInMenu: true,
      parentKeys: ['/tasks'],
    });
    expect(getRoute('/tasks/:taskId')).toMatchObject({
      hideInMenu: true,
      parentKeys: ['/tasks'],
    });

    const protectedRoot = routes.find(
      (route) => route.path === '/' && route.routes,
    );
    const childPaths = protectedRoot?.routes?.map(({ path }) => path) ?? [];
    expect(childPaths.indexOf('/tasks/archived')).toBeLessThan(
      childPaths.indexOf('/tasks/:taskId'),
    );
  });
});
