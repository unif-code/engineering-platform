import { afterEach, describe, expect, it, vi } from 'vitest';

afterEach(() => {
  vi.doUnmock('@/features/navigation');
  vi.resetModules();
});

describe('MENU_ROWS route invariant', () => {
  it('拒绝把无菜单分组的页面路由投影成菜单', async () => {
    const navigation = await vi.importActual<
      typeof import('@/features/navigation')
    >('@/features/navigation');

    vi.doMock('@/features/navigation', () => ({
      ...navigation,
      ROUTE_REGISTRY: {
        ...navigation.ROUTE_REGISTRY,
        home: { ...navigation.ROUTE_REGISTRY.home, group: null },
      },
    }));

    await expect(import('./constant')).rejects.toThrow(
      'Route home 不是菜单分组路由',
    );
  });
});
