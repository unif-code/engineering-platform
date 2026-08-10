import { beforeEach, describe, expect, it, vi } from 'vitest';

const requestMock = vi.hoisted(() => vi.fn());

vi.mock('@umijs/max', () => ({ request: requestMock }));

import { getNavigation } from './index';

beforeEach(() => {
  requestMock.mockReset();
});

describe('navigation service', () => {
  it('GET /api/v1/navigation 并返回解包后的导航项', async () => {
    requestMock.mockResolvedValue({
      code: 200,
      data: [{ routeKey: 'home', name: '首页', order: 1 }],
      message: 'ok',
    });

    await expect(getNavigation()).resolves.toEqual([
      { routeKey: 'home', name: '首页', order: 1 },
    ]);
    expect(requestMock).toHaveBeenCalledWith('/api/v1/navigation', {
      method: 'GET',
    });
  });
});
