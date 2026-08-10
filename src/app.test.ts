import { beforeEach, describe, expect, it, vi } from 'vitest';

const featureMocks = vi.hoisted(() => ({
  fetchMe: vi.fn(),
  fetchNavigation: vi.fn(),
}));

vi.mock('@/features/auth', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@/features/auth')>()),
  fetchMe: featureMocks.fetchMe,
}));

vi.mock('@/features/navigation', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@/features/navigation')>()),
  fetchNavigation: featureMocks.fetchNavigation,
}));

import { getInitialState, layout } from './app';

beforeEach(() => {
  featureMocks.fetchMe.mockReset();
  featureMocks.fetchNavigation.mockReset();
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
  it('保留布局配置并用真实菜单装配逻辑生成排序后的可见菜单', () => {
    const config = layout({
      initialState: {
        me: null,
        navigation: [
          { routeKey: 'admin', name: '管理后台', order: 3 },
          { routeKey: 'ghost', name: '未知菜单', order: 1 },
          { routeKey: 'home', name: '首页', order: 2 },
        ],
      },
    });

    expect(config.logo).toBe(false);
    expect(config.menu).toEqual({ locale: false });
    expect(config.menuDataRender?.()).toEqual([
      { path: '/home', name: '首页' },
      { path: '/admin', name: '管理后台' },
    ]);
  });
});
