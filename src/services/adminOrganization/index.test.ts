import { beforeEach, describe, expect, it, vi } from 'vitest';

const apiMock = vi.hoisted(() => ({ GET: vi.fn(), PUT: vi.fn() }));
vi.mock('@/services/generated', () => ({ api: apiMock }));

import { getOrganizationTree, setOrganizationSuperior } from './index';

beforeEach(() => {
  apiMock.GET.mockReset();
  apiMock.PUT.mockReset();
});

describe('admin organization V0.2 generated client seam', () => {
  it('把 managers/leaders/members 正式投影适配为现有递归树', async () => {
    apiMock.GET.mockResolvedValue({
      data: {
        managers: [
          {
            account: {
              displayName: '经理',
              employeeNo: '10000001',
              id: 'manager-1',
            },
            leaders: [
              {
                account: {
                  displayName: 'Leader',
                  employeeNo: '10000002',
                  id: 'leader-1',
                },
                members: [
                  {
                    displayName: '成员',
                    employeeNo: '10000003',
                    id: 'member-1',
                  },
                ],
              },
            ],
          },
        ],
      },
      response: new Response(null, { status: 200 }),
    });

    await expect(getOrganizationTree()).resolves.toMatchObject({
      items: [
        {
          id: 'manager-1',
          kind: 'MANAGER',
          superiorId: null,
          children: [
            {
              id: 'leader-1',
              kind: 'LEADER',
              superiorId: 'manager-1',
              children: [
                {
                  id: 'member-1',
                  kind: 'MEMBER',
                  superiorId: 'leader-1',
                },
              ],
            },
          ],
        },
      ],
    });
    expect(apiMock.GET).toHaveBeenCalledWith('/api/v1/admin/organization/tree');
  });

  it('调整上级调用 generated PUT 并支持 null 解除归属', async () => {
    apiMock.PUT.mockResolvedValue({
      data: { state: 'UPDATED' },
      response: new Response(null, { status: 200 }),
    });

    await setOrganizationSuperior('account/1', {
      reason: '团队调整',
      superiorId: null,
    });
    expect(apiMock.PUT).toHaveBeenCalledWith(
      '/api/v1/admin/accounts/{accountId}/superior',
      {
        body: { reason: '团队调整', superiorId: null },
        params: {
          header: {
            'Idempotency-Key': expect.stringMatching(/^[0-9a-f-]{36}$/),
          },
          path: { accountId: 'account/1' },
        },
      },
    );
  });
});
