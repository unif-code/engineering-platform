import { beforeEach, describe, expect, it, vi } from 'vitest';

const navigationServiceMock = vi.hoisted(() => ({
  getNavigation: vi.fn(),
}));

vi.mock('@/services/navigation', () => navigationServiceMock);

import { fetchNavigation } from './service';

beforeEach(() => {
  navigationServiceMock.getNavigation.mockReset();
});

describe('navigation feature service', () => {
  it('返回下层 service 的导航项', async () => {
    navigationServiceMock.getNavigation.mockResolvedValue([
      { routeKey: 'home', name: '首页', order: 1 },
    ]);

    await expect(fetchNavigation()).resolves.toEqual([
      { routeKey: 'home', name: '首页', order: 1 },
    ]);
  });

  it('下层 service 失败时返回空数组', async () => {
    navigationServiceMock.getNavigation.mockRejectedValue(
      new Error('Service unavailable'),
    );

    await expect(fetchNavigation()).resolves.toEqual([]);
  });
});
