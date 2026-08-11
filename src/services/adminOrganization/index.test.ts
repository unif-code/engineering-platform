import { beforeEach, describe, expect, it, vi } from 'vitest';

const requestMock = vi.hoisted(() => vi.fn());

vi.mock('@umijs/max', () => ({ request: requestMock }));

import { getOrganizationTree, setOrganizationSuperior } from './index';

beforeEach(() => {
  requestMock.mockReset();
});

describe('admin organization service', () => {
  it('读取 mock-only 组织树 DTO', async () => {
    const response = {
      items: [
        {
          children: [],
          displayName: '示例经理',
          employeeNo: '10000001',
          id: 'manager-1',
          kind: 'MANAGER' as const,
          superiorId: null,
        },
      ],
    };
    requestMock.mockResolvedValue(response);

    await expect(getOrganizationTree()).resolves.toEqual(response);
    expect(requestMock).toHaveBeenCalledWith(
      '/api/v1/admin/organization/tree',
      { method: 'GET' },
    );
  });

  it('调整归属发送 reason、目标 superiorId 与新的 Idempotency-Key', async () => {
    requestMock.mockResolvedValue(undefined);

    await expect(
      setOrganizationSuperior('account/1', {
        reason: '团队调整',
        superiorId: 'leader-2',
      }),
    ).resolves.toBeUndefined();
    expect(requestMock).toHaveBeenCalledWith(
      '/api/v1/admin/accounts/account%2F1/superior',
      {
        data: { reason: '团队调整', superiorId: 'leader-2' },
        headers: {
          'Idempotency-Key': expect.stringMatching(/^[0-9a-f-]{36}$/),
        },
        method: 'PUT',
      },
    );
  });

  it('保留 409 Problem 原文与 requestId', async () => {
    requestMock.mockRejectedValue({
      response: {
        data: {
          detail: '目标关系会形成组织环',
          requestId: 'req-org-409',
          status: 409,
          title: 'ORGANIZATION_CONFLICT',
        },
        status: 409,
      },
    });

    await expect(
      setOrganizationSuperior('leader-1', {
        reason: '错误归属',
        superiorId: 'manager-1',
      }),
    ).rejects.toMatchObject({
      name: 'ApiError',
      problem: { detail: '目标关系会形成组织环', status: 409 },
      requestId: 'req-org-409',
    });
  });
});
