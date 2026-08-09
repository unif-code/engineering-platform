import { beforeEach, describe, expect, it, vi } from 'vitest';

const authServiceMock = vi.hoisted(() => ({
  authenticate: vi.fn(),
  getCurrentUser: vi.fn(),
}));

vi.mock('@/services/auth', () => authServiceMock);

import { fetchMe, login } from './service';

beforeEach(() => {
  authServiceMock.authenticate.mockReset();
  authServiceMock.getCurrentUser.mockReset();
});

describe('auth feature service', () => {
  it('fetchMe 返回下层 service 的当前用户', async () => {
    authServiceMock.getCurrentUser.mockResolvedValue({
      employeeId: '00000000',
      name: 'V0.1 Stub',
    });

    await expect(fetchMe()).resolves.toEqual({
      employeeId: '00000000',
      name: 'V0.1 Stub',
    });
  });

  it('fetchMe 在下层 service 失败时返回 null', async () => {
    authServiceMock.getCurrentUser.mockRejectedValue(new Error('Unauthorized'));

    await expect(fetchMe()).resolves.toBeNull();
  });

  it('login 把输入委托给下层 service', async () => {
    authServiceMock.authenticate.mockResolvedValue(undefined);
    const input = {
      employeeId: '00000000',
      password: 'secret',
      totp: '123456',
    };

    await expect(login(input)).resolves.toBeUndefined();
    expect(authServiceMock.authenticate).toHaveBeenCalledWith(input);
  });

  it('login 传播下层 service 归一化后的错误', async () => {
    authServiceMock.authenticate.mockRejectedValue(
      new Error('Validation failed'),
    );

    const error = await login({
      employeeId: '123',
      password: 'x',
      totp: '1',
    }).catch((caught: unknown) => caught);

    expect(error).toBeInstanceOf(Error);
    expect((error as Error).message).toBe('Validation failed');
  });
});
