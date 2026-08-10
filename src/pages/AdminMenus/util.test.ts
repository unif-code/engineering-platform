import { afterEach, describe, expect, it, vi } from 'vitest';
import { ROUTE_REGISTRY } from '@/features/navigation';
import { MENU_ROWS } from './constant';
import type { MenuQueryParams } from './type';
import { queryMenuRows } from './util';

const EXPECTED_MENUS = [
  {
    group: 'user',
    key: 'home',
    name: '工作台',
    order: 1,
    path: '/home',
  },
  {
    group: 'user',
    key: 'tasks',
    name: '任务',
    order: 2,
    path: '/tasks',
  },
  {
    group: 'user',
    key: 'workspaces',
    name: '工作区',
    order: 3,
    path: '/workspaces',
  },
  {
    group: 'user',
    key: 'messages',
    name: '消息中心',
    order: 4,
    path: '/messages',
  },
  {
    group: 'user',
    key: 'teamBoard',
    name: '团队看板',
    order: 5,
    path: '/team-board',
  },
  {
    group: 'user',
    key: 'audit',
    name: '审计看板',
    order: 6,
    path: '/audit',
  },
  {
    group: 'admin',
    key: 'admin',
    name: '管理概览',
    order: 7,
    path: '/admin',
  },
  {
    group: 'admin',
    key: 'adminWorkspaces',
    name: '工作区管理',
    order: 8,
    path: '/admin/workspaces',
  },
  {
    group: 'admin',
    key: 'adminSkills',
    name: '技能管理',
    order: 9,
    path: '/admin/skills',
  },
  {
    group: 'admin',
    key: 'adminModels',
    name: '模型管理',
    order: 10,
    path: '/admin/models',
  },
  {
    group: 'admin',
    key: 'adminRoles',
    name: '角色管理',
    order: 11,
    path: '/admin/roles',
  },
  {
    group: 'admin',
    key: 'adminUsers',
    name: '用户管理',
    order: 12,
    path: '/admin/users',
  },
  {
    group: 'admin',
    key: 'adminMenus',
    name: '菜单管理',
    order: 13,
    path: '/admin/menus',
  },
] as const;

async function runQuery(
  params: MenuQueryParams = {},
  sort: Record<string, 'ascend' | 'descend' | null> = {},
  filter: Record<string, Array<number | string> | null> = {},
) {
  return queryMenuRows(params, sort, filter);
}

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('MENU_ROWS', () => {
  it('与公共 ROUTE_REGISTRY 的 13 个 key、path 和 group 精确一一对应', () => {
    expect(
      MENU_ROWS.map(({ group, key, name, order, path }) => ({
        group,
        key,
        name,
        order,
        path,
      })),
    ).toEqual(EXPECTED_MENUS);
    expect(Object.keys(ROUTE_REGISTRY)).toEqual(
      EXPECTED_MENUS.map(({ key }) => key),
    );

    for (const menu of EXPECTED_MENUS) {
      expect(ROUTE_REGISTRY[menu.key]).toMatchObject({
        group: menu.group,
        path: menu.path,
      });
    }
  });
});

describe('queryMenuRows', () => {
  it('按 user 与 admin 分组筛选并默认保持 group + order 顺序', async () => {
    const userResult = await runQuery({
      current: 1,
      group: 'user',
      pageSize: 20,
      visible: 'all',
    });
    const adminResult = await runQuery({
      current: 1,
      group: 'admin',
      pageSize: 20,
      visible: 'all',
    });

    expect(userResult.data?.map((row) => row.key)).toEqual([
      'home',
      'tasks',
      'workspaces',
      'messages',
      'teamBoard',
      'audit',
    ]);
    expect(userResult.total).toBe(6);
    expect(adminResult.data?.map((row) => row.key)).toEqual([
      'admin',
      'adminWorkspaces',
      'adminSkills',
      'adminModels',
      'adminRoles',
      'adminUsers',
      'adminMenus',
    ]);
    expect(adminResult.total).toBe(7);
  });

  it('在分组内按 order 升序或降序排序', async () => {
    const ascending = await runQuery(
      { current: 1, group: 'admin', pageSize: 20 },
      { order: 'ascend' },
    );
    const descending = await runQuery(
      { current: 1, group: 'admin', pageSize: 20 },
      { order: 'descend' },
    );

    expect(ascending.data?.map((row) => row.order)).toEqual([
      7, 8, 9, 10, 11, 12, 13,
    ]);
    expect(descending.data?.map((row) => row.order)).toEqual([
      13, 12, 11, 10, 9, 8, 7,
    ]);
  });

  it('按 visible 筛选显示或隐藏菜单并返回正确 total', async () => {
    const visible = await runQuery({
      current: 1,
      pageSize: 20,
      visible: 'visible',
    });
    const hidden = await runQuery({
      current: 1,
      pageSize: 20,
      visible: 'hidden',
    });

    expect(visible.data?.map((row) => row.key)).toEqual(
      EXPECTED_MENUS.map(({ key }) => key),
    );
    expect(visible.total).toBe(13);
    expect(hidden).toEqual({ data: [], success: true, total: 0 });
  });

  it('排序后按 current 和 pageSize 分页并保留筛选后的 total', async () => {
    const result = await runQuery(
      { current: 2, group: 'all', pageSize: 5, visible: 'all' },
      { order: 'ascend' },
    );

    expect(result.data?.map((row) => row.key)).toEqual([
      'audit',
      'admin',
      'adminWorkspaces',
      'adminSkills',
      'adminModels',
    ]);
    expect(result.total).toBe(13);
  });

  it('不修改冻结 fixture，并且每次返回新的数据数组', async () => {
    const before = MENU_ROWS.map((row) => ({ ...row }));

    expect(Object.isFrozen(MENU_ROWS)).toBe(true);
    expect(MENU_ROWS.every((row) => Object.isFrozen(row))).toBe(true);

    const first = await runQuery(
      { current: 1, pageSize: 20 },
      { order: 'descend' },
    );
    const second = await runQuery({ current: 1, pageSize: 20 });

    expect(MENU_ROWS).toEqual(before);
    expect(first.data).not.toBe(MENU_ROWS);
    expect(second.data).not.toBe(first.data);
  });

  it('纯本地查询不会调用 global fetch', async () => {
    const fetchSpy = vi.fn();
    vi.stubGlobal('fetch', fetchSpy);

    await runQuery({
      current: 1,
      group: 'admin',
      pageSize: 20,
      visible: 'visible',
    });

    expect(fetchSpy).not.toHaveBeenCalled();
  });
});
