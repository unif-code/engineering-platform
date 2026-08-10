import { beforeEach, describe, expect, it, vi } from 'vitest';

const authServiceMock = vi.hoisted(() => ({
  getCurrentUser: vi.fn(),
  startLogin: vi.fn(),
  verifyTotp: vi.fn(),
}));

vi.mock('@/services/auth', () => authServiceMock);

import { fetchMe, login, verifyTotp } from './service';

beforeEach(() => {
  authServiceMock.getCurrentUser.mockReset();
  authServiceMock.startLogin.mockReset();
  authServiceMock.verifyTotp.mockReset();
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

  it('login 把员工凭据委托给下层 service 并返回认证阶段', async () => {
    authServiceMock.startLogin.mockResolvedValue({
      challengeToken: 'challenge-00000000',
      stage: 'TOTP',
    });
    const input = {
      employeeNo: '00000000',
      password: 'Valid-Password!2026',
    };

    await expect(login(input)).resolves.toEqual({
      challengeToken: 'challenge-00000000',
      stage: 'TOTP',
    });
    expect(authServiceMock.startLogin).toHaveBeenCalledWith(input);
  });

  it('login 传播下层 service 归一化后的错误', async () => {
    authServiceMock.startLogin.mockRejectedValue(
      new Error('Validation failed'),
    );

    const error = await login({
      employeeNo: '123',
      password: 'x',
    }).catch((caught: unknown) => caught);

    expect(error).toBeInstanceOf(Error);
    expect((error as Error).message).toBe('Validation failed');
  });

  it('verifyTotp 把 challenge 与动态码委托给下层 service', async () => {
    authServiceMock.verifyTotp.mockResolvedValue({ ok: true });
    const input = {
      challengeToken: 'challenge-00000000',
      code: '123456',
    };

    await expect(verifyTotp(input)).resolves.toEqual({ ok: true });
    expect(authServiceMock.verifyTotp).toHaveBeenCalledWith(input);
  });
});
