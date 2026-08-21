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
  routeKey?: string;
  routes?: RouteConfig[];
  wrappers?: string[];
}

const expectedComponents = {
  '/login': './Login',
  '/bootstrap': './Bootstrap',
  '/home': './Home',
  '/tasks': './Tasks',
  '/tasks/:taskId': './TaskDetail',
  '/workspaces': './Workspaces',
  '/messages': './Messages',
  '/team-board': './TeamBoard',
  '/audit': './Audit',
  '/admin': './Admin',
  '/admin/organization': './AdminOrganization',
  '/admin/workspaces': './AdminWorkspaces',
  '/admin/skills': './AdminSkills',
  '/admin/models': './AdminModels',
  '/admin/roles': './AdminRoles',
  '/admin/users': './AdminUsers',
  '/admin/grants': './AdminGrants',
  '/admin/policies': './AdminPolicies',
  '/admin/menus': './AdminMenus',
  '/403': './AccessDenied',
} as const;

const expectedAdminPaths = [
  '/admin',
  '/admin/workspaces',
  '/admin/organization',
  '/admin/skills',
  '/admin/models',
  '/admin/roles',
  '/admin/users',
  '/admin/grants',
  '/admin/policies',
  '/admin/menus',
] as const;

function collectRoutes(items: readonly RouteConfig[]): RouteConfig[] {
  return items.flatMap((route) => [
    route,
    ...collectRoutes(route.routes ?? []),
  ]);
}

const allRoutes = collectRoutes(routes);

function getComponentRoute(path: string): RouteConfig {
  const route = allRoutes.find(
    (candidate) => candidate.path === path && candidate.component,
  );
  if (!route) {
    throw new Error(`Missing component route: ${path}`);
  }
  return route;
}

function getRedirectRoute(path: string): RouteConfig {
  const route = allRoutes.find(
    (candidate) => candidate.path === path && candidate.redirect,
  );
  if (!route) {
    throw new Error(`Missing redirect route: ${path}`);
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

    expect(componentRoutes).toHaveLength(20);
    expect(new Set(componentRoutes.map(({ path }) => path))).toHaveLength(20);
    expect(components).toEqual(expectedComponents);
  });

  it('使用工作台与管理概览的最终 route name', () => {
    expect(getComponentRoute('/home').name).toBe('工作台');
    expect(getComponentRoute('/admin').name).toBe('管理概览');
  });

  it('config 的 23 条 public、parent、redirect、page route 与 Registry 一一对应', () => {
    expect(allRoutes).toHaveLength(23);
    expect(allRoutes.every(({ routeKey }) => routeKey)).toBe(true);
    expect(allRoutes.map(({ routeKey }) => routeKey)).toEqual(
      Object.keys(ROUTE_REGISTRY),
    );
    expect(new Set(allRoutes.map(({ routeKey }) => routeKey))).toHaveLength(23);

    for (const route of allRoutes) {
      const registration =
        ROUTE_REGISTRY[route.routeKey as keyof typeof ROUTE_REGISTRY];
      expect(registration.path, route.routeKey).toBe(route.path);
      expect(registration.kind, route.routeKey).toBe(
        route.component ? 'page' : route.redirect ? 'redirect' : 'parent',
      );
      if (route.redirect) {
        expect(registration.redirectTo, route.routeKey).toBe(route.redirect);
      }
    }
  });

  it('登录与初始化页公开且绕过布局，根父路由受统一 RouteGuard 保护', () => {
    expect(
      allRoutes
        .filter(({ component, layout }) => component && layout === false)
        .map(({ path }) => path),
    ).toEqual(['/login', '/bootstrap']);
    expect(ROUTE_REGISTRY.login.access).toBe('public');
    expect(ROUTE_REGISTRY.bootstrap.access).toBe('public');

    const protectedRoot = routes.find(
      (route) => route.path === '/' && route.wrappers,
    );
    expect(protectedRoot?.wrappers).toEqual([
      '@/features/navigation/RouteGuard',
    ]);
    expect(protectedRoot?.routes).toContainEqual(
      expect.objectContaining({
        path: '/',
        redirect: '/home',
        routeKey: 'root',
      }),
    );
    expect(ROUTE_REGISTRY.app).toMatchObject({
      access: 'session',
      kind: 'parent',
    });
    expect(ROUTE_REGISTRY.root).toMatchObject({
      access: 'session',
      kind: 'redirect',
      redirectTo: '/home',
    });
  });

  it('管理路由不再绑定 plugin-layout access，由父 RouteGuard 统一判定', () => {
    const adminRoutes = allRoutes.filter(
      ({ component, path }) =>
        component && (path === '/admin' || path?.startsWith('/admin/')),
    );

    expect(adminRoutes.map(({ path }) => path)).toEqual(expectedAdminPaths);
    expect(adminRoutes.every(({ access }) => access === undefined)).toBe(true);

    const protectedRoot = routes.find(
      (route) =>
        route.path === '/' &&
        route.wrappers?.includes('@/features/navigation/RouteGuard'),
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

  it('归档仅作为兼容跳转，且位于动态详情之前', () => {
    expect(getRedirectRoute('/tasks/archived')).toMatchObject({
      redirect: '/tasks?view=archived',
      routeKey: 'tasks.archived',
    });
    expect(getComponentRoute('/tasks/:taskId')).toMatchObject({
      hideInMenu: true,
      parentKeys: ['/tasks'],
      routeKey: 'tasks.detail',
    });
    expect(ROUTE_REGISTRY['tasks.archived']).toMatchObject({
      kind: 'redirect',
      menu: false,
      redirectTo: '/tasks?view=archived',
    });
    expect(ROUTE_REGISTRY['tasks.detail'].parent).toBe('tasks');

    const protectedRoot = routes.find(
      (route) => route.path === '/' && route.routes,
    );
    const childPaths = protectedRoot?.routes?.map(({ path }) => path) ?? [];
    expect(childPaths.indexOf('/tasks/archived')).toBeLessThan(
      childPaths.indexOf('/tasks/:taskId'),
    );
  });
});
