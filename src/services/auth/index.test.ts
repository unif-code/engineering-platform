import { beforeEach, describe, expect, it, vi } from 'vitest';

const apiMock = vi.hoisted(() => ({ GET: vi.fn(), POST: vi.fn() }));

vi.mock('@/services/generated', () => ({ api: apiMock }));

import {
  confirmBootstrapTotp,
  enrollBootstrapTotp,
  getCurrentUser,
  logout,
  setBootstrapPassword,
  startLogin,
  verifyTotp,
} from './index';

const result = <T>(data: T) => ({
  data,
  response: new Response(null, { status: 200 }),
});

beforeEach(() => {
  apiMock.GET.mockReset();
  apiMock.POST.mockReset();
});

describe('auth service V0.2 generated client seam', () => {
  it('读取 generated Principal，并把 scoped capabilities 投影为现有权限字符串', async () => {
    apiMock.GET.mockResolvedValue(
      result({
        capabilities: [
          {
            capability: 'identity.account.manage',
            scopeType: 'PLATFORM',
          },
        ],
        employeeId: '00000000',
        name: '平台管理员',
      }),
    );

    await expect(getCurrentUser()).resolves.toEqual({
      capabilities: ['identity.account.manage'],
      employeeId: '00000000',
      name: '平台管理员',
    });
    expect(apiMock.GET).toHaveBeenCalledWith('/api/v1/me');
  });

  it('登录使用 generated POST 并保留 V0.2 state 判别字段', async () => {
    const input = {
      employeeNo: '00000000',
      password: 'Valid-Password!2026',
    };
    apiMock.POST.mockResolvedValue(
      result({ challengeToken: 'challenge-1', state: 'TOTP_REQUIRED' }),
    );

    await expect(startLogin(input)).resolves.toEqual({
      challengeToken: 'challenge-1',
      state: 'TOTP_REQUIRED',
    });
    expect(apiMock.POST).toHaveBeenCalledWith('/api/v1/auth/login', {
      body: input,
      params: {
        header: {
          'Idempotency-Key': expect.stringMatching(/^[0-9a-f-]{36}$/),
        },
      },
    });
  });

  it('TOTP 验证返回 AUTHENTICATED', async () => {
    const input = { challengeToken: 'challenge-1', code: '123456' };
    apiMock.POST.mockResolvedValue(result({ state: 'AUTHENTICATED' }));

    await expect(verifyTotp(input)).resolves.toEqual({
      state: 'AUTHENTICATED',
    });
    expect(apiMock.POST).toHaveBeenCalledWith('/api/v1/auth/totp', {
      body: input,
      params: {
        header: {
          'Idempotency-Key': expect.stringMatching(/^[0-9a-f-]{36}$/),
        },
      },
    });
  });

  it('bootstrap 依赖 secure cookie，不再发送 bootstrap token', async () => {
    apiMock.POST.mockResolvedValueOnce(result({ state: 'PASSWORD_SET' }))
      .mockResolvedValueOnce(result({ provisioningUri: 'otpauth://example' }))
      .mockResolvedValueOnce(result({ state: 'AUTHENTICATED' }));

    await expect(
      setBootstrapPassword({ password: 'New-Valid-Password!2026' }),
    ).resolves.toEqual({ state: 'PASSWORD_SET' });
    await expect(enrollBootstrapTotp()).resolves.toEqual({
      provisioningUri: 'otpauth://example',
    });
    await expect(confirmBootstrapTotp({ code: '123456' })).resolves.toEqual({
      state: 'AUTHENTICATED',
    });

    expect(apiMock.POST.mock.calls).toEqual([
      [
        '/api/v1/auth/bootstrap/password',
        {
          body: { password: 'New-Valid-Password!2026' },
          params: {
            header: {
              'Idempotency-Key': expect.stringMatching(/^[0-9a-f-]{36}$/),
            },
          },
        },
      ],
      [
        '/api/v1/auth/bootstrap/totp/enroll',
        {
          params: {
            header: {
              'Idempotency-Key': expect.stringMatching(/^[0-9a-f-]{36}$/),
            },
          },
        },
      ],
      [
        '/api/v1/auth/bootstrap/totp/confirm',
        {
          body: { code: '123456' },
          params: {
            header: {
              'Idempotency-Key': expect.stringMatching(/^[0-9a-f-]{36}$/),
            },
          },
        },
      ],
    ]);
  });

  it('logout 调 generated endpoint 并保持公开 seam 的 void 结果', async () => {
    apiMock.POST.mockResolvedValue(result({ state: 'LOGGED_OUT' }));

    await expect(logout()).resolves.toBeUndefined();
    expect(apiMock.POST).toHaveBeenCalledWith('/api/v1/auth/logout', {
      params: {
        header: {
          'Idempotency-Key': expect.stringMatching(/^[0-9a-f-]{36}$/),
        },
      },
    });
  });

  it('generated transport 的 ApiError 原样向上传递', async () => {
    const error = Object.assign(new Error('登录失败'), {
      name: 'ApiError',
      problem: { detail: '登录失败', status: 401 },
    });
    apiMock.POST.mockRejectedValue(error);

    await expect(
      startLogin({ employeeNo: '00000000', password: 'wrong' }),
    ).rejects.toBe(error);
  });
});
