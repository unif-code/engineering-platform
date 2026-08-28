import { render, screen, within } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import type { InitialState } from '@/app';

const mocks = vi.hoisted(() => ({
  initialState: {
    capabilities: [],
    navigation: [],
    principal: null,
    scopedCapabilities: [],
    workspaces: [],
  } as InitialState | undefined,
}));

vi.mock('@umijs/max', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@umijs/max')>()),
  useModel: () => ({ initialState: mocks.initialState }),
}));

import AdminMenusPage from '.';

const navigationItem = (routeKey: string, name: string, order: number) => ({
  meta: {},
  name,
  order,
  routeKey,
});

afterEach(() => {
  mocks.initialState = {
    capabilities: [],
    navigation: [],
    principal: null,
    scopedCapabilities: [],
    workspaces: [],
  };
});

describe('AdminMenusPage', () => {
  it('只读呈现真实 navigation 中的已知菜单并对未知 routeKey fail closed', () => {
    mocks.initialState = {
      capabilities: [],
      navigation: [
        navigationItem('admin.users', '账号管理（服务端）', 30),
        navigationItem('ghost', '幽灵菜单', 1),
        navigationItem('home', '工作台（服务端）', 10),
      ],
      principal: null,
      scopedCapabilities: [],
      workspaces: [],
    };

    render(<AdminMenusPage />);

    expect(screen.getByRole('button', { name: '新增菜单' })).toMatchObject({
      disabled: true,
      title: '当前版本暂未接入',
    });
    const table = screen.getByRole('table');
    expect(
      within(table)
        .getAllByRole('columnheader')
        .map((header) => header.textContent),
    ).toEqual(['', '菜单', '分组', '可见条件', '状态', '操作']);
    expect(
      within(table).getByRole('row', { name: /工作台（服务端）/ }),
    ).toBeVisible();
    expect(
      within(table).getByRole('row', { name: /账号管理（服务端）/ }),
    ).toBeVisible();
    expect(screen.queryByText('幽灵菜单')).not.toBeInTheDocument();
    expect(screen.queryByRole('switch')).not.toBeInTheDocument();
    expect(screen.queryByRole('link')).not.toBeInTheDocument();
    expect(screen.getAllByText('—')).toHaveLength(4);
  });

  it('navigation 为空时保留列头并明确没有真实数据', () => {
    render(<AdminMenusPage />);

    expect(screen.getByRole('table')).toBeVisible();
    expect(screen.getByText('当前没有真实数据')).toBeVisible();
  });

  it('initialState 缺失时保留只读空表', () => {
    mocks.initialState = undefined;

    render(<AdminMenusPage />);

    expect(screen.getByRole('table')).toBeVisible();
    expect(screen.getByText('当前没有真实数据')).toBeVisible();
  });
});
