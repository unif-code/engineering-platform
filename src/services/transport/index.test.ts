import { describe, expect, it, vi } from 'vitest';
import { createApiClient } from './index';

describe('transport', () => {
  it('normalizes non-2xx responses to ProblemDetails ApiError', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(
        async () =>
          new Response(JSON.stringify({ title: 'Invalid', detail: 'bad input' }), {
            status: 400,
            headers: { 'Content-Type': 'application/problem+json' },
          }),
      ),
    );
    try {
      const client = createApiClient('/api');
      await expect(client.GET('/ping' as never)).rejects.toMatchObject({
        name: 'ApiError',
        problem: { status: 400, title: 'Invalid', detail: 'bad input' },
      });
    } finally {
      vi.unstubAllGlobals();
    }
  });
});
