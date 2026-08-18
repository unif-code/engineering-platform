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
        nextCursor: null,
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
    ).resolves.toEqual({ items: [account], total: 1 });
    expect(apiMock.GET).toHaveBeenCalledWith('/api/v1/admin/accounts', {
      params: { query: { cursor: undefined, limit: 100 } },
    });
  });

  it('遍历 cursor 后再做全局分页，第二页不会重复第一页', async () => {
    const firstAccount = {
      displayName: '第一页用户',
      employeeNo: '10000001',
      etag: '"v1"',
      id: 'account-1',
      profession: '研发',
      status: 'ENABLED' as const,
    };
    const secondAccount = {
      displayName: '第二页用户',
      employeeNo: '10000002',
      etag: '"v1"',
      id: 'account-2',
      profession: '产品',
      status: 'ENABLED' as const,
    };
    apiMock.GET.mockResolvedValueOnce(
      result({ items: [firstAccount], nextCursor: 'cursor-2' }),
    ).mockResolvedValueOnce(result({ items: [secondAccount] }));

    await expect(listAccounts({ page: 2, pageSize: 1 })).resolves.toEqual({
      items: [secondAccount],
      total: 2,
    });
    expect(apiMock.GET).toHaveBeenNthCalledWith(2, '/api/v1/admin/accounts', {
      params: { query: { cursor: 'cursor-2', limit: 100 } },
    });
  });

  it('筛选会覆盖全部 cursor 页面而不是只检查第一页', async () => {
    const matchingAccount = {
      displayName: '后续页目标用户',
      employeeNo: '10000002',
      etag: '"v1"',
      id: 'account-2',
      profession: '产品',
      status: 'ENABLED' as const,
    };
    apiMock.GET.mockResolvedValueOnce(
      result({
        items: [
          {
            ...matchingAccount,
            displayName: '第一页其他用户',
            id: 'account-1',
          },
        ],
        nextCursor: 'cursor-2',
      }),
    ).mockResolvedValueOnce(result({ items: [matchingAccount] }));

    await expect(
      listAccounts({
        displayName: '目标',
        page: 1,
        pageSize: 20,
      }),
    ).resolves.toEqual({ items: [matchingAccount], total: 1 });
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
    const temporaryPassword = `Temp!${crypto.randomUUID()}`;
    const receipt = {
      account: {
        displayName: '示例用户',
        employeeNo: '10000001',
        etag: '"v5"',
        id: 'account-1',
        profession: null,
        status: 'ENABLED',
      },
      temporaryPassword,
    };
    apiMock.POST.mockResolvedValue(result(receipt));

    await expect(
      resetAccountPassword('account-1', { reason: '用户忘记密码' }, '"v4"'),
    ).resolves.toEqual(receipt);
    expect(apiMock.POST).toHaveBeenCalledWith(
      '/api/v1/admin/accounts/{id}/reset-password',
      {
        body: { reason: '用户忘记密码' },
        params: {
          header: {
            'Idempotency-Key': expect.stringMatching(/^[0-9a-f-]{36}$/),
            'If-Match': '"v4"',
          },
          path: { id: 'account-1' },
        },
      },
    );
  });
});
