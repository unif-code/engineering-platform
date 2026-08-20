import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  ApiError,
  createApiClient,
  entityTag,
  normalizeApiError,
  onUnauthorized,
  requireApiData,
} from './index';

const stubFetch = (impl: () => Promise<Response>) => {
  vi.stubGlobal('fetch', vi.fn(impl));
};

afterEach(() => {
  vi.unstubAllGlobals();
  onUnauthorized(() => undefined);
});

describe('transport', () => {
  it('从 generated client 响应中提取 data，并拒绝缺少 payload 的成功响应', () => {
    const response = new Response(null, { status: 200 });

    expect(requireApiData({ data: { id: 'account-1' }, response })).toEqual({
      id: 'account-1',
    });
    expect(() => requireApiData({ data: undefined, response })).toThrowError(
      expect.objectContaining({ name: 'ApiError' }),
    );
  });

  it('将服务端 revision/version 转成强 ETag', () => {
    expect(entityTag(7)).toBe('"v7"');
  });

  it('generated path 已包含 /api 前缀，默认客户端不会拼成 /api/api/v1', async () => {
    const fetchMock = vi.fn(async (_request: Request) =>
      Response.json({ employeeId: 'employee-1', name: '测试用户' }),
    );
    vi.stubGlobal('fetch', fetchMock);

    const client = createApiClient();
    await client.GET('/api/v1/me' as never);

    const request = fetchMock.mock.calls[0]?.[0] as Request;
    expect(new URL(request.url).pathname).toBe('/api/v1/me');
  });

  it('normalizeApiError 原样返回既有 ApiError', () => {
    const existing = new ApiError({
      detail: 'keep me',
      status: 409,
      title: 'CONFLICT',
    });

    expect(normalizeApiError(existing)).toBe(existing);
  });

  it('normalizeApiError 从 Umi rejection 提取 Problem 并合并 HTTP status', () => {
    const normalized = normalizeApiError({
      response: {
        data: {
          detail: '员工号或密码错误',
          requestId: 'req-auth-1',
          title: 'INVALID_CREDENTIALS',
        },
        status: 401,
      },
    });

    expect(normalized).toMatchObject({
      name: 'ApiError',
      problem: {
        detail: '员工号或密码错误',
        requestId: 'req-auth-1',
        status: 401,
        title: 'INVALID_CREDENTIALS',
      },
      requestId: 'req-auth-1',
    });
  });

  it('normalizeApiError 保留服务端已声明的 Problem status', () => {
    const normalized = normalizeApiError({
      response: {
        data: { status: 409, title: 'CONFLICT' },
        status: 500,
        statusText: 'Internal Server Error',
      },
    });

    expect(normalized.problem).toEqual({ status: 409, title: 'CONFLICT' });
  });

  it.each([
    {
      data: 'upstream unavailable',
      expected: {
        detail: 'upstream unavailable',
        status: 502,
        title: 'Bad Gateway',
      },
    },
    {
      data: '',
      expected: { status: 502, title: 'Bad Gateway' },
    },
    {
      data: ['upstream unavailable'],
      expected: { status: 502, title: 'Bad Gateway' },
    },
    {
      data: null,
      expected: { status: 502, title: 'Bad Gateway' },
    },
  ])(
    'normalizeApiError 将文本或空 HTTP 响应归一为 ApiError',
    ({ data, expected }) => {
      const normalized = normalizeApiError({
        response: { data, status: 502, statusText: 'Bad Gateway' },
      });

      expect(normalized).toMatchObject({
        name: 'ApiError',
        problem: expected,
      });
    },
  );

  it.each([
    {
      error: new TypeError('fetch failed'),
      expected: { detail: 'fetch failed', title: 'NETWORK_ERROR' },
    },
    {
      error: new DOMException('The operation was aborted.', 'AbortError'),
      expected: {
        detail: 'The operation was aborted.',
        title: 'REQUEST_ABORTED',
      },
    },
    {
      error: 'socket closed',
      expected: { detail: 'socket closed', title: 'NETWORK_ERROR' },
    },
  ])('normalizeApiError 归一 network 与 abort 错误', ({ error, expected }) => {
    expect(normalizeApiError(error)).toMatchObject({
      name: 'ApiError',
      problem: expected,
    });
  });

  it('normalizeApiError 在 statusText 缺失时生成 HTTP status 标题', () => {
    expect(
      normalizeApiError({ response: { data: undefined, status: 503 } }),
    ).toMatchObject({
      problem: { status: 503, title: 'HTTP 503' },
    });
  });

  it('response status 不是数字时按 network rejection 收敛', () => {
    const rejection = { response: { data: null, status: '503' } };

    expect(normalizeApiError(rejection)).toMatchObject({
      cause: rejection,
      problem: { detail: '[object Object]', title: 'NETWORK_ERROR' },
    });
  });

  it('ApiError 在 Problem 没有 title 时生成稳定错误标题', () => {
    expect(new ApiError({ status: 418 })).toMatchObject({
      message: 'HTTP 418',
      requestId: undefined,
    });
    expect(new ApiError({})).toMatchObject({
      message: 'HTTP error',
      requestId: undefined,
    });
  });

  it('normalizeApiError 对 401 只做纯转换，不触发 unauthorized handler', () => {
    const handler = vi.fn();
    onUnauthorized(handler);

    normalizeApiError({
      response: {
        data: { detail: '登录失败', title: 'INVALID_CREDENTIALS' },
        status: 401,
      },
    });

    expect(handler).not.toHaveBeenCalled();
  });

  it('normalizes non-2xx responses to ProblemDetails ApiError', async () => {
    stubFetch(
      async () =>
        new Response(
          JSON.stringify({ title: 'Invalid', detail: 'bad input' }),
          {
            status: 400,
            headers: { 'Content-Type': 'application/problem+json' },
          },
        ),
    );
    const client = createApiClient('/api');
    await expect(client.GET('/ping' as never)).rejects.toMatchObject({
      name: 'ApiError',
      problem: { status: 400, title: 'Invalid', detail: 'bad input' },
    });
  });

  it('handles non-object error bodies without throwing raw TypeError', async () => {
    stubFetch(async () => new Response('null', { status: 500 }));
    const client = createApiClient('/api');
    await expect(client.GET('/ping' as never)).rejects.toMatchObject({
      name: 'ApiError',
      problem: { status: 500 },
    });
  });

  it('uses a stable title when an invalid JSON response has no statusText', async () => {
    stubFetch(async () => new Response('upstream exploded', { status: 500 }));
    const client = createApiClient('/api');

    await expect(client.GET('/ping' as never)).rejects.toMatchObject({
      problem: {
        detail: 'upstream exploded',
        status: 500,
        title: 'HTTP error',
      },
    });
  });

  it('preserves a Problem status already returned by the server', async () => {
    stubFetch(async () =>
      Response.json({ status: 409, title: 'CONFLICT' }, { status: 500 }),
    );
    const client = createApiClient('/api');

    await expect(client.GET('/ping' as never)).rejects.toMatchObject({
      problem: { status: 409, title: 'CONFLICT' },
    });
  });

  it('calls the registered unauthorized handler for 401 responses', async () => {
    const handler = vi.fn();
    onUnauthorized(handler);
    stubFetch(
      async () =>
        new Response(JSON.stringify({ title: 'Unauthorized' }), {
          status: 401,
          headers: { 'Content-Type': 'application/problem+json' },
        }),
    );
    const client = createApiClient('/api');

    await expect(client.GET('/ping' as never)).rejects.toMatchObject({
      name: 'ApiError',
      problem: { status: 401, title: 'Unauthorized' },
    });
    expect(handler).toHaveBeenCalledOnce();
  });

  it.each(['/api/v1/auth/login', '/api/v1/auth/logout'])(
    '%s 的业务 401 不触发 Session 失效回调',
    async (path) => {
      const handler = vi.fn();
      onUnauthorized(handler);
      stubFetch(
        async () =>
          new Response(JSON.stringify({ detail: '认证操作失败' }), {
            status: 401,
            headers: { 'Content-Type': 'application/problem+json' },
          }),
      );
      const client = createApiClient('/api');

      await expect(client.POST(path as never)).rejects.toMatchObject({
        name: 'ApiError',
        problem: { detail: '认证操作失败', status: 401 },
      });
      expect(handler).not.toHaveBeenCalled();
    },
  );

  it('does not let unauthorized handler errors mask the 401 ApiError', async () => {
    const handler = vi.fn(() => {
      throw new Error('redirect failed');
    });
    onUnauthorized(handler);
    stubFetch(
      async () =>
        new Response(
          JSON.stringify({
            title: 'Unauthorized',
            detail: 'Session expired',
            requestId: 'req-401',
          }),
          {
            status: 401,
            headers: { 'Content-Type': 'application/problem+json' },
          },
        ),
    );
    const client = createApiClient('/api');

    await expect(client.GET('/ping' as never)).rejects.toMatchObject({
      name: 'ApiError',
      requestId: 'req-401',
      problem: {
        status: 401,
        title: 'Unauthorized',
        detail: 'Session expired',
        requestId: 'req-401',
      },
    });
    expect(handler).toHaveBeenCalledOnce();
  });

  it('extracts requestId from a Problem Details extension', async () => {
    stubFetch(
      async () =>
        new Response(
          JSON.stringify({ title: 'Forbidden', requestId: 'req-1' }),
          {
            status: 403,
            headers: { 'Content-Type': 'application/problem+json' },
          },
        ),
    );
    const client = createApiClient('/api');

    await expect(client.GET('/ping' as never)).rejects.toMatchObject({
      name: 'ApiError',
      requestId: 'req-1',
      problem: { status: 403, title: 'Forbidden', requestId: 'req-1' },
    });
  });

  it('normalizes network failures to ApiError with NETWORK_ERROR', async () => {
    stubFetch(async () => {
      throw new TypeError('fetch failed');
    });
    const client = createApiClient('/api');
    await expect(client.GET('/ping' as never)).rejects.toMatchObject({
      name: 'ApiError',
      problem: { title: 'NETWORK_ERROR', detail: 'fetch failed' },
    });
  });

  it('normalizes aborted requests to ApiError with REQUEST_ABORTED', async () => {
    stubFetch(async () => {
      throw new DOMException('The operation was aborted.', 'AbortError');
    });
    const client = createApiClient('/api');
    await expect(client.GET('/ping' as never)).rejects.toMatchObject({
      name: 'ApiError',
      problem: { title: 'REQUEST_ABORTED' },
    });
  });
});
