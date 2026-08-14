import { beforeEach, describe, expect, it, vi } from 'vitest';

const apiMock = vi.hoisted(() => ({ GET: vi.fn(), POST: vi.fn() }));
vi.mock('@/services/generated', () => ({ api: apiMock }));

import { enableAccount, listAccounts, resetAccountPassword } from './index';

const result = <T>(data: T) => ({
  data,
  response: new Response(null, { status: 200 }),
});

beforeEach(() => {
  apiMock.GET.mockReset();
  apiMock.POST.mockReset();
});

describe('admin accounts V0.2 generated client seam', () => {
  it('只把 cursor/limit 发送给 generated list，并保留 account etag', async () => {
    const account = {
      displayName: '示例用户',
      employeeNo: '10000001',
      etag: '"v3"',
      id: 'account-1',
      profession: '研发',
      status: 'ENABLED',
    };
    apiMock.GET.mockResolvedValue(
      result({
        items: [
          {
            ...account,
            displayName: '停用用户',
            id: 'account-disabled',
            status: 'DISABLED',
          },
          account,
        ],
        nextCursor: 'cursor-2',
      }),
    );

    await expect(
      listAccounts({
        displayName: '示例',
        page: 1,
        pageSize: 20,
        sortBy: 'displayName',
        sortOrder: 'asc',
        status: 'ENABLED',
      }),
    ).resolves.toEqual({ items: [account], nextCursor: 'cursor-2', total: 2 });
    expect(apiMock.GET).toHaveBeenCalledWith('/api/v1/admin/accounts', {
      params: { query: { cursor: undefined, limit: 20 } },
    });
  });

  it('账号写操作同时携带 Idempotency-Key 与服务端 etag', async () => {
    apiMock.POST.mockResolvedValue({
      data: undefined,
      response: new Response(null, { status: 204 }),
    });

    await enableAccount('account/1', { reason: '恢复访问' }, '"v3"');
    expect(apiMock.POST).toHaveBeenCalledWith(
      '/api/v1/admin/accounts/{id}/enable',
      {
        body: { reason: '恢复访问' },
        params: {
          header: {
            'Idempotency-Key': expect.stringMatching(/^[0-9a-f-]{36}$/),
            'If-Match': '"v3"',
          },
          path: { id: 'account/1' },
        },
      },
    );
  });

  it('重置密码保留一次性凭据回执并使用 If-Match', async () => {
    const receipt = {
      account: {
        displayName: '示例用户',
        employeeNo: '10000001',
        etag: '"v5"',
        id: 'account-1',
        profession: null,
        status: 'ENABLED',
      },
      temporaryPassword: 'Temporary!2026',
    };
    apiMock.POST.mockResolvedValue(result(receipt));

    await expect(
      resetAccountPassword('account-1', { reason: '用户忘记密码' }, '"v4"'),
    ).resolves.toEqual(receipt);
  });
});
