import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
  createMockRequester,
  type MockRoutes,
} from '../tests/mockRequestHarness';

vi.mock('@umijs/max', () => ({
  defineMock: <T,>(routes: T) => routes,
}));

import { createAdminAuditMock } from './adminAudit';

let routes: MockRoutes;
const requestThroughMock = createMockRequester(() => routes);

beforeEach(() => {
  routes = createAdminAuditMock();
});

describe('admin audit mock-only contract', () => {
  it('cursor 连续遍历三页无重复、无遗漏，并在末页结束', async () => {
    const ids: string[] = [];
    let cursor: string | undefined;
    const cursors: Array<string | null> = [];

    for (let page = 0; page < 3; page += 1) {
      const response = (await requestThroughMock(
        '/api/v1/admin/audit-events',
        {
          params: { cursor, limit: 3 },
        },
      )) as {
        items: Array<{ id: string; requestId: string }>;
        nextCursor: string | null;
      };
      expect(response.items).toHaveLength(3);
      expect(response.items.every(({ requestId }) => requestId.length > 0)).toBe(
        true,
      );
      ids.push(...response.items.map(({ id }) => id));
      cursors.push(response.nextCursor);
      cursor = response.nextCursor ?? undefined;
    }

    expect(ids).toHaveLength(9);
    expect(new Set(ids).size).toBe(9);
    expect(cursors[0]).toEqual(expect.any(String));
    expect(cursors[1]).toEqual(expect.any(String));
    expect(cursors[2]).toBeNull();
  });

  it('同时应用时间、actor 与 targetType 过滤', async () => {
    const response = (await requestThroughMock(
      '/api/v1/admin/audit-events',
      {
        params: {
          actor: '孙杰',
          from: '2026-08-10T00:00:00+08:00',
          limit: 20,
          targetType: 'CONFIGURATION',
          to: '2026-08-10T23:59:59+08:00',
        },
      },
    )) as { items: Array<{ id: string }>; nextCursor: string | null };

    expect(response).toEqual({
      items: [expect.objectContaining({ id: 'AUD-2026-0810-001' })],
      nextCursor: null,
    });
  });
});
