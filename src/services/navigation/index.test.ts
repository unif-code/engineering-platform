import { beforeEach, describe, expect, it, vi } from 'vitest';

const requestMock = vi.hoisted(() => vi.fn());

vi.mock('@umijs/max', () => ({ request: requestMock }));

import { getNavigation } from './index';

beforeEach(() => {
  requestMock.mockReset();
});

describe('navigation service', () => {
  it('GET /api/v1/navigation 并返回裸导航投影', async () => {
    requestMock.mockResolvedValue([
      {
        meta: { section: 'workspace' },
        name: '首页',
        order: 1,
        routeKey: 'home',
        sort: 10,
      },
    ]);

    await expect(getNavigation()).resolves.toEqual([
      {
        meta: { section: 'workspace' },
        name: '首页',
        order: 1,
        routeKey: 'home',
        sort: 10,
      },
    ]);
    expect(requestMock).toHaveBeenCalledWith('/api/v1/navigation', {
      method: 'GET',
    });
  });

  it('将 Umi Axios rejection 归一为 ApiError', async () => {
    requestMock.mockRejectedValue({
      config: { url: '/api/v1/navigation' },
      response: {
        data: {
          detail: '导航投影暂不可用',
          requestId: 'req-navigation-503',
          status: 503,
        },
        status: 503,
      },
    });

    await expect(getNavigation()).rejects.toMatchObject({
      name: 'ApiError',
      problem: { detail: '导航投影暂不可用', status: 503 },
      requestId: 'req-navigation-503',
    });
  });
});
