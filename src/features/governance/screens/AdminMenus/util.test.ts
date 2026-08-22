import { describe, expect, it } from 'vitest';
import type { NavigationItem } from '@/features/navigation';
import { projectNavigationToMenuRows } from './util';

const navigationItem = (
  routeKey: string,
  name: string,
  order: number,
): NavigationItem => ({ meta: {}, name, order, routeKey });

describe('projectNavigationToMenuRows', () => {
  it('仅投影已注册的可见菜单并使用服务端名称与顺序', () => {
    const source = [
      navigationItem('admin.users', '真实账号管理', 30),
      navigationItem('ghost', '未知菜单', 1),
      navigationItem('home', '真实工作台', 10),
      navigationItem('tasks.detail', '任务详情', 2),
    ];

    expect(projectNavigationToMenuRows(source)).toMatchObject([
      { group: 'user', key: 'home', name: '真实工作台', order: 10 },
      {
        group: 'admin',
        key: 'admin.users',
        name: '真实账号管理',
        order: 30,
      },
    ]);
    expect(source.map((item) => item.routeKey)).toEqual([
      'admin.users',
      'ghost',
      'home',
      'tasks.detail',
    ]);
  });

  it('同组同序时按 routeKey 稳定排序', () => {
    expect(
      projectNavigationToMenuRows([
        navigationItem('tasks', '任务', 10),
        navigationItem('home', '工作台', 10),
      ]).map((row) => row.key),
    ).toEqual(['home', 'tasks']);
  });

  it('同组菜单使用服务端 order 排序', () => {
    expect(
      projectNavigationToMenuRows([
        navigationItem('tasks', '任务', 30),
        navigationItem('home', '工作台', 10),
      ]).map((row) => row.key),
    ).toEqual(['home', 'tasks']);
  });
});
