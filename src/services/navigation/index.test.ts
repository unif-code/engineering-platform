import { beforeEach, describe, expect, it, vi } from 'vitest';

const apiMock = vi.hoisted(() => ({ GET: vi.fn() }));
vi.mock('@/services/generated', () => ({ api: apiMock }));

import { getNavigation } from './index';

beforeEach(() => apiMock.GET.mockReset());

describe('navigation service V0.2 generated client seam', () => {
  it('用 order 兼容现有 sort，并将 nullable meta 归一为空对象', async () => {
    apiMock.GET.mockResolvedValue({
      data: [
        { meta: null, name: '首页', order: 10, routeKey: 'home' },
        {
          meta: { section: 'admin' },
          name: '账号',
          order: 20,
          routeKey: 'admin.users',
        },
      ],
      response: new Response(null, { status: 200 }),
    });

    await expect(getNavigation()).resolves.toEqual([
      { meta: {}, name: '首页', order: 10, routeKey: 'home', sort: 10 },
      {
        meta: { section: 'admin' },
        name: '账号',
        order: 20,
        routeKey: 'admin.users',
        sort: 20,
      },
    ]);
    expect(apiMock.GET).toHaveBeenCalledWith('/api/v1/navigation');
  });
});
