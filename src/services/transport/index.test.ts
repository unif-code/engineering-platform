import { afterEach, describe, expect, it, vi } from 'vitest';
import { createApiClient } from './index';

const stubFetch = (impl: () => Promise<Response>) => {
  vi.stubGlobal('fetch', vi.fn(impl));
};

afterEach(() => {
  vi.unstubAllGlobals();
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
