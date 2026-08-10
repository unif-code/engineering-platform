import { render, screen } from '@testing-library/react';
import { theme } from 'antd';
import { createElement } from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import defaultSettings from '../config/defaultSettings';

const featureMocks = vi.hoisted(() => ({
  fetchMe: vi.fn(),
  fetchNavigation: vi.fn(),
  logout: vi.fn(),
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
  featureMocks.replace.mockReset();
  featureMocks.setAntdConfig.mockReset();
  featureMocks.logout.mockResolvedValue(undefined);
  delete window.__ENGINEERING_PLATFORM_THEME__;
});

afterEach(() => {
  vi.unstubAllGlobals();
  onUnauthorized(() => undefined);
});

describe('getInitialState', () => {
  it('聚合 auth 与 navigation Feature 的精确结果', async () => {
    const me = {
      capabilities: ['identity.account.manage', 'audit.read'],
      employeeId: '00000000',
      name: '平台管理员',
    };
    const navigation = [
      {
        meta: { section: 'workspace' },
        name: '首页',
        order: 1,
        routeKey: 'home',
        sort: 10,
      },
    ];
    featureMocks.fetchMe.mockResolvedValue(me);
    featureMocks.fetchNavigation.mockResolvedValue(navigation);

    await expect(getInitialState()).resolves.toEqual({
      capabilities: me.capabilities,
      navigation,
      principal: { employeeId: '00000000', name: '平台管理员' },
    });
    expect(featureMocks.fetchMe).toHaveBeenCalledTimes(1);
    expect(featureMocks.fetchNavigation).toHaveBeenCalledTimes(1);
  });

  it('首屏 navigation 401 在 layout 注册前也归为空 Session', async () => {
    featureMocks.fetchMe.mockResolvedValue({
      capabilities: ['identity.account.manage'],
      employeeId: '00000000',
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
        sort: 10,
      },
    ]);

    await expect(getInitialState()).resolves.toEqual({
      capabilities: [],
      navigation: [],
      principal: null,
    });
  });
});

describe('layout', () => {
  it.each([
    { viewportWidth: 1440, expected: false },
    { viewportWidth: 1280, expected: true },
    { viewportWidth: 1024, expected: true },
  ])('视口宽度为 $viewportWidth 时初始折叠状态为 $expected', ({
    viewportWidth,
    expected,
  }) => {
    vi.stubGlobal('window', { innerWidth: viewportWidth });

    expect(layout({}).defaultCollapsed).toBe(expected);
  });

  it('SSR 环境默认保持展开且不访问 window', () => {
    vi.stubGlobal('window', undefined);

    expect(layout({}).defaultCollapsed).toBe(false);
  });

  it('提供品牌化 mix 布局、固定尺寸和 header 接缝', () => {
    const config = layout({
      initialState: {
        capabilities: ['identity.account.manage'],
        navigation: [
          {
            meta: {},
            name: '管理后台',
            order: 3,
            routeKey: 'admin',
            sort: 30,
          },
          {
            meta: {},
            name: '未知菜单',
            order: 1,
            routeKey: 'ghost',
            sort: 10,
          },
          {
            meta: {},
            name: '首页',
            order: 2,
            routeKey: 'home',
            sort: 20,
          },
        ],
        principal: { employeeId: '00000000', name: '平台用户' },
      },
    });

    expect(config.logo).toBe(false);
    expect(config.title).toBe(false);
    expect(config.layout).toBe('mix');
    expect(config).toHaveProperty('navTheme', undefined);
    expect(config.siderWidth).toBe(208);
    expect(config.breakpoint).toBe(false);
    expect(config.fixedHeader).toBe(true);
    expect(config.fixSiderbar).toBe(true);
    expect(config.menu).toEqual({
      locale: false,
      type: 'group',
      collapsedWidth: 64,
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
            sort: 30,
          },
          {
            meta: {},
            name: '未知菜单',
            order: 1,
            routeKey: 'ghost',
            sort: 10,
          },
          {
            meta: {},
            name: '首页',
            order: 2,
            routeKey: 'home',
            sort: 20,
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
        children: [{ key: 'admin', path: '/admin' }],
      },
    ]);
  });

  it('只按后端 navigation 决定是否生成管理端分组', () => {
    const userOnlyNavigation = [
      {
        meta: {},
        name: '工作台',
        order: 1,
        routeKey: 'home',
        sort: 10,
      },
      {
        meta: {},
        name: '工作区',
        order: 2,
        routeKey: 'workspaces',
        sort: 20,
      },
      {
        meta: {},
        name: '审计看板',
        order: 3,
        routeKey: 'audit',
        sort: 30,
      },
    ];
    const adminNavigation = [
      ...userOnlyNavigation,
      {
        meta: {},
        name: '管理概览',
        order: 4,
        routeKey: 'admin',
        sort: 40,
      },
      {
        meta: {},
        name: '账号管理',
        order: 5,
        routeKey: 'admin.users',
        sort: 50,
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
    const setInitialState = vi.fn().mockResolvedValue(undefined);
    const config = layout({
      initialState: {
        capabilities: ['identity.account.manage'],
        navigation: [],
        principal: { employeeId: '00000000', name: '平台管理员' },
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

  it('静态 defaultSettings 使用品牌橙和固定 mix 布局且不锁定 navTheme', () => {
    expect(defaultSettings).toMatchObject({
      colorPrimary: '#EB6E00',
      layout: 'mix',
      fixedHeader: true,
      fixSiderbar: true,
    });
    expect(defaultSettings).not.toHaveProperty('navTheme');
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
      token: {
        colorPrimary: '#C25700',
        colorBgLayout: '#121212',
        colorBgContainer: '#1F1F1F',
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
