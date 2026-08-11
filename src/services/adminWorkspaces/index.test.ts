import { beforeEach, describe, expect, it, vi } from 'vitest';

const requestMock = vi.hoisted(() => vi.fn());

vi.mock('@umijs/max', () => ({ request: requestMock }));

import {
  createWorkspace,
  inviteWorkspaceLeader,
  listWorkspaceMembers,
  listWorkspaces,
  removeWorkspaceLeader,
  transferWorkspaceOwner,
} from './index';

beforeEach(() => {
  requestMock.mockReset();
});

describe('admin workspaces service', () => {
  it('查询服务端分页与筛选', async () => {
    const query = {
      keyword: 'platform',
      page: 2,
      pageSize: 10,
      status: 'ACTIVE' as const,
    };
    requestMock.mockResolvedValue({ items: [], total: 0 });

    await expect(listWorkspaces(query)).resolves.toEqual({
      items: [],
      total: 0,
    });
    expect(requestMock).toHaveBeenCalledWith('/api/v1/admin/workspaces', {
      method: 'GET',
      params: query,
    });
  });

  it('创建 Workspace 携带 reason 与 Idempotency-Key', async () => {
    const input = {
      name: '新工作区',
      ownerId: 'leader-1',
      reason: '新项目立项',
    };
    requestMock.mockResolvedValue({ id: 'workspace-new' });

    await createWorkspace(input);
    expect(requestMock).toHaveBeenCalledWith('/api/v1/admin/workspaces', {
      data: input,
      headers: {
        'Idempotency-Key': expect.stringMatching(/^[0-9a-f-]{36}$/),
      },
      method: 'POST',
    });
  });

  it.each([
    {
      invoke: () =>
        inviteWorkspaceLeader('workspace/1', {
          accountId: 'leader-2',
          reason: '协作需要',
        }),
      method: 'POST',
      path: '/api/v1/admin/workspaces/workspace%2F1/leaders',
      payload: { accountId: 'leader-2', reason: '协作需要' },
    },
    {
      invoke: () =>
        removeWorkspaceLeader('workspace/1', 'leader/2', {
          reason: '协作结束',
        }),
      method: 'DELETE',
      path: '/api/v1/admin/workspaces/workspace%2F1/leaders/leader%2F2',
      payload: { reason: '协作结束' },
    },
    {
      invoke: () =>
        transferWorkspaceOwner('workspace/1', {
          accountId: 'leader-2',
          reason: '职责交接',
        }),
      method: 'POST',
      path: '/api/v1/admin/workspaces/workspace%2F1/transfer-owner',
      payload: { accountId: 'leader-2', reason: '职责交接' },
    },
  ])('$path 治理命令带原因与幂等键', async ({
    invoke,
    method,
    path,
    payload,
  }) => {
    requestMock.mockResolvedValue({ id: 'workspace-1' });

    await invoke();
    expect(requestMock).toHaveBeenCalledWith(path, {
      data: payload,
      headers: {
        'Idempotency-Key': expect.stringMatching(/^[0-9a-f-]{36}$/),
      },
      method,
    });
  });

  it('读取只读成员投影', async () => {
    const response = {
      items: [
        {
          accountId: 'leader-1',
          displayName: '示例 Leader',
          employeeNo: '10000001',
          source: 'OWNER' as const,
        },
      ],
    };
    requestMock.mockResolvedValue(response);

    await expect(listWorkspaceMembers('workspace/1')).resolves.toEqual(
      response,
    );
    expect(requestMock).toHaveBeenCalledWith(
      '/api/v1/admin/workspaces/workspace%2F1/members',
      { method: 'GET' },
    );
  });

  it('保留 403 Problem detail 与 requestId', async () => {
    requestMock.mockRejectedValue({
      response: {
        data: {
          detail: '仅 Workspace Owner 可执行该操作',
          requestId: 'req-workspace-403',
          status: 403,
          title: 'FORBIDDEN',
        },
        status: 403,
      },
    });

    await expect(
      removeWorkspaceLeader('workspace-1', 'leader-2', {
        reason: '越权操作',
      }),
    ).rejects.toMatchObject({
      name: 'ApiError',
      problem: { detail: '仅 Workspace Owner 可执行该操作', status: 403 },
      requestId: 'req-workspace-403',
    });
  });
});
