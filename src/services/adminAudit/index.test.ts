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

  it.each([
    ['SUCCESS', 'configuration.grant.create', 'success', 'high'],
    ['success', 'configuration.policy.rollback', 'success', 'high'],
    ['FAILED', 'account.disable', 'rejected', 'low'],
  ] as const)(
    '把 %s / %s 映射为 %s / %s，并补齐缺失 requestId',
    async (result, action, expectedResult, expectedRisk) => {
      apiMock.GET.mockResolvedValue({
        data: {
          items: [
            {
              action,
              actor: 'account-1',
              actorType: 'ACCOUNT',
              correlationId: 'correlation-1',
              id: 'audit-1',
              occurredAt: '2026-08-13T00:00:00Z',
              reason: null,
              requestId: null,
              result,
              schemaVersion: 1,
              targetId: 'target-1',
              targetType: 'ACCOUNT',
            },
          ],
          nextCursor: null,
        },
        response: new Response(null, { status: 200 }),
      });

      await expect(
        listAuditEvents({
          actor: 'account-1',
          from: '2026-08-01T00:00:00Z',
          limit: 50,
          targetId: 'target-1',
          targetType: 'ACCOUNT',
          to: '2026-08-31T23:59:59Z',
        }),
      ).resolves.toMatchObject({
        items: [
          {
            requestId: '—',
            result: expectedResult,
            risk: expectedRisk,
          },
        ],
      });
      expect(apiMock.GET).toHaveBeenCalledWith('/api/v1/admin/audit-events', {
        params: {
          query: {
            actor: 'account-1',
            cursor: undefined,
            from: '2026-08-01T00:00:00Z',
            limit: 50,
            requestId: undefined,
            targetId: 'target-1',
            targetType: 'ACCOUNT',
            to: '2026-08-31T23:59:59Z',
          },
        },
      });
    },
  );
});
