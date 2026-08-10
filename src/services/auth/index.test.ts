import { beforeEach, describe, expect, it, vi } from 'vitest';

const requestMock = vi.hoisted(() => vi.fn());

vi.mock('@umijs/max', () => ({ request: requestMock }));

import { getCurrentUser, startLogin, verifyTotp } from './index';

beforeEach(() => {
  requestMock.mockReset();
});

describe('auth service', () => {
  it('GET /api/v1/me 并返回解包后的当前用户', async () => {
    requestMock.mockResolvedValue({
      code: 200,
      data: { employeeId: '00000000', name: 'V0.1 Stub' },
      message: 'ok',
    });

    await expect(getCurrentUser()).resolves.toEqual({
      employeeId: '00000000',
      name: 'V0.1 Stub',
    });
    expect(requestMock).toHaveBeenCalledWith('/api/v1/me', {
      method: 'GET',
    });
  });

  it('POST /api/v1/auth/login 时发送凭据、幂等键并返回 TOTP challenge', async () => {
    requestMock.mockResolvedValue({
      challengeToken: 'challenge-00000000',
      stage: 'TOTP',
    });
    const input = {
      employeeNo: '00000000',
      password: 'Valid-Password!2026',
    };

    await expect(startLogin(input)).resolves.toEqual({
      challengeToken: 'challenge-00000000',
      stage: 'TOTP',
    });
    expect(requestMock).toHaveBeenCalledWith('/api/v1/auth/login', {
      data: input,
      headers: {
        'Idempotency-Key': expect.stringMatching(/^[0-9a-f-]{36}$/),
      },
      method: 'POST',
    });
  });

  it('POST /api/v1/auth/totp 时发送 challenge 与 6 位动态码', async () => {
    requestMock.mockResolvedValue({ ok: true });
    const input = {
      challengeToken: 'challenge-00000000',
      code: '123456',
    };

    await expect(verifyTotp(input)).resolves.toEqual({ ok: true });
    expect(requestMock).toHaveBeenCalledWith('/api/v1/auth/totp', {
      data: input,
      headers: {
        'Idempotency-Key': expect.stringMatching(/^[0-9a-f-]{36}$/),
      },
      method: 'POST',
    });
  });

  it('登录 Problem Details 保留服务端 detail 原文', async () => {
    requestMock.mockRejectedValue({
      response: {
        data: {
          type: 'https://engineering-platform.example/problems/login_backoff',
          title: 'LOGIN_BACKOFF',
          status: 429,
          detail: '登录失败次数过多，请在 30 秒后重试',
          requestId: 'req-login-1',
        },
        status: 429,
      },
    });

    const error = await startLogin({
      employeeNo: '00000000',
      password: 'wrong-password',
    }).catch((caught: unknown) => caught);

    expect(error).toMatchObject({
      name: 'ApiError',
      problem: {
        status: 429,
        detail: '登录失败次数过多，请在 30 秒后重试',
      },
      requestId: 'req-login-1',
    });
  });

  it.each([
    {
      expected: {
        problem: { detail: 'fetch failed', title: 'NETWORK_ERROR' },
      },
      rejection: new TypeError('fetch failed'),
    },
    {
      expected: {
        problem: { status: 502, title: 'Bad Gateway' },
      },
      rejection: {
        response: { data: '', status: 502, statusText: 'Bad Gateway' },
      },
    },
  ])('登录请求不泄露底层 network/HTTP 异常', async ({
    expected,
    rejection,
  }) => {
    requestMock.mockRejectedValue(rejection);

    const error = await startLogin({
      employeeNo: '00000000',
      password: 'Valid-Password!2026',
    }).catch((caught: unknown) => caught);

    expect(error).toMatchObject({ name: 'ApiError', ...expected });
  });
});
