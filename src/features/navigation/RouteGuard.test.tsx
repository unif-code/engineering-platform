import { createEmployeeNo } from '@root/tests/auth-fixtures';
import { render, screen } from '@testing-library/react';
import { App } from 'antd';
import { act, type ComponentType, type ReactNode } from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  error: undefined as Error | undefined,
  initialState: {
    capabilities: ['identity.account.manage'],
    navigation: [] as Array<{
      meta: Record<string, unknown>;
      name: string;
      order: number;
      routeKey: string;
    }>,
    principal: null as null | {
      accountId: string | null;
      employeeId: string;
      name: string;
    },
    scopedCapabilities: [],
    workspaces: [],
  },
  location: {
    hash: '',
    pathname: '/home',
    search: '',
  },
  outlet: null as ReactNode,
  request: vi.fn(),
}));

vi.mock('@umijs/max', () => ({
  Navigate: ({ replace, to }: { replace?: boolean; to: string }) => (
    <div data-replace={String(replace)} data-testid="navigate">
      {to}
    </div>
  ),
  Link: ({
    children,
    className,
    to,
  }: {
    children: ReactNode;
    className?: string;
    to: string;
  }) => (
    <a className={className} href={to}>
      {children}
    </a>
  ),
  Outlet: () => mocks.outlet ?? <div data-testid="outlet" />,
  request: mocks.request,
  useLocation: () => mocks.location,
  useModel: () => ({ error: mocks.error, initialState: mocks.initialState }),
  useParams: () => ({ requirementId: 'REQUIREMENT-42' }),
}));

vi.mock('@ant-design/charts', () => ({
  Bar: () => <div data-ant-design-chart="bar" />,
  Column: () => <div data-ant-design-chart="column" />,
}));

import AdminPage from '@/pages/Admin';
import AdminMenusPage from '@/pages/AdminMenus';
import AdminModelsPage from '@/pages/AdminModels';
import AdminRolesPage from '@/pages/AdminRoles';
import AdminSkillsPage from '@/pages/AdminSkills';
import MessagesPage from '@/pages/Messages';
import TeamBoardPage from '@/pages/TeamBoard';
import RouteGuard from './RouteGuard';

const navigationItem = (routeKey: string) => ({
  meta: { opaque: true },
  name: routeKey,
  order: 999,
  routeKey,
});

beforeEach(() => {
  mocks.error = undefined;
  mocks.initialState = {
    capabilities: ['identity.account.manage'],
    navigation: [],
    principal: {
      accountId: null,
      employeeId: createEmployeeNo(),
      name: '平台用户',
    },
    scopedCapabilities: [],
    workspaces: [],
  };
  mocks.location = { hash: '', pathname: '/home', search: '' };
  mocks.outlet = null;
  mocks.request.mockReset();
});

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('RouteGuard', () => {
  it('Session Bootstrap 非认证故障时 fail closed，不误跳登录', () => {
    mocks.error = new Error('Session 服务暂不可用');

    render(<RouteGuard />);

    expect(screen.getByText('Session 初始化失败')).toBeInTheDocument();
    expect(screen.queryByTestId('navigate')).not.toBeInTheDocument();
    expect(screen.queryByTestId('outlet')).not.toBeInTheDocument();
  });

  it('未登录时 replace 到登录页并携带当前站内回跳地址', () => {
    mocks.initialState.principal = null;
    mocks.location = {
      hash: '#history',
      pathname: '/audit',
      search: '?actor=00000001',
    };

    render(<RouteGuard />);

    expect(screen.getByTestId('navigate')).toHaveTextContent(
      '/login?redirect=%2Faudit%3Factor%3D00000001%23history',
    );
    expect(screen.getByTestId('navigate')).toHaveAttribute(
      'data-replace',
      'true',
    );
  });

  it('routeKey 在服务端 navigation 投影中时渲染路由内容', () => {
    mocks.location.pathname = '/admin/users';
    mocks.initialState.navigation = [navigationItem('admin.users')];

    render(<RouteGuard />);

    expect(screen.getByTestId('outlet')).toBeInTheDocument();
  });

  it('navigation 缺 admin.users 时复用 AccessDenied 视觉', () => {
    mocks.location.pathname = '/admin/users';
    mocks.initialState.navigation = [navigationItem('home')];

    render(<RouteGuard />);

    expect(screen.getByText('无权访问')).toBeInTheDocument();
    expect(
      screen.getByText('当前账号没有访问此页面的能力，请联系管理员。'),
    ).toBeInTheDocument();
    expect(screen.getByRole('link', { name: '返回工作台' })).toHaveAttribute(
      'href',
      '/home',
    );
    expect(screen.queryByTestId('outlet')).not.toBeInTheDocument();
  });

  it('未登记路径 fail closed 并复用 AccessDenied 视觉', () => {
    mocks.location.pathname = '/not-registered';

    render(<RouteGuard />);

    expect(screen.getByText('无权访问')).toBeInTheDocument();
    expect(screen.queryByTestId('outlet')).not.toBeInTheDocument();
  });

  it('固定的 access-denied 路由不依赖 navigation 授权', () => {
    mocks.location.pathname = '/403';

    render(<RouteGuard />);

    expect(screen.getByTestId('outlet')).toBeInTheDocument();
  });

  it('Requirement 详情仅继承已激活的父 requirements 入口', () => {
    mocks.location.pathname = '/requirements/REQUIREMENT-42';
    mocks.initialState.navigation = [navigationItem('requirements')];

    render(<RouteGuard />);

    expect(screen.getByTestId('outlet')).toBeInTheDocument();
  });

  it('只有隐藏详情 routeKey 而没有父入口时仍 fail closed', () => {
    mocks.location.pathname = '/requirements/REQUIREMENT-42';
    mocks.initialState.navigation = [navigationItem('requirements.detail')];

    render(<RouteGuard />);

    expect(screen.getByText('无权访问')).toBeInTheDocument();
    expect(screen.queryByTestId('outlet')).not.toBeInTheDocument();
  });

  it.each<{
    findPage: () => Promise<HTMLElement>;
    Page: ComponentType;
    path: string;
    routeKey: string;
  }>([
    {
      findPage: () => screen.findByRole('radiogroup', { name: '消息分类' }),
      Page: MessagesPage,
      path: '/messages',
      routeKey: 'messages',
    },
    {
      findPage: () => screen.findByRole('radiogroup', { name: '团队范围' }),
      Page: TeamBoardPage,
      path: '/team-board',
      routeKey: 'team-board',
    },
    {
      findPage: () => screen.findByRole('region', { name: '管理导航' }),
      Page: AdminPage,
      path: '/admin',
      routeKey: 'admin',
    },
    {
      findPage: () => screen.findByRole('region', { name: '技能目录' }),
      Page: AdminSkillsPage,
      path: '/admin/skills',
      routeKey: 'admin.skills',
    },
    {
      findPage: () => screen.findByRole('tab', { name: '模型目录' }),
      Page: AdminModelsPage,
      path: '/admin/models',
      routeKey: 'admin.models',
    },
    {
      findPage: () => screen.findByRole('navigation', { name: '角色列表' }),
      Page: AdminRolesPage,
      path: '/admin/roles',
      routeKey: 'admin.roles',
    },
    {
      findPage: () => screen.findByRole('button', { name: '新增菜单' }),
      Page: AdminMenusPage,
      path: '/admin/menus',
      routeKey: 'admin.menus',
    },
  ])(
    '$routeKey 仅在 navigation 授权后可直达，且真实页面无 /api/v1 请求',
    async ({ findPage, Page, path, routeKey }) => {
      const fetchSpy = vi.fn();
      vi.stubGlobal('fetch', fetchSpy);
      mocks.initialState.navigation = [navigationItem(routeKey)];
      mocks.location.pathname = path;
      mocks.outlet = (
        <App>
          <Page />
        </App>
      );

      render(<RouteGuard />);

      expect(await findPage()).toBeVisible();
      await act(async () => undefined);
      expect(
        fetchSpy.mock.calls.filter(([input]) =>
          String(input).includes('/api/v1'),
        ),
      ).toEqual([]);
      expect(
        mocks.request.mock.calls.filter(([input]) =>
          String(input).includes('/api/v1'),
        ),
      ).toEqual([]);
    },
  );
});
