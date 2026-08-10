import { render, screen } from '@testing-library/react';
import { theme } from 'antd';
import { createElement } from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import defaultSettings from '../config/defaultSettings';

const featureMocks = vi.hoisted(() => ({
  fetchMe: vi.fn(),
  fetchNavigation: vi.fn(),
  setAntdConfig: vi.fn(),
}));

vi.mock('@umijs/max', () => ({
  useAntdConfigSetter: () => featureMocks.setAntdConfig,
}));

vi.mock('@/features/auth', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@/features/auth')>()),
  fetchMe: featureMocks.fetchMe,
}));

vi.mock('@/features/navigation', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@/features/navigation')>()),
  fetchNavigation: featureMocks.fetchNavigation,
}));

import { usePlatformTheme } from '@/features/theme';
import { antd, getInitialState, layout, rootContainer } from './app';

beforeEach(() => {
  featureMocks.fetchMe.mockReset();
  featureMocks.fetchNavigation.mockReset();
  featureMocks.setAntdConfig.mockReset();
  delete window.__ENGINEERING_PLATFORM_THEME__;
});

describe('getInitialState', () => {
  it('聚合 auth 与 navigation Feature 的精确结果', async () => {
    const me = { employeeId: '00000000', name: 'V0.1 Stub' };
    const navigation = [{ routeKey: 'home', name: '首页', order: 1 }];
    featureMocks.fetchMe.mockResolvedValue(me);
    featureMocks.fetchNavigation.mockResolvedValue(navigation);

    await expect(getInitialState()).resolves.toEqual({ me, navigation });
    expect(featureMocks.fetchMe).toHaveBeenCalledTimes(1);
    expect(featureMocks.fetchNavigation).toHaveBeenCalledTimes(1);
  });
});

describe('layout', () => {
  it('提供品牌化 mix 布局、固定尺寸和 header 接缝', () => {
    const config = layout({
      initialState: {
        me: { employeeId: '00000000', name: '平台用户' },
        navigation: [
          { routeKey: 'admin', name: '管理后台', order: 3 },
          { routeKey: 'ghost', name: '未知菜单', order: 1 },
          { routeKey: 'home', name: '首页', order: 2 },
        ],
      },
    });

    expect(config.logo).toBe(false);
    expect(config.title).toBe(false);
    expect(config.layout).toBe('mix');
    expect(config).toHaveProperty('navTheme', undefined);
    expect(config.siderWidth).toBe(208);
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
        me: null,
        navigation: [
          { routeKey: 'admin', name: '管理概览', order: 3 },
          { routeKey: 'ghost', name: '未知菜单', order: 1 },
          { routeKey: 'home', name: '首页', order: 2 },
        ],
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
