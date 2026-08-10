import { beforeEach, describe, expect, it, vi } from 'vitest';

const authServiceMock = vi.hoisted(() => ({
  confirmBootstrapTotp: vi.fn(),
  enrollBootstrapTotp: vi.fn(),
  getCurrentUser: vi.fn(),
  setBootstrapPassword: vi.fn(),
  startLogin: vi.fn(),
  verifyTotp: vi.fn(),
}));

vi.mock('@/services/auth', () => authServiceMock);

import {
  confirmBootstrapTotp,
  enrollBootstrapTotp,
  fetchMe,
  login,
  setBootstrapPassword,
  verifyTotp,
} from './service';

beforeEach(() => {
  authServiceMock.getCurrentUser.mockReset();
  authServiceMock.confirmBootstrapTotp.mockReset();
  authServiceMock.enrollBootstrapTotp.mockReset();
  authServiceMock.setBootstrapPassword.mockReset();
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

  it('setBootstrapPassword 把 token 与正式密码委托给下层 service', async () => {
    authServiceMock.setBootstrapPassword.mockResolvedValue({ ok: true });
    const input = {
      bootstrapToken: 'bootstrap-00000009',
      password: 'New-Valid-Password!2026',
    };

    await expect(setBootstrapPassword(input)).resolves.toEqual({ ok: true });
    expect(authServiceMock.setBootstrapPassword).toHaveBeenCalledWith(input);
  });

  it('enrollBootstrapTotp 把 token 委托给下层 service 并返回 provisioning URI', async () => {
    const result = {
      provisioningUri:
        'otpauth://totp/EP:00000009?secret=JBSWY3DPEHPK3PXP&issuer=EP',
    };
    authServiceMock.enrollBootstrapTotp.mockResolvedValue(result);
    const input = { bootstrapToken: 'bootstrap-00000009' };

    await expect(enrollBootstrapTotp(input)).resolves.toEqual(result);
    expect(authServiceMock.enrollBootstrapTotp).toHaveBeenCalledWith(input);
  });

  it('confirmBootstrapTotp 把 token 与动态码委托给下层 service', async () => {
    authServiceMock.confirmBootstrapTotp.mockResolvedValue({ ok: true });
    const input = {
      bootstrapToken: 'bootstrap-00000009',
      code: '123456',
    };

    await expect(confirmBootstrapTotp(input)).resolves.toEqual({ ok: true });
    expect(authServiceMock.confirmBootstrapTotp).toHaveBeenCalledWith(input);
  });
});
