import { beforeEach, describe, expect, it, vi } from 'vitest';

const apiMock = vi.hoisted(() => ({
  DELETE: vi.fn(),
  GET: vi.fn(),
  POST: vi.fn(),
}));
vi.mock('@/services/generated', () => ({ api: apiMock }));

import {
  inviteWorkspaceLeader,
  listWorkspaceMembers,
  listWorkspaces,
  removeWorkspaceLeader,
  transferWorkspaceOwner,
} from './index';

const result = <T>(data: T) => ({
  data,
  response: new Response(null, { status: 200 }),
});

beforeEach(() => {
  Object.values(apiMock).forEach((mock) => {
    mock.mockReset();
  });
});

describe('admin workspaces V0.2 generated client seam', () => {
  it('把正式 Workspace DTO 适配为现有页面模型', async () => {
    apiMock.GET.mockResolvedValue(
      result({
        items: [
          {
            archivedAt: null,
            id: 'workspace-1',
            name: '平台研发',
            ownerId: 'account-1',
            version: 3,
          },
        ],
        nextCursor: null,
      }),
    );

    await expect(
      listWorkspaces({ page: 1, pageSize: 20 }),
    ).resolves.toMatchObject({
      items: [
        {
          id: 'workspace-1',
          name: '平台研发',
          owner: { id: 'account-1' },
          status: 'ACTIVE',
          version: 3,
        },
      ],
      total: 1,
    });
    expect(apiMock.GET).toHaveBeenCalledWith('/api/v1/admin/workspaces');
  });

  it('成员投影补齐现有展示 ref，但来源仍由 generated DTO 决定', async () => {
    apiMock.GET.mockResolvedValue(
      result({
        items: [
          {
            accountId: 'account-1',
            computedAt: '2026-08-13T00:00:00Z',
            source: 'OWNER',
          },
        ],
      }),
    );

    await expect(listWorkspaceMembers('workspace/1')).resolves.toEqual({
      items: [
        {
          accountId: 'account-1',
          displayName: 'account-1',
          employeeNo: 'account-1',
          source: 'OWNER',
        },
      ],
    });
    expect(apiMock.GET).toHaveBeenCalledWith(
      '/api/v1/admin/workspaces/{id}/members',
      { params: { path: { id: 'workspace/1' } } },
    );
  });

  it('Workspace 并发写使用 version ETag，transfer 映射 newOwnerId', async () => {
    const workspaceResult = result({
      archivedAt: null,
      id: 'workspace-1',
      name: '平台研发',
      ownerId: 'leader-2',
      version: 4,
    });
    apiMock.POST.mockResolvedValue(workspaceResult);
    apiMock.DELETE.mockResolvedValue(workspaceResult);

    await inviteWorkspaceLeader(
      'workspace/1',
      { accountId: 'leader-2', reason: '协作需要' },
      3,
    );
    expect(apiMock.POST).toHaveBeenNthCalledWith(
      1,
      '/api/v1/admin/workspaces/{id}/leaders',
      {
        body: { accountId: 'leader-2', reason: '协作需要' },
        params: {
          header: {
            'Idempotency-Key': expect.stringMatching(/^[0-9a-f-]{36}$/),
            'If-Match': '"v3"',
          },
          path: { id: 'workspace/1' },
        },
      },
    );

    await transferWorkspaceOwner(
      'workspace/1',
      { accountId: 'leader-2', reason: '职责交接' },
      3,
    );
    expect(apiMock.POST).toHaveBeenNthCalledWith(
      2,
      '/api/v1/admin/workspaces/{id}/transfer-owner',
      expect.objectContaining({
        body: { newOwnerId: 'leader-2', reason: '职责交接' },
      }),
    );

    await removeWorkspaceLeader(
      'workspace/1',
      'leader/2',
      { reason: '协作结束' },
      3,
    );
    expect(apiMock.DELETE).toHaveBeenCalledWith(
      '/api/v1/admin/workspaces/{id}/leaders/{accountId}',
      expect.objectContaining({
        params: expect.objectContaining({
          path: { accountId: 'leader/2', id: 'workspace/1' },
        }),
      }),
    );
  });
});
