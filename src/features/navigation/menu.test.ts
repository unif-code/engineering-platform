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
  it('仅给三个架构新增页面追加菜单标识', () => {
    const groups = buildMenuData([
      navigationItem('admin.workspaces', '工作区管理', 10),
      navigationItem('admin.organization', '组织管理', 20),
      navigationItem('admin.grants', 'Grant 管理', 30),
      navigationItem('admin.policies', 'Policy 发布', 40),
    ]);

    expect(groups[0]?.children?.map(({ name }) => name)).toEqual([
      '工作区管理',
      '组织管理（新增）',
      'Grant 管理（新增）',
      'Policy 发布（新增）',
    ]);
  });

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
      navigationItem('admin.workspaces', '工作区管理', 25),
      navigationItem('admin.organization', '组织管理', 30),
      navigationItem('admin.grants', 'Grant 管理', 35),
      navigationItem('admin.policies', 'Policy 发布', 37),
      navigationItem('admin.users', '账号管理', 40),
    ];

    expect(buildMenuData(adminNavigation)).toContainEqual({
      children: [
        {
          icon: ROUTE_REGISTRY['admin.workspaces'].icon,
          key: 'admin.workspaces',
          name: '工作区管理',
          path: '/admin/workspaces',
        },
        {
          icon: ROUTE_REGISTRY['admin.organization'].icon,
          key: 'admin.organization',
          name: '组织管理（新增）',
          path: '/admin/organization',
        },
        {
          icon: ROUTE_REGISTRY['admin.grants'].icon,
          key: 'admin.grants',
          name: 'Grant 管理（新增）',
          path: '/admin/grants',
        },
        {
          icon: ROUTE_REGISTRY['admin.policies'].icon,
          key: 'admin.policies',
          name: 'Policy 发布（新增）',
          path: '/admin/policies',
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

  it('管理概览只保留兼容路由，工作区管理优先于组织管理', () => {
    expect(
      buildMenuData([
        navigationItem('admin', '管理概览', 10),
        navigationItem('admin.organization', '组织管理', 30),
        navigationItem('admin.workspaces', '工作区管理', 20),
      ]),
    ).toEqual([
      {
        children: [
          {
            icon: ROUTE_REGISTRY['admin.workspaces'].icon,
            key: 'admin.workspaces',
            name: '工作区管理',
            path: '/admin/workspaces',
          },
          {
            icon: ROUTE_REGISTRY['admin.organization'].icon,
            key: 'admin.organization',
            name: '组织管理（新增）',
            path: '/admin/organization',
          },
        ],
        key: 'group-admin',
        name: '管理端',
        type: 'group',
      },
    ]);
  });

  it('过滤未知与非菜单 key，按 sort 排序并保留不透明 meta', () => {
    const items = [
      navigationItem('admin.users', '账号管理', 4),
      navigationItem('admin', '管理概览', 8),
      navigationItem('tasks.detail', '不应出现的任务详情', 1),
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
        ],
      },
    ]);

    expect(items).toEqual(original);
  });

  it('原型标记不影响明确声明的独立菜单项', () => {
    expect(
      buildMenuData([
        navigationItem('tasks', '任务', 1),
        navigationItem('tasks.archived', '归档数据', 2),
        navigationItem('messages', '消息中心', 3),
        navigationItem('team-board', '团队看板', 4),
        navigationItem('admin.skills', '技能管理', 5),
        navigationItem('admin.models', '模型管理', 6),
        navigationItem('admin.roles', '角色管理', 7),
        navigationItem('admin.menus', '菜单管理', 8),
      ]),
    ).toEqual([
      {
        children: [
          {
            icon: ROUTE_REGISTRY.tasks.icon,
            key: 'tasks',
            name: '任务',
            path: '/tasks',
          },
          {
            icon: ROUTE_REGISTRY['tasks.archived'].icon,
            key: 'tasks.archived',
            name: '归档数据',
            path: '/tasks/archived',
          },
          {
            icon: ROUTE_REGISTRY.messages.icon,
            key: 'messages',
            name: '消息中心',
            path: '/messages',
          },
          {
            icon: ROUTE_REGISTRY['team-board'].icon,
            key: 'team-board',
            name: '团队看板',
            path: '/team-board',
          },
        ],
        key: 'group-user',
        name: '用户端',
        type: 'group',
      },
      {
        children: [
          {
            icon: ROUTE_REGISTRY['admin.skills'].icon,
            key: 'admin.skills',
            name: '技能管理',
            path: '/admin/skills',
          },
          {
            icon: ROUTE_REGISTRY['admin.models'].icon,
            key: 'admin.models',
            name: '模型管理',
            path: '/admin/models',
          },
          {
            icon: ROUTE_REGISTRY['admin.roles'].icon,
            key: 'admin.roles',
            name: '角色管理',
            path: '/admin/roles',
          },
          {
            icon: ROUTE_REGISTRY['admin.menus'].icon,
            key: 'admin.menus',
            name: '菜单管理',
            path: '/admin/menus',
          },
        ],
        key: 'group-admin',
        name: '管理端',
        type: 'group',
      },
    ]);
  });

  it('任意输入排列都只由 sort 决定分组内顺序', () => {
    const items = [
      navigationItem('admin', '管理概览', 50),
      navigationItem('home', '首页', 20),
      navigationItem('admin.users', '账号管理', 30),
      navigationItem('admin.grants', 'Grant 管理', 28),
      navigationItem('admin.policies', 'Policy 发布', 29),
      navigationItem('admin.workspaces', '工作区管理', 24),
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
        [
          'admin.workspaces',
          'admin.organization',
          'admin.grants',
          'admin.policies',
          'admin.users',
        ],
      ]);
    }
  });
});
