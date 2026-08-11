import { beforeEach, describe, expect, it, vi } from 'vitest';

const requestMock = vi.hoisted(() => vi.fn());

vi.mock('@umijs/max', () => ({ request: requestMock }));

import {
  createAccount,
  disableAccount,
  enableAccount,
  listAccounts,
  resetAccountPassword,
  resetAccountTotp,
} from './index';

beforeEach(() => {
  requestMock.mockReset();
});

describe('admin accounts service', () => {
  it('按 mock-only 临时契约查询服务端分页账号', async () => {
    const response = {
      items: [
        {
          displayName: '示例用户甲',
          employeeNo: '10000001',
          id: 'account-1',
          profession: '研发',
          status: 'ENABLED' as const,
        },
      ],
      total: 1,
    };
    requestMock.mockResolvedValue(response);
    const query = {
      displayName: '示例',
      page: 2,
      pageSize: 10,
      profession: '研发',
      sortBy: 'employeeNo' as const,
      sortOrder: 'desc' as const,
      status: 'ENABLED' as const,
    };

    await expect(listAccounts(query)).resolves.toEqual(response);
    expect(requestMock).toHaveBeenCalledWith('/api/v1/admin/accounts', {
      method: 'GET',
      params: query,
    });
  });

  it('创建账号时发送原因与新的 Idempotency-Key', async () => {
    const input = {
      displayName: '新用户',
      employeeNo: '10000009',
      profession: '测试',
      reason: '项目入职',
    };
    const response = {
      account: {
        displayName: '新用户',
        employeeNo: '10000009',
        id: 'account-9',
        profession: '测试',
        status: 'PENDING_INIT' as const,
      },
      temporaryPassword: 'Temp!10000009#2026',
    };
    requestMock.mockResolvedValue(response);

    await expect(createAccount(input)).resolves.toEqual(response);
    expect(requestMock).toHaveBeenCalledWith('/api/v1/admin/accounts', {
      data: input,
      headers: {
        'Idempotency-Key': expect.stringMatching(/^[0-9a-f-]{36}$/),
      },
      method: 'POST',
    });
  });

  it('重置密码时发送 reason，并保留一次性临时密码回执', async () => {
    const response = {
      account: {
        displayName: '示例用户甲',
        employeeNo: '10000001',
        id: 'account/1',
        profession: '研发',
        status: 'ENABLED' as const,
      },
      temporaryPassword: 'Reset!10000001#2026',
    };
    requestMock.mockResolvedValue(response);

    await expect(
      resetAccountPassword('account/1', { reason: '用户忘记密码' }),
    ).resolves.toEqual(response);
    expect(requestMock).toHaveBeenCalledWith(
      '/api/v1/admin/accounts/account%2F1/reset-password',
      {
        data: { reason: '用户忘记密码' },
        headers: {
          'Idempotency-Key': expect.stringMatching(/^[0-9a-f-]{36}$/),
        },
        method: 'POST',
      },
    );
  });

  it.each([
    {
      invoke: () => enableAccount('account-1', { reason: '恢复访问' }),
      path: '/api/v1/admin/accounts/account-1/enable',
      reason: '恢复访问',
    },
    {
      invoke: () => disableAccount('account-1', { reason: '账号停用' }),
      path: '/api/v1/admin/accounts/account-1/disable',
      reason: '账号停用',
    },
    {
      invoke: () => resetAccountTotp('account-1', { reason: '更换设备' }),
      path: '/api/v1/admin/accounts/account-1/totp-reset',
      reason: '更换设备',
    },
  ])(
    '$path 成功保留 204 void，并携带 reason 与幂等键',
    async ({ invoke, path, reason }) => {
      requestMock.mockResolvedValue(undefined);

      await expect(invoke()).resolves.toBeUndefined();
      expect(requestMock).toHaveBeenCalledWith(path, {
        data: { reason },
        headers: {
          'Idempotency-Key': expect.stringMatching(/^[0-9a-f-]{36}$/),
        },
        method: 'POST',
      });
    },
  );

  it('将 403 Problem 原文与 requestId 归一为 ApiError', async () => {
    requestMock.mockRejectedValue({
      response: {
        data: {
          detail: '无账号治理权限',
          requestId: 'req-account-403',
          status: 403,
          title: 'FORBIDDEN',
        },
        status: 403,
      },
    });

    await expect(
      createAccount({
        displayName: '无权创建',
        employeeNo: '10000009',
        reason: '测试拒绝分支',
      }),
    ).rejects.toMatchObject({
      name: 'ApiError',
      problem: { detail: '无账号治理权限', status: 403 },
      requestId: 'req-account-403',
    });
  });
});
