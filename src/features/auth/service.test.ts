import {
  createChallengeToken,
  createEmployeeNo,
  createPassword,
  createProvisioningUri,
  createTotpCode,
  createTotpSecret,
} from '@root/tests/auth-fixtures';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { ApiError } from '@/services/transport';

const authServiceMock = vi.hoisted(() => ({
  confirmBootstrapTotp: vi.fn(),
  enrollBootstrapTotp: vi.fn(),
  getCurrentUser: vi.fn(),
  logout: vi.fn(),
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
  logout,
  setBootstrapPassword,
  verifyTotp,
} from './service';

beforeEach(() => {
  authServiceMock.getCurrentUser.mockReset();
  authServiceMock.logout.mockReset();
  authServiceMock.confirmBootstrapTotp.mockReset();
  authServiceMock.enrollBootstrapTotp.mockReset();
  authServiceMock.setBootstrapPassword.mockReset();
  authServiceMock.startLogin.mockReset();
  authServiceMock.verifyTotp.mockReset();
});

describe('auth feature service', () => {
  it('fetchMe 返回下层 service 的当前用户', async () => {
    const principal = {
      capabilities: ['identity.account.manage'],
      employeeId: createEmployeeNo(),
      name: '平台管理员',
    };
    authServiceMock.getCurrentUser.mockResolvedValue(principal);

    await expect(fetchMe()).resolves.toEqual(principal);
  });

  it('logout 委托 auth service 且传播结果', async () => {
    authServiceMock.logout.mockResolvedValue(undefined);

    await expect(logout()).resolves.toBeUndefined();
    expect(authServiceMock.logout).toHaveBeenCalledOnce();
  });

  it('fetchMe 仅将明确的 401 归为匿名 Session', async () => {
    authServiceMock.getCurrentUser.mockRejectedValue(
      new ApiError({ detail: 'Session 已失效', status: 401 }),
    );

    await expect(fetchMe()).resolves.toBeNull();
  });

  it.each([
    new ApiError({ detail: '禁止访问', status: 403 }),
    new ApiError({ detail: '服务暂不可用', status: 503 }),
    new ApiError({ detail: 'fetch failed', title: 'NETWORK_ERROR' }),
  ])('fetchMe 不吞掉非 401 的服务与网络故障', async (failure) => {
    authServiceMock.getCurrentUser.mockRejectedValue(failure);

    await expect(fetchMe()).rejects.toBe(failure);
  });

  it('login 把员工凭据委托给下层 service 并返回认证阶段', async () => {
    const challengeToken = createChallengeToken();
    const result = {
      challengeToken,
      state: 'TOTP_REQUIRED',
    } as const;
    authServiceMock.startLogin.mockResolvedValue(result);
    const input = {
      employeeNo: createEmployeeNo(),
      password: createPassword(),
    };

    await expect(login(input)).resolves.toEqual(result);
    expect(authServiceMock.startLogin).toHaveBeenCalledWith(input);
  });

  it('login 传播下层 service 归一化后的错误', async () => {
    authServiceMock.startLogin.mockRejectedValue(
      new Error('Validation failed'),
    );

    const error = await login({
      employeeNo: createEmployeeNo().slice(0, 3),
      password: createPassword(),
    }).catch((caught: unknown) => caught);

    expect(error).toBeInstanceOf(Error);
    expect((error as Error).message).toBe('Validation failed');
  });

  it('verifyTotp 把 challenge 与动态码委托给下层 service', async () => {
    authServiceMock.verifyTotp.mockResolvedValue({ state: 'AUTHENTICATED' });
    const input = {
      challengeToken: createChallengeToken(),
      code: createTotpCode(),
    };

    await expect(verifyTotp(input)).resolves.toEqual({
      state: 'AUTHENTICATED',
    });
    expect(authServiceMock.verifyTotp).toHaveBeenCalledWith(input);
  });

  it('setBootstrapPassword 把正式密码委托给 cookie-based 下层 service', async () => {
    authServiceMock.setBootstrapPassword.mockResolvedValue({
      state: 'PASSWORD_SET',
    });
    const input = {
      password: createPassword(),
    };

    await expect(setBootstrapPassword(input)).resolves.toEqual({
      state: 'PASSWORD_SET',
    });
    expect(authServiceMock.setBootstrapPassword).toHaveBeenCalledWith(input);
  });

  it('enrollBootstrapTotp 依赖 secure cookie 并返回 provisioning URI', async () => {
    const result = {
      provisioningUri: createProvisioningUri(
        createEmployeeNo(),
        createTotpSecret(),
      ),
    };
    authServiceMock.enrollBootstrapTotp.mockResolvedValue(result);
    await expect(enrollBootstrapTotp()).resolves.toEqual(result);
    expect(authServiceMock.enrollBootstrapTotp).toHaveBeenCalledWith();
  });

  it('confirmBootstrapTotp 只把动态码委托给下层 service', async () => {
    authServiceMock.confirmBootstrapTotp.mockResolvedValue({
      state: 'AUTHENTICATED',
    });
    const input = {
      code: createTotpCode(),
    };

    await expect(confirmBootstrapTotp(input)).resolves.toEqual({
      state: 'AUTHENTICATED',
    });
    expect(authServiceMock.confirmBootstrapTotp).toHaveBeenCalledWith(input);
  });
});
