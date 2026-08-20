import { beforeEach, describe, expect, it, vi } from 'vitest';

const apiMock = vi.hoisted(() => ({
  DELETE: vi.fn(),
  GET: vi.fn(),
  POST: vi.fn(),
}));
vi.mock('@/services/generated', () => ({ api: apiMock }));

import { createGrant, listGrants, revokeGrant } from './index';

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

beforeEach(() => {
  Object.values(apiMock).forEach((mock) => {
    mock.mockReset();
  });
});

describe('admin grants V0.2 generated client seam', () => {
  it('读取正式 Grant DTO 并适配现有 principal/scope 展示模型', async () => {
    apiMock.GET.mockResolvedValue(
      result({ items: [formalGrant], nextCursor: null }),
    );

    await expect(
      listGrants({ page: 1, pageSize: 20, principalId: 'account-1' }),
    ).resolves.toMatchObject({
      items: [
        {
          id: 'grant-1',
          principal: { id: 'account-1' },
          scope: { id: 'workspace-1', type: 'WORKSPACE' },
          source: 'MANUAL',
          version: 2,
        },
      ],
      total: 1,
    });
    expect(apiMock.GET).toHaveBeenCalledWith('/api/v1/admin/grants');
  });

  it('全平台 scope 使用中文 fallback，并同时应用 capability/principal 筛选', async () => {
    const platformGrant = {
      ...formalGrant,
      capability: 'identity.account.manage',
      id: 'grant-platform',
      scopeId: null,
      scopeType: 'PLATFORM',
    };
    apiMock.GET.mockResolvedValue(
      result({ items: [formalGrant, platformGrant], nextCursor: null }),
    );

    await expect(
      listGrants({
        capability: 'identity.account.manage',
        page: 1,
        pageSize: 20,
        principalId: 'account-1',
      }),
    ).resolves.toEqual({
      items: [
        expect.objectContaining({
          id: 'grant-platform',
          scope: { id: null, label: '全平台', type: 'PLATFORM' },
        }),
      ],
      total: 1,
    });
  });

  it('缺省筛选返回全部授权', async () => {
    apiMock.GET.mockResolvedValue(
      result({ items: [formalGrant], nextCursor: null }),
    );

    await expect(listGrants({ page: 1, pageSize: 20 })).resolves.toMatchObject({
      items: [{ id: 'grant-1' }],
      total: 1,
    });
  });

  it('创建时把应用层 scope 映射为正式 scopeType/scopeId', async () => {
    apiMock.POST.mockResolvedValue(result(formalGrant));

    await createGrant({
      capability: 'workspace.manage',
      principalId: 'account-1',
      reason: '项目授权',
      scope: { id: 'workspace-1', type: 'WORKSPACE' },
    });
    expect(apiMock.POST).toHaveBeenCalledWith('/api/v1/admin/grants', {
      body: {
        capability: 'workspace.manage',
        principalId: 'account-1',
        reason: '项目授权',
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

  it('撤销用 Grant version 生成 If-Match', async () => {
    apiMock.DELETE.mockResolvedValue(
      result({ ...formalGrant, status: 'REVOKED', version: 3 }),
    );

    await revokeGrant('grant/1', { reason: '权限回收' }, 2);
    expect(apiMock.DELETE).toHaveBeenCalledWith('/api/v1/admin/grants/{id}', {
      body: { reason: '权限回收' },
      params: {
        header: {
          'Idempotency-Key': expect.stringMatching(/^[0-9a-f-]{36}$/),
          'If-Match': '"v2"',
        },
        path: { id: 'grant/1' },
      },
    });
  });
});
