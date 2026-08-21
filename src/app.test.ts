import { createEmployeeNo } from '@root/tests/auth-fixtures';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { theme } from 'antd';
import type { ReactNode } from 'react';
import { Children, createElement, isValidElement } from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import defaultSettings from '../config/defaultSettings';
import proxy from '../config/proxy';

const featureMocks = vi.hoisted(() => ({
  fetchMe: vi.fn(),
  fetchNavigation: vi.fn(),
  logout: vi.fn(),
  push: vi.fn(),
  replace: vi.fn(),
  setAntdConfig: vi.fn(),
}));

vi.mock('@umijs/max', () => ({
  history: {
    location: {
      hash: '#member',
      pathname: '/admin/users',
      search: '?status=enabled',
    },
    push: featureMocks.push,
    replace: featureMocks.replace,
  },
  useAntdConfigSetter: () => featureMocks.setAntdConfig,
}));

vi.mock('@/features/auth', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@/features/auth')>()),
  fetchMe: featureMocks.fetchMe,
  logout: featureMocks.logout,
}));

vi.mock('@/features/navigation', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@/features/navigation')>()),
  fetchNavigation: featureMocks.fetchNavigation,
}));

import { usePlatformTheme } from '@/features/theme';
import {
  createApiClient,
  normalizeApiError,
  onUnauthorized,
} from '@/services/transport';
import { antd, getInitialState, layout, request, rootContainer } from './app';

beforeEach(() => {
  featureMocks.fetchMe.mockReset();
  featureMocks.fetchNavigation.mockReset();
  featureMocks.logout.mockReset();
  featureMocks.push.mockReset();
  featureMocks.replace.mockReset();
  featureMocks.setAntdConfig.mockReset();
  featureMocks.logout.mockResolvedValue(undefined);
  delete window.__ENGINEERING_PLATFORM_THEME__;
});

afterEach(() => {
  vi.unstubAllGlobals();
  onUnauthorized(() => undefined);
});

describe('request runtime before layout registration', () => {
  it('401 缺少 URL 时调用安全的初始通知，并归一异常输入形状', () => {
    const errorHandler = request.errorConfig?.errorHandler;

    expect(() =>
      errorHandler?.(
        { response: { data: null, status: 401 } } as never,
        {} as never,
      ),
    ).toThrowError(expect.objectContaining({ name: 'ApiError' }));
    expect(featureMocks.replace).not.toHaveBeenCalled();

    for (const failure of [
      null,
      {},
      { config: null, response: null },
      { config: { url: 42 }, response: { status: '401' } },
    ]) {
      expect(() => errorHandler?.(failure as never, {} as never)).toThrowError(
        expect.objectContaining({ name: 'ApiError' }),
      );
    }
  });
});

describe('local development proxy', () => {
  it('将同源 API 请求转发到 localhost:8080 且保留浏览器 Host', () => {
    expect(proxy.dev).toEqual({
      '/api/': {
        changeOrigin: false,
        target: 'http://localhost:8080',
      },
    });
  });
});

describe('getInitialState', () => {
  it('聚合 auth 与 navigation Feature 的精确结果', async () => {
    const employeeId = createEmployeeNo();
    const me = {
      capabilities: ['identity.account.manage', 'audit.read'],
      employeeId,
      name: '平台管理员',
    };
    const navigation = [
      {
        meta: { section: 'workspace' },
        name: '首页',
        order: 1,
        routeKey: 'home',
      },
    ];
    featureMocks.fetchMe.mockResolvedValue(me);
    featureMocks.fetchNavigation.mockResolvedValue(navigation);

    await expect(getInitialState()).resolves.toEqual({
      capabilities: me.capabilities,
      navigation,
      principal: { employeeId, name: '平台管理员' },
    });
    expect(featureMocks.fetchMe).toHaveBeenCalledTimes(1);
    expect(featureMocks.fetchNavigation).toHaveBeenCalledTimes(1);
  });

  it('首屏 navigation 401 在 layout 注册前也归为空 Session', async () => {
    featureMocks.fetchMe.mockResolvedValue({
      capabilities: ['identity.account.manage'],
      employeeId: createEmployeeNo(),
      name: '平台管理员',
    });
    featureMocks.fetchNavigation.mockRejectedValue(
      normalizeApiError({
        config: { url: '/api/v1/navigation' },
        response: {
          data: { detail: 'Session 已失效', status: 401 },
          status: 401,
        },
      }),
    );

    await expect(getInitialState()).resolves.toEqual({
      capabilities: [],
      navigation: [],
      principal: null,
    });
  });

  it('首屏 me 为匿名时丢弃不一致的 navigation 投影', async () => {
    featureMocks.fetchMe.mockResolvedValue(null);
    featureMocks.fetchNavigation.mockResolvedValue([
      {
        meta: {},
        name: '首页',
        order: 1,
        routeKey: 'home',
      },
    ]);

    await expect(getInitialState()).resolves.toEqual({
      capabilities: [],
      navigation: [],
      principal: null,
    });
  });

  it('非 401 首屏错误保持原样向上传递', async () => {
    const error = normalizeApiError({
      response: {
        data: { detail: '上游暂时不可用', status: 503 },
        status: 503,
      },
    });
    featureMocks.fetchMe.mockRejectedValue(error);
    featureMocks.fetchNavigation.mockResolvedValue([]);

    await expect(getInitialState()).rejects.toBe(error);
  });
});

describe('layout', () => {
  it('显式从展开态启动，同时保留 ProLayout 官方响应式 breakpoint', () => {
    const config = layout({});

    expect(config.defaultCollapsed).toBe(false);
    expect(config).not.toHaveProperty('breakpoint');
  });

  it('缺少 initialState 时各 render seam 使用安全空值与默认 Session setter', async () => {
    const config = layout({});
    const brand = config.menuHeaderRender?.(undefined, undefined, {
      collapsed: true,
    } as never);
    const title = config.headerContentRender?.();

    expect(isValidElement(brand)).toBe(true);
    expect(isValidElement(title)).toBe(true);
    expect(config.menuDataRender?.()).toEqual([]);

    const defaultDom = createElement('span', null, '普通菜单');
    expect(
      config.menuItemRender?.(
        { isUrl: false, key: 'home', name: '首页', onClick: vi.fn() },
        defaultDom,
        { collapsed: false },
      ),
    ).toBe(defaultDom);
    expect(
      config.menuTextRender?.({ key: 'home', name: '首页' }, defaultDom, {
        collapsed: false,
      }),
    ).toBe(defaultDom);

    const collapsedText = config.menuTextRender?.(
      { key: 'messages', name: '消息中心', unreadCount: 4 },
      defaultDom,
      { collapsed: true },
    );
    render(createElement('div', null, collapsedText));
    expect(screen.queryByLabelText('4 条未读消息')).not.toBeInTheDocument();

    const headerActions = config.actionsRender?.()?.[0];
    if (!headerActions || typeof headerActions !== 'object') {
      throw new Error('Missing HeaderActions element');
    }
    await headerActions.props.onLogout();

    expect(featureMocks.logout).toHaveBeenCalledOnce();
    expect(featureMocks.replace).toHaveBeenCalledWith('/login');
  });

  it('提供品牌化 mix 布局、固定尺寸和 header 接缝', () => {
    const employeeId = createEmployeeNo();
    const config = layout({
      initialState: {
        capabilities: ['identity.account.manage'],
        navigation: [
          {
            meta: {},
            name: '管理后台',
            order: 3,
            routeKey: 'admin',
          },
          {
            meta: {},
            name: '未知菜单',
            order: 1,
            routeKey: 'ghost',
          },
          {
            meta: {},
            name: '首页',
            order: 2,
            routeKey: 'home',
          },
        ],
        principal: { employeeId, name: '平台用户' },
      },
    });

    expect(config.logo).toBe(false);
    expect(config.title).toBe(false);
    expect(config.layout).toBe('mix');
    expect(config.navTheme).toBe('realDark');
    expect(config.siderWidth).toBe(208);
    expect(config.fixedHeader).toBe(true);
    expect(config.fixSiderbar).toBe(true);
    expect(config.menu).toEqual({
      locale: false,
      type: 'group',
      collapsedWidth: 56,
    });
    expect(config.headerTitleRender).toBe(false);
    expect(config.menuHeaderRender).toEqual(expect.any(Function));
    expect(config.headerContentRender).toEqual(expect.any(Function));
    expect(config.actionsRender).toEqual(expect.any(Function));
    expect(config.token).toEqual({
      header: { heightLayoutHeader: 52 },
      pageContainer: {
        paddingBlockPageContainerContent: 20,
        paddingInlinePageContainerContent: 24,
      },
    });
  });

  it('用真实 Registry 生成分组后的可见菜单', () => {
    const config = layout({
      initialState: {
        capabilities: [],
        navigation: [
          {
            meta: {},
            name: '管理概览',
            order: 3,
            routeKey: 'admin',
          },
          {
            meta: {},
            name: '工作区管理',
            order: 4,
            routeKey: 'admin.workspaces',
          },
          {
            meta: {},
            name: '组织管理',
            order: 5,
            routeKey: 'admin.organization',
          },
          {
            meta: {},
            name: '未知菜单',
            order: 1,
            routeKey: 'ghost',
          },
          {
            meta: {},
            name: '首页',
            order: 2,
            routeKey: 'home',
          },
        ],
        principal: null,
      },
    });
    const groups = config.menuDataRender?.() ?? [];

    expect(
      groups.map(({ key, name, children }) => ({
        key,
        name,
        children: children?.map(({ key: childKey, path }) => ({
          key: childKey,
          path,
        })),
      })),
    ).toEqual([
      {
        key: 'group-user',
        name: '用户端',
        children: [{ key: 'home', path: '/home' }],
      },
      {
        key: 'group-admin',
        name: '管理端',
        children: [
          { key: 'admin.workspaces', path: '/admin/workspaces' },
          { key: 'admin.organization', path: '/admin/organization' },
        ],
      },
    ]);
  });

  it('点击可见菜单项会跳转到该菜单的注册路由', async () => {
    const user = userEvent.setup();
    const collapseMobileMenu = vi.fn();
    const config = layout({});
    const menuItem = config.menuItemRender?.(
      {
        isUrl: false,
        itemPath: '/workspaces',
        key: 'workspaces',
        name: '工作区',
        onClick: collapseMobileMenu,
        path: '/workspaces',
        replace: false,
      },
      createElement('span', null, '工作区'),
      { collapsed: false },
    );
    render(createElement('div', null, menuItem));

    await user.click(screen.getByRole('link', { name: '工作区' }));

    expect(featureMocks.push).toHaveBeenCalledWith('/workspaces');
    expect(collapseMobileMenu).toHaveBeenCalledOnce();
  });

  it('消息菜单在展开时贴近文字显示未读数，折叠时仅显示圆点', () => {
    const config = layout({});
    const item = {
      key: 'messages',
      name: '消息中心',
      unreadCount: 4,
    };

    const expanded = render(
      createElement(
        'div',
        null,
        config.menuTextRender?.(item, createElement('span', null, '消息中心'), {
          collapsed: false,
        }),
      ),
    );
    expect(screen.getByText('消息中心')).toBeInTheDocument();
    expect(screen.getByLabelText('4 条未读消息')).toHaveTextContent('4');
    expanded.unmount();

    const collapsedDom = config.menuItemRender?.(
      { ...item, isUrl: false, onClick: vi.fn() },
      createElement('span', null, '消息入口'),
      { collapsed: true },
    );
    render(createElement('div', null, collapsedDom));
    expect(screen.getByLabelText('4 条未读消息')).toBeInTheDocument();
  });

  it('原型新增标记使用 antd 6 当前 Tag variant API', () => {
    const config = layout({});
    const menuText = config.menuTextRender?.(
      { key: 'admin.grants', name: 'Grant 管理', prototypeBadge: '新增' },
      createElement('span', null, 'Grant 管理'),
      { collapsed: false },
    );
    if (!isValidElement<{ children?: ReactNode }>(menuText)) {
      throw new Error('Missing menu text wrapper');
    }
    const tag = Children.toArray(menuText.props.children).find(
      (child) =>
        isValidElement<{ children?: ReactNode }>(child) &&
        child.props.children === '新增',
    );
    expect(tag).toBeDefined();
    expect(tag).toMatchObject({ props: { variant: 'filled' } });
    expect(tag).not.toMatchObject({ props: { bordered: expect.anything() } });
  });

  it('只按后端 navigation 决定是否生成管理端分组', () => {
    const userOnlyNavigation = [
      {
        meta: {},
        name: '工作台',
        order: 1,
        routeKey: 'home',
      },
      {
        meta: {},
        name: '工作区',
        order: 2,
        routeKey: 'workspaces',
      },
      {
        meta: {},
        name: '审计看板',
        order: 3,
        routeKey: 'audit',
      },
    ];
    const adminNavigation = [
      ...userOnlyNavigation,
      {
        meta: {},
        name: '管理概览',
        order: 4,
        routeKey: 'admin',
      },
      {
        meta: {},
        name: '账号管理',
        order: 5,
        routeKey: 'admin.users',
      },
    ];

    const userMenu = layout({
      initialState: {
        capabilities: [],
        navigation: userOnlyNavigation,
        principal: null,
      },
    }).menuDataRender?.();
    const adminMenu = layout({
      initialState: {
        capabilities: [],
        navigation: adminNavigation,
        principal: null,
      },
    }).menuDataRender?.();

    expect(userMenu).not.toContainEqual(
      expect.objectContaining({ name: '管理端' }),
    );
    expect(adminMenu).toContainEqual(
      expect.objectContaining({ name: '管理端' }),
    );
  });

  it('transport 401 先清 Session Initial State，再 replace 到带安全回跳的登录页', async () => {
    const setInitialState = vi.fn().mockResolvedValue(undefined);
    layout({ setInitialState });
    vi.stubGlobal(
      'fetch',
      vi.fn(
        async () =>
          new Response(
            JSON.stringify({
              detail: 'Session 已过期',
              status: 401,
              title: 'UNAUTHORIZED',
            }),
            {
              headers: { 'Content-Type': 'application/problem+json' },
              status: 401,
            },
          ),
      ),
    );

    await expect(
      createApiClient('/api').GET('/api/v1/me' as never),
    ).rejects.toMatchObject({ problem: { status: 401 } });

    await vi.waitFor(() => {
      expect(setInitialState).toHaveBeenCalledWith({
        capabilities: [],
        navigation: [],
        principal: null,
      });
      expect(featureMocks.replace).toHaveBeenCalledWith(
        '/login?redirect=%2Fadmin%2Fusers%3Fstatus%3Denabled%23member',
      );
    });
    expect(setInitialState.mock.invocationCallOrder[0]).toBeLessThan(
      featureMocks.replace.mock.invocationCallOrder[0],
    );
  });

  it('Umi request 401 桥接同一 Session 清理，auth 业务 401 不误触发', async () => {
    const setInitialState = vi.fn().mockResolvedValue(undefined);
    layout({ setInitialState });
    const errorHandler = request.errorConfig?.errorHandler;
    expect(errorHandler).toEqual(expect.any(Function));

    expect(() =>
      errorHandler?.(
        {
          config: { url: '/api/v1/auth/login' },
          response: {
            data: { detail: '员工号或密码错误', status: 401 },
            status: 401,
          },
        } as never,
        {} as never,
      ),
    ).toThrow();
    expect(setInitialState).not.toHaveBeenCalled();

    expect(() =>
      errorHandler?.(
        {
          config: { url: '/api/v1/admin/accounts' },
          response: {
            data: { detail: 'Session 已撤销', status: 401 },
            status: 401,
          },
        } as never,
        {} as never,
      ),
    ).toThrow();

    await vi.waitFor(() => expect(setInitialState).toHaveBeenCalledOnce());
  });

  it('并发 protected 401 合并为一次 Session 清理与跳转', async () => {
    let resolveState!: () => void;
    const stateCommit = new Promise<void>((resolve) => {
      resolveState = resolve;
    });
    const setInitialState = vi.fn().mockReturnValue(stateCommit);
    layout({ setInitialState });
    const errorHandler = request.errorConfig?.errorHandler;
    const failure = {
      config: { url: '/api/v1/admin/accounts' },
      response: {
        data: { detail: 'Session 已撤销', status: 401 },
        status: 401,
      },
    } as never;

    expect(() => errorHandler?.(failure, {} as never)).toThrow();
    expect(() => errorHandler?.(failure, {} as never)).toThrow();
    expect(setInitialState).toHaveBeenCalledOnce();
    expect(featureMocks.replace).not.toHaveBeenCalled();

    resolveState();
    await vi.waitFor(() => expect(featureMocks.replace).toHaveBeenCalledOnce());
  });

  it('退出成功后清 Session 并 replace 登录页，失败时保留当前状态', async () => {
    const employeeId = createEmployeeNo();
    const setInitialState = vi.fn().mockResolvedValue(undefined);
    const config = layout({
      initialState: {
        capabilities: ['identity.account.manage'],
        navigation: [],
        principal: { employeeId, name: '平台管理员' },
      },
      setInitialState,
    });
    const headerActions = config.actionsRender?.()?.[0];
    if (!headerActions || typeof headerActions !== 'object') {
      throw new Error('Missing HeaderActions element');
    }

    await headerActions.props.onLogout();

    expect(featureMocks.logout).toHaveBeenCalledOnce();
    expect(setInitialState).toHaveBeenCalledWith({
      capabilities: [],
      navigation: [],
      principal: null,
    });
    expect(featureMocks.replace).toHaveBeenCalledWith('/login');

    featureMocks.logout.mockRejectedValueOnce(
      normalizeApiError({
        response: {
          data: { detail: '退出失败，请重试', status: 503 },
          status: 503,
        },
      }),
    );
    setInitialState.mockClear();
    featureMocks.replace.mockClear();

    await expect(headerActions.props.onLogout()).rejects.toMatchObject({
      problem: { detail: '退出失败，请重试' },
    });
    expect(setInitialState).not.toHaveBeenCalled();
    expect(featureMocks.replace).not.toHaveBeenCalled();
  });

  it('静态 defaultSettings 使用品牌橙和最终深色侧栏尺寸', () => {
    expect(defaultSettings).toMatchObject({
      colorPrimary: '#EB6E00',
      layout: 'mix',
      fixedHeader: true,
      fixSiderbar: true,
      navTheme: 'realDark',
      siderWidth: 208,
    });
  });
});

describe('theme runtime', () => {
  it('antd runtime 保留既有配置并注入首屏解析的暗色主题', () => {
    window.__ENGINEERING_PLATFORM_THEME__ = {
      mode: 'system',
      resolvedTheme: 'dark',
    };
    const memo = { appConfig: {}, prefixCls: 'platform' };

    const config = antd(memo);

    expect(config.appConfig).toBe(memo.appConfig);
    expect(config.prefixCls).toBe('platform');
    expect(config.theme).toEqual({
      algorithm: [theme.darkAlgorithm],
      components: expect.any(Object),
      token: {
        colorBorder: '#424242',
        colorBorderSecondary: '#303030',
        colorBgLayout: '#121212',
        colorBgContainer: '#1F1F1F',
        colorInfo: '#EB6E00',
        colorLink: '#EB6E00',
        colorLinkHover: '#FF8F2E',
        colorPrimary: '#EB6E00',
        colorText: 'rgba(255,255,255,.88)',
        colorTextSecondary: 'rgba(255,255,255,.65)',
        borderRadius: 8,
      },
    });
  });

  it('rootContainer 保留子树并提供首屏主题上下文', () => {
    window.__ENGINEERING_PLATFORM_THEME__ = {
      mode: 'dark',
      resolvedTheme: 'dark',
    };

    function Probe() {
      const { mode, resolvedTheme } = usePlatformTheme();
      return createElement('output', null, `${mode}/${resolvedTheme}`);
    }

    render(rootContainer(createElement(Probe)));

    expect(screen.getByText('dark/dark')).toBeInTheDocument();
  });
});
