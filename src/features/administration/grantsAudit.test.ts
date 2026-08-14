import { beforeEach, describe, expect, it, vi } from 'vitest';

const apiMock = vi.hoisted(() => ({
  DELETE: vi.fn(),
  GET: vi.fn(),
  POST: vi.fn(),
}));

vi.mock('@/services/generated', () => ({ api: apiMock }));

import * as administration from './index';

type PublicService = (...args: never[]) => Promise<unknown>;

const formalGrant = {
  capability: 'workspace.manage',
  createdAt: '2026-08-13T00:00:00Z',
  id: 'grant-1',
  principalId: 'account-1',
  scopeId: 'workspace-1',
  scopeType: 'WORKSPACE',
  source: 'MANUAL',
  status: 'ACTIVE',
  updatedAt: '2026-08-13T00:00:00Z',
  validFrom: null,
  validTo: null,
  version: 2,
};

const result = <T>(data: T) => ({
  data,
  response: new Response(null, { status: 200 }),
});

function publicService(name: string): PublicService {
  const service = (administration as Record<string, unknown>)[name];
  expect(service, `${name} 应由 administration 公开入口导出`).toBeTypeOf(
    'function',
  );
  return service as PublicService;
}

beforeEach(() => {
  Object.values(apiMock).forEach((mock) => {
    mock.mockReset();
  });
});

describe('administration Grant/Audit V0.2 generated client seam', () => {
  it('Grant 列表通过 generated client 读取并按应用查询过滤', async () => {
    apiMock.GET.mockResolvedValue(
      result({ items: [formalGrant], nextCursor: null }),
    );

    await expect(
      publicService('listGrants')({
        capability: 'workspace.manage',
        page: 1,
        pageSize: 10,
        principalId: 'account-1',
      } as never),
    ).resolves.toMatchObject({
      items: [
        {
          id: 'grant-1',
          principal: { id: 'account-1' },
          scope: { id: 'workspace-1', type: 'WORKSPACE' },
        },
      ],
      total: 1,
    });
    expect(apiMock.GET).toHaveBeenCalledWith('/api/v1/admin/grants');
  });

  it('授予请求映射正式 DTO 并携带幂等键', async () => {
    apiMock.POST.mockResolvedValue(result(formalGrant));

    await publicService('createGrant')({
      capability: 'workspace.manage',
      principalId: 'account-1',
      reason: '承担 Platform Core 治理职责',
      scope: { id: 'workspace-1', type: 'WORKSPACE' },
    } as never);

    expect(apiMock.POST).toHaveBeenCalledWith('/api/v1/admin/grants', {
      body: {
        capability: 'workspace.manage',
        principalId: 'account-1',
        reason: '承担 Platform Core 治理职责',
        scopeId: 'workspace-1',
        scopeType: 'WORKSPACE',
        source: 'MANUAL',
      },
      params: {
        header: {
          'Idempotency-Key': expect.stringMatching(/^[0-9a-f-]{36}$/),
        },
      },
    });
  });

  it('撤销请求保留原始 Grant ID 并由 version 生成 If-Match', async () => {
    apiMock.DELETE.mockResolvedValue(
      result({ ...formalGrant, id: 'grant/1', status: 'REVOKED', version: 3 }),
    );

    await publicService('revokeGrant')(
      'grant/1' as never,
      { reason: '职责已完成' } as never,
      2 as never,
    );

    expect(apiMock.DELETE).toHaveBeenCalledWith('/api/v1/admin/grants/{id}', {
      body: { reason: '职责已完成' },
      params: {
        header: {
          'Idempotency-Key': expect.stringMatching(/^[0-9a-f-]{36}$/),
          'If-Match': '"v2"',
        },
        path: { id: 'grant/1' },
      },
    });
  });

  it('Audit 查询通过 generated client 透传正式 cursor 条件', async () => {
    apiMock.GET.mockResolvedValue(
      result({
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
      }),
    );
    const query = {
      actor: '孙杰',
      cursor: 'opaque-cursor',
      from: '2026-08-01T00:00:00.000Z',
      limit: 3,
      targetType: 'CONFIGURATION',
      to: '2026-08-11T00:00:00.000Z',
    };

    await expect(
      publicService('listAuditEvents')(query as never),
    ).resolves.toMatchObject({
      items: [
        {
          id: 'audit-1',
          result: 'success',
          target: 'CONFIGURATION / identity',
        },
      ],
      nextCursor: 'cursor-2',
    });
    expect(apiMock.GET).toHaveBeenCalledWith('/api/v1/admin/audit-events', {
      params: {
        query: {
          actor: '孙杰',
          cursor: 'opaque-cursor',
          from: '2026-08-01T00:00:00.000Z',
          limit: 3,
          requestId: undefined,
          targetId: undefined,
          targetType: 'CONFIGURATION',
          to: '2026-08-11T00:00:00.000Z',
        },
      },
    });
  });
});
