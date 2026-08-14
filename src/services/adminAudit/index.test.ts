import { beforeEach, describe, expect, it, vi } from 'vitest';

const apiMock = vi.hoisted(() => ({ GET: vi.fn() }));
vi.mock('@/services/generated', () => ({ api: apiMock }));

import { listAuditEvents } from './index';

beforeEach(() => apiMock.GET.mockReset());

describe('admin audit V0.2 generated client seam', () => {
  it('发送正式 cursor/requestId 查询并适配审计展示字段', async () => {
    apiMock.GET.mockResolvedValue({
      data: {
        items: [
          {
            action: 'configuration.policy.publish',
            actor: 'account-1',
            actorType: 'ACCOUNT',
            correlationId: 'correlation-1',
            id: 'audit-1',
            occurredAt: '2026-08-13T00:00:00Z',
            reason: '策略发布',
            requestId: 'request-1',
            result: 'SUCCESS',
            schemaVersion: 1,
            targetId: 'identity',
            targetType: 'CONFIGURATION',
          },
        ],
        nextCursor: 'cursor-2',
      },
      response: new Response(null, { status: 200 }),
    });

    await expect(
      listAuditEvents({
        cursor: 'cursor-1',
        limit: 20,
        requestId: 'request-1',
      }),
    ).resolves.toMatchObject({
      items: [
        {
          action: 'configuration.policy.publish',
          requestId: 'request-1',
          result: 'success',
          summary: 'configuration.policy.publish · CONFIGURATION / identity',
          target: 'CONFIGURATION / identity',
        },
      ],
      nextCursor: 'cursor-2',
    });
    expect(apiMock.GET).toHaveBeenCalledWith('/api/v1/admin/audit-events', {
      params: {
        query: {
          actor: undefined,
          cursor: 'cursor-1',
          from: undefined,
          limit: 20,
          requestId: 'request-1',
          targetId: undefined,
          targetType: undefined,
          to: undefined,
        },
      },
    });
  });
});
