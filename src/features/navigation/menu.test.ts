import { describe, expect, it } from 'vitest';
import { buildMenuData } from './menu';
import { ROUTE_REGISTRY } from './registry';

function navigationItem(routeKey: string, title: string, sort: number) {
  return {
    meta: { opaqueLabel: `不参与菜单渲染-${title}` },
    name: title,
    order: 999 - sort,
    routeKey,
    sort,
  };
}

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
  it('普通用户 navigation 不生成管理端分组', () => {
    const userOnlyNavigation = [
      navigationItem('home', '工作台', 10),
      navigationItem('workspaces', '工作区', 20),
      navigationItem('audit', '审计看板', 30),
    ];

    expect(buildMenuData(userOnlyNavigation)).not.toContainEqual(
      expect.objectContaining({ name: '管理端' }),
    );
  });

  it('管理员 navigation 仅用投影中的真实管理路由生成管理端分组', () => {
    const adminNavigation = [
      navigationItem('home', '工作台', 10),
      navigationItem('admin', '管理概览', 20),
      navigationItem('admin.organization', '组织管理', 30),
      navigationItem('admin.users', '账号管理', 40),
    ];

    expect(buildMenuData(adminNavigation)).toContainEqual({
      children: [
        {
          icon: ROUTE_REGISTRY.admin.icon,
          key: 'admin',
          name: '管理概览',
          path: '/admin',
        },
        {
          icon: ROUTE_REGISTRY['admin.organization'].icon,
          key: 'admin.organization',
          name: '组织管理',
          path: '/admin/organization',
        },
        {
          icon: ROUTE_REGISTRY['admin.users'].icon,
          key: 'admin.users',
          name: '账号管理',
          path: '/admin/users',
        },
      ],
      key: 'group-admin',
      name: '管理端',
      type: 'group',
    });
  });

  it('过滤未知与 prototype key，按 sort 排序并保留不透明 meta', () => {
    const items = [
      navigationItem('admin.users', '账号管理', 4),
      navigationItem('admin', '管理概览', 8),
      navigationItem('tasks', '不应出现的任务原型', 1),
      navigationItem('constructor', '原型属性', 0),
      navigationItem('home', '首页', 6),
      navigationItem('ghost', '未知菜单', 2),
      navigationItem('workspaces', '工作区', 3),
    ];
    const original = structuredClone(items);

    expect(buildMenuData(items)).toEqual([
      {
        key: 'group-user',
        name: '用户端',
        type: 'group',
        children: [
          {
            key: 'workspaces',
            path: '/workspaces',
            name: '工作区',
            icon: ROUTE_REGISTRY.workspaces.icon,
          },
          {
            key: 'home',
            path: '/home',
            name: '首页',
            icon: ROUTE_REGISTRY.home.icon,
          },
        ],
      },
      {
        key: 'group-admin',
        name: '管理端',
        type: 'group',
        children: [
          {
            key: 'admin.users',
            path: '/admin/users',
            name: '账号管理',
            icon: ROUTE_REGISTRY['admin.users'].icon,
          },
          {
            key: 'admin',
            path: '/admin',
            name: '管理概览',
            icon: ROUTE_REGISTRY.admin.icon,
          },
        ],
      },
    ]);

    expect(items).toEqual(original);
  });

  it('prototype 即使被后端错误投影也不进入菜单', () => {
    expect(
      buildMenuData([
        navigationItem('tasks', '任务', 1),
        navigationItem('messages', '消息中心', 2),
        navigationItem('team-board', '团队看板', 3),
        navigationItem('admin.roles', '角色管理', 4),
        navigationItem('admin.menus', '菜单管理', 5),
        navigationItem('admin.models', '模型管理', 6),
        navigationItem('admin.skills', '技能管理', 7),
      ]),
    ).toEqual([]);
  });

  it('任意输入排列都只由 sort 决定分组内顺序', () => {
    const items = [
      navigationItem('admin', '管理概览', 50),
      navigationItem('home', '首页', 20),
      navigationItem('admin.users', '账号管理', 30),
      navigationItem('admin.organization', '组织管理', 25),
      navigationItem('workspaces', '工作区', 10),
    ];

    for (const permutation of permutations(items)) {
      const groupChildren = buildMenuData(permutation).map((group) =>
        group.children?.map(({ key }) => key),
      );

      expect(
        groupChildren,
        permutation.map(({ routeKey }) => routeKey).join(', '),
      ).toEqual([
        ['workspaces', 'home'],
        ['admin.organization', 'admin.users', 'admin'],
      ]);
    }
  });
});
