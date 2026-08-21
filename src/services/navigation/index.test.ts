import { beforeEach, describe, expect, expectTypeOf, it, vi } from 'vitest';

const apiMock = vi.hoisted(() => ({ GET: vi.fn() }));
vi.mock('@/services/generated', () => ({ api: apiMock }));

import { getNavigation, type NavigationItem } from './index';

beforeEach(() => apiMock.GET.mockReset());

describe('navigation service V0.2 generated client seam', () => {
  it('公开模型直接保留 order、移除旧 sort，并将 nullable meta 归一为空对象', async () => {
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
      { meta: {}, name: '首页', order: 10, routeKey: 'home' },
      {
        meta: { section: 'admin' },
        name: '账号',
        order: 20,
        routeKey: 'admin.users',
      },
    ]);
    expectTypeOf<
      'sort' extends keyof NavigationItem ? true : false
    >().toEqualTypeOf<false>();
    expect(apiMock.GET).toHaveBeenCalledWith('/api/v1/navigation');
  });
});
