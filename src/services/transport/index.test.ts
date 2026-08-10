import { afterEach, describe, expect, it, vi } from 'vitest';
import { createApiClient, onUnauthorized } from './index';

const stubFetch = (impl: () => Promise<Response>) => {
  vi.stubGlobal('fetch', vi.fn(impl));
};

afterEach(() => {
  vi.unstubAllGlobals();
  onUnauthorized(() => undefined);
});

describe('transport', () => {
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
