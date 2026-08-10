import { describe, expect, it } from 'vitest';
import { buildMenuData } from './menu';
import { ROUTE_REGISTRY } from './registry';

function permutations<T>(items: readonly T[]): T[][] {
  if (items.length <= 1) {
    return [[...items]];
  }

  return items.flatMap((item, index) =>
    permutations(items.filter((_, itemIndex) => itemIndex !== index)).map(
      (rest) => [item, ...rest],
    ),
  );
}

describe('buildMenuData', () => {
  it('过滤未知 key 后按分组和 order 输出菜单，且管理概览固定在管理组首位', () => {
    const items = [
      { routeKey: 'adminMenus', name: '菜单管理', order: 5 },
      { routeKey: 'tasks', name: '任务', order: 4 },
      { routeKey: 'admin', name: '管理概览', order: 99 },
      { routeKey: 'constructor', name: '原型属性', order: 0 },
      { routeKey: 'home', name: '首页', order: 2 },
      { routeKey: 'ghost', name: '未知菜单', order: 1 },
      { routeKey: 'adminUsers', name: '用户管理', order: 3 },
    ];
    const original = items.map((item) => ({ ...item }));

    expect(buildMenuData(items)).toEqual([
      {
        key: 'group-user',
        name: '用户端',
        type: 'group',
        children: [
          {
            key: 'home',
            path: '/home',
            name: '首页',
            icon: ROUTE_REGISTRY.home.icon,
          },
          {
            key: 'tasks',
            path: '/tasks',
            name: '任务',
            icon: ROUTE_REGISTRY.tasks.icon,
          },
        ],
      },
      {
        key: 'group-admin',
        name: '管理端',
        type: 'group',
        children: [
          {
            key: 'admin',
            path: '/admin',
            name: '管理概览',
            icon: ROUTE_REGISTRY.admin.icon,
          },
          {
            key: 'adminUsers',
            path: '/admin/users',
            name: '用户管理',
            icon: ROUTE_REGISTRY.adminUsers.icon,
          },
          {
            key: 'adminMenus',
            path: '/admin/menus',
            name: '菜单管理',
            icon: ROUTE_REGISTRY.adminMenus.icon,
          },
        ],
      },
    ]);

    expect(items).toEqual(original);
  });

  it('不输出空分组，未知 key 也不能借原型属性进入菜单', () => {
    expect(
      buildMenuData([
        { routeKey: 'home', name: '首页', order: 1 },
        { routeKey: 'ghost', name: '未知菜单', order: 2 },
        { routeKey: 'constructor', name: '原型属性', order: 3 },
      ]),
    ).toEqual([
      {
        key: 'group-user',
        name: '用户端',
        type: 'group',
        children: [
          {
            key: 'home',
            path: '/home',
            name: '首页',
            icon: ROUTE_REGISTRY.home.icon,
          },
        ],
      },
    ]);

    expect(
      buildMenuData([
        { routeKey: 'ghost', name: '未知菜单', order: 1 },
        { routeKey: 'constructor', name: '原型属性', order: 2 },
      ]),
    ).toEqual([]);
  });

  it('任意用户端与管理端混合排列都生成同一确定顺序', () => {
    const items = [
      { routeKey: 'admin', name: '管理概览', order: 99 },
      { routeKey: 'home', name: '首页', order: 2 },
      { routeKey: 'adminUsers', name: '用户管理', order: 3 },
      { routeKey: 'tasks', name: '任务', order: 4 },
      { routeKey: 'adminMenus', name: '菜单管理', order: 5 },
    ];

    for (const permutation of permutations(items)) {
      const groupChildren = buildMenuData(permutation).map((group) =>
        group.children?.map(({ key }) => key),
      );

      expect(
        groupChildren,
        permutation.map(({ routeKey }) => routeKey).join(', '),
      ).toEqual([
        ['home', 'tasks'],
        ['admin', 'adminUsers', 'adminMenus'],
      ]);
    }
  });
});
