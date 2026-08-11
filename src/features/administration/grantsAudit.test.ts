import { beforeEach, describe, expect, it, vi } from 'vitest';

const requestMock = vi.hoisted(() => vi.fn());

vi.mock('@umijs/max', () => ({ request: requestMock }));

import * as administration from './index';

type PublicService = (...args: never[]) => Promise<unknown>;

function publicService(name: string): PublicService {
  const service = (administration as Record<string, unknown>)[name];
  expect(service, `${name} 应由 administration 公开入口导出`).toBeTypeOf(
    'function',
  );
  return service as PublicService;
}

beforeEach(() => {
  requestMock.mockReset();
});

describe('administration Grant mock-only domain seam', () => {
  it('Grant 列表按 principal 与 capability 查询服务端分页', async () => {
    const query = {
      capability: 'audit.read',
      page: 2,
      pageSize: 10,
      principalId: 'account-1',
    };
    const response = { items: [], total: 0 };
    requestMock.mockResolvedValue(response);

    await expect(publicService('listGrants')(query as never)).resolves.toEqual(
      response,
    );
    expect(requestMock).toHaveBeenCalledWith('/api/v1/admin/grants', {
      method: 'GET',
      params: query,
    });
  });

  it('授予请求保留 principal × capability × scope 与 reason', async () => {
    const input = {
      capability: 'workspace.manage',
      principalId: 'account-2',
      reason: '承担 Platform Core 治理职责',
      scope: { id: 'workspace-platform-core', type: 'WORKSPACE' },
    };
    requestMock.mockResolvedValue({ id: 'grant-new' });

    await publicService('createGrant')(input as never);

    expect(requestMock).toHaveBeenCalledWith('/api/v1/admin/grants', {
      data: input,
      headers: {
        'Idempotency-Key': expect.stringMatching(/^[0-9a-f-]{36}$/),
      },
      method: 'POST',
    });
  });

  it('撤销请求编码 Grant ID 并携带 reason', async () => {
    const input = { reason: '职责已完成' };
    requestMock.mockResolvedValue({ id: 'grant/1', status: 'REVOKED' });

    await publicService('revokeGrant')('grant/1' as never, input as never);

    expect(requestMock).toHaveBeenCalledWith('/api/v1/admin/grants/grant%2F1', {
      data: input,
      headers: {
        'Idempotency-Key': expect.stringMatching(/^[0-9a-f-]{36}$/),
      },
      method: 'DELETE',
    });
  });
});
