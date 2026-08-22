import { render, screen, within } from '@testing-library/react';
import type { AnchorHTMLAttributes, ReactNode } from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const navigationMocks = vi.hoisted(() => ({
  hasInitialState: true,
  navigation: [] as Array<{
    meta: Record<string, unknown>;
    name: string;
    order: number;
    routeKey: string;
  }>,
}));

vi.mock('@umijs/max', () => ({
  Link: ({
    children,
    to,
    ...props
  }: AnchorHTMLAttributes<HTMLAnchorElement> & {
    children: ReactNode;
    to: string;
  }) => (
    <a {...props} href={to}>
      {children}
    </a>
  ),
  useModel: () => ({
    initialState: navigationMocks.hasInitialState
      ? { navigation: navigationMocks.navigation }
      : undefined,
  }),
}));

import AdminPage from '.';

beforeEach(() => {
  navigationMocks.hasInitialState = true;
  navigationMocks.navigation = [];
});

describe('AdminPage', () => {
  it('只投影 initialState navigation 中当前已注册的管理导航', () => {
    navigationMocks.navigation = [
      { meta: {}, name: '账号治理', order: 30, routeKey: 'admin.users' },
      { meta: {}, name: '未知入口', order: 1, routeKey: 'admin.unknown' },
      { meta: {}, name: '工作台', order: 2, routeKey: 'home' },
      { meta: {}, name: '管理概览', order: 10, routeKey: 'admin' },
    ];

    render(<AdminPage />);

    expect(screen.getByRole('heading', { name: '管理概览' })).toBeVisible();
    expect(screen.queryByText(/兼容直达路由|旧链接/)).not.toBeInTheDocument();

    const navigation = screen.getByRole('region', { name: '管理导航' });
    const status = screen.getByRole('region', { name: '平台状态' });
    expect(
      within(navigation).getByRole('link', { name: /管理概览/ }),
    ).toHaveAttribute('href', '/admin');
    expect(
      within(navigation).getByRole('link', { name: /账号治理/ }),
    ).toHaveAttribute('href', '/admin/users');
    expect(within(navigation).queryByText('未知入口')).not.toBeInTheDocument();
    expect(within(navigation).queryByText('工作台')).not.toBeInTheDocument();
    expect(within(status).getByText('当前没有真实数据')).toBeVisible();
    expect(screen.queryByRole('button')).not.toBeInTheDocument();
  });

  it('后端没有返回已知管理入口时 fail closed', () => {
    navigationMocks.navigation = [
      { meta: {}, name: '未知入口', order: 1, routeKey: 'admin.unknown' },
    ];

    render(<AdminPage />);

    expect(
      within(screen.getByRole('region', { name: '管理导航' })).getByText(
        '当前没有可见管理导航',
      ),
    ).toBeVisible();
    expect(screen.queryByRole('link')).not.toBeInTheDocument();
  });

  it('initialState 缺失时保留明确空态', () => {
    navigationMocks.hasInitialState = false;

    render(<AdminPage />);

    expect(screen.getByText('当前没有可见管理导航')).toBeVisible();
    expect(screen.queryByRole('link')).not.toBeInTheDocument();
  });

  it('后端返回缺少名称的已知管理入口时 fail closed', () => {
    navigationMocks.navigation = [
      {
        meta: {},
        name: undefined as unknown as string,
        order: 10,
        routeKey: 'admin',
      },
    ];

    render(<AdminPage />);

    expect(screen.getByText('当前没有可见管理导航')).toBeVisible();
    expect(screen.queryByRole('link')).not.toBeInTheDocument();
  });

  it('不显示旧版伪指标、风险和基础设施状态', () => {
    navigationMocks.navigation = [];
    render(<AdminPage />);

    for (const staleText of [
      '平台用户',
      '活跃工作区',
      '今日模型调用',
      'Object Storage 容量接近预警线',
      'PostgreSQL',
      'NATS',
    ]) {
      expect(screen.queryByText(staleText)).not.toBeInTheDocument();
    }
  });
});
