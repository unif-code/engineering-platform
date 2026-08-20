import { beforeEach, describe, expect, it, vi } from 'vitest';

const apiMock = vi.hoisted(() => ({ GET: vi.fn(), POST: vi.fn() }));
vi.mock('@/services/generated', () => ({ api: apiMock }));

import {
  createAccount,
  disableAccount,
  enableAccount,
  listAccounts,
  resetAccountPassword,
  resetAccountTotp,
} from './index';

const result = <T>(data: T) => ({
  data,
  response: new Response(null, { status: 200 }),
});

const account = (
  id: string,
  overrides: Partial<{
    displayName: string;
    employeeNo: string;
    profession: string | null;
    status: 'DISABLED' | 'ENABLED';
  }> = {},
) => ({
  displayName: `用户${id}`,
  employeeNo: id,
  etag: '"v1"',
  id: `account-${id}`,
  profession: '研发',
  status: 'ENABLED' as const,
  ...overrides,
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

  it('重复 cursor 会在第三次请求前关闭分页环路', async () => {
    apiMock.GET.mockResolvedValueOnce(
      result({ items: [account('1')], nextCursor: 'cursor-repeat' }),
    ).mockResolvedValueOnce(
      result({ items: [account('2')], nextCursor: 'cursor-repeat' }),
    );

    await expect(
      listAccounts({ cursor: 'cursor-start', page: 1, pageSize: 20 }),
    ).rejects.toThrow('账号列表返回了重复 cursor，已停止继续分页');
    expect(apiMock.GET).toHaveBeenCalledTimes(2);
  });

  it('trim 后按 employeeNo、displayName、profession 与 status 联合筛选', async () => {
    const matching = account('A-100', {
      displayName: 'Alice Chen',
      profession: 'Platform Engineer',
    });
    apiMock.GET.mockResolvedValue(
      result({
        items: [
          matching,
          account('B-200', { profession: null }),
          account('C-300', { status: 'DISABLED' }),
        ],
        nextCursor: null,
      }),
    );

    await expect(
      listAccounts({
        displayName: ' alice ',
        employeeNo: ' a-1 ',
        page: 1,
        pageSize: 20,
        profession: ' engineer ',
        status: 'ENABLED',
      }),
    ).resolves.toEqual({ items: [matching], total: 1 });
  });

  it.each([
    ['employeeNo', 'desc', ['account-2', 'account-1']],
    ['profession', 'asc', ['account-2', 'account-1']],
    ['status', 'asc', ['account-2', 'account-1']],
  ] as const)(
    '按 %s %s 排序，并把 null 字段作为空字符串',
    async (sortBy, sortOrder, expectedIds) => {
      apiMock.GET.mockResolvedValue(
        result({
          items: [
            account('1', { profession: '研发', status: 'ENABLED' }),
            account('2', { profession: null, status: 'DISABLED' }),
          ],
          nextCursor: null,
        }),
      );

      const response = await listAccounts({
        page: 1,
        pageSize: 20,
        sortBy,
        sortOrder,
      });

      expect(response.items.map(({ id }) => id)).toEqual(expectedIds);
    },
  );

  it('未指定 sortBy 时保留服务端顺序', async () => {
    apiMock.GET.mockResolvedValue(
      result({
        items: [account('2'), account('1')],
        nextCursor: null,
      }),
    );

    const response = await listAccounts({ page: 1, pageSize: 20 });

    expect(response.items.map(({ id }) => id)).toEqual([
      'account-2',
      'account-1',
    ]);
  });

  it('排序时右侧 null 字段也按空字符串处理', async () => {
    apiMock.GET.mockResolvedValue(
      result({
        items: [
          account('2', { profession: null }),
          account('1', { profession: '研发' }),
        ],
        nextCursor: null,
      }),
    );

    const response = await listAccounts({
      page: 1,
      pageSize: 20,
      sortBy: 'profession',
      sortOrder: 'asc',
    });

    expect(response.items.map(({ id }) => id)).toEqual([
      'account-2',
      'account-1',
    ]);
  });

  it('创建账号携带幂等键并返回一次性凭据', async () => {
    const temporaryPassword = `Temp!${crypto.randomUUID()}`;
    const receipt = {
      account: account('10000001'),
      temporaryPassword,
    };
    apiMock.POST.mockResolvedValue(result(receipt));

    await expect(
      createAccount({
        displayName: '新增用户',
        employeeNo: '10000001',
        profession: null,
        reason: '批量入职',
      }),
    ).resolves.toEqual(receipt);
    expect(apiMock.POST).toHaveBeenCalledWith('/api/v1/admin/accounts', {
      body: {
        displayName: '新增用户',
        employeeNo: '10000001',
        profession: null,
        reason: '批量入职',
      },
      params: {
        header: {
          'Idempotency-Key': expect.stringMatching(/^[0-9a-f-]{36}$/),
        },
      },
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

  it.each([
    ['停用账号', disableAccount, '/api/v1/admin/accounts/{id}/disable'],
    ['重置 TOTP', resetAccountTotp, '/api/v1/admin/accounts/{id}/totp-reset'],
  ] as const)(
    '%s 使用正式 action path 与 If-Match',
    async (_label, action, path) => {
      apiMock.POST.mockResolvedValue({
        data: undefined,
        response: new Response(null, { status: 204 }),
      });

      await action('account-2', { reason: '治理操作' }, '"v8"');

      expect(apiMock.POST).toHaveBeenCalledWith(path, {
        body: { reason: '治理操作' },
        params: {
          header: {
            'Idempotency-Key': expect.stringMatching(/^[0-9a-f-]{36}$/),
            'If-Match': '"v8"',
          },
          path: { id: 'account-2' },
        },
      });
    },
  );

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
