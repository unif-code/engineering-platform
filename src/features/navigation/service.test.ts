import { beforeEach, describe, expect, it, vi } from 'vitest';
import { ApiError } from '@/services/transport';

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
      {
        meta: { section: 'workspace' },
        name: '首页',
        order: 1,
        routeKey: 'home',
      },
    ]);

    await expect(fetchNavigation()).resolves.toEqual([
      {
        meta: { section: 'workspace' },
        name: '首页',
        order: 1,
        routeKey: 'home',
      },
    ]);
  });

  it('明确 401 继续 reject，由 Session owner 统一归匿名', async () => {
    const failure = new ApiError({ detail: 'Session 已失效', status: 401 });
    navigationServiceMock.getNavigation.mockRejectedValue(failure);

    await expect(fetchNavigation()).rejects.toBe(failure);
  });

  it.each([
    new ApiError({ detail: '禁止访问', status: 403 }),
    new ApiError({ detail: '导航服务暂不可用', status: 503 }),
    new ApiError({ detail: 'fetch failed', title: 'NETWORK_ERROR' }),
  ])('非 401 导航故障继续 reject，避免伪装为空投影', async (failure) => {
    navigationServiceMock.getNavigation.mockRejectedValue(failure);

    await expect(fetchNavigation()).rejects.toBe(failure);
  });
});
