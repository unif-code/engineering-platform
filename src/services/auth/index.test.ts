import { beforeEach, describe, expect, it, vi } from 'vitest';

const requestMock = vi.hoisted(() => vi.fn());

vi.mock('@umijs/max', () => ({ request: requestMock }));

import { authenticate, getCurrentUser } from './index';

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

  it('POST /api/v1/auth/login 时把登录输入放入 data', async () => {
    requestMock.mockResolvedValue({
      code: 200,
      data: { ok: true },
      message: 'ok',
    });
    const input = {
      employeeId: '00000000',
      password: 'secret',
      totp: '123456',
    };

    await expect(authenticate(input)).resolves.toBeUndefined();
    expect(requestMock).toHaveBeenCalledWith('/api/v1/auth/login', {
      method: 'POST',
      data: input,
    });
  });

  it('登录响应 code 非 200 时抛出 envelope message', async () => {
    requestMock.mockResolvedValue({
      code: 422,
      data: null,
      message: 'Validation failed',
    });

    const error = await authenticate({
      employeeId: '123',
      password: 'x',
      totp: '1',
    }).catch((caught: unknown) => caught);

    expect(error).toBeInstanceOf(Error);
    expect((error as Error).message).toBe('Validation failed');
  });

  it('HTTP 422 rejection 使用 response.data 的 envelope message', async () => {
    requestMock.mockRejectedValue({
      response: {
        status: 422,
        data: {
          code: 422,
          data: null,
          message: 'Validation failed',
        },
      },
    });

    const error = await authenticate({
      employeeId: '123',
      password: 'x',
      totp: '1',
    }).catch((caught: unknown) => caught);

    expect(error).toBeInstanceOf(Error);
    expect((error as Error).message).toBe('Validation failed');
  });
});
