import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
  createMockRequester,
  type MockRoutes,
} from '../tests/mockRequestHarness';

vi.mock('@umijs/max', () => ({
  defineMock: <T>(routes: T) => routes,
}));

import { createAdminAccountsMock } from './adminAccounts';
import { createAdminGrantsMock } from './adminGrants';
import { createAdminWorkspacesMock } from './adminWorkspaces';
import { createGovernanceCatalog } from './governanceCatalog';

const mutationOptions = (data: unknown, method: 'DELETE' | 'POST') => ({
  data,
  headers: {
    'Idempotency-Key': '00000000-0000-4000-8000-000000000008',
  },
  method,
});

let routes: MockRoutes;
const requestThroughMock = createMockRequester(() => routes);

beforeEach(() => {
  routes = createAdminGrantsMock();
});

describe('admin grants mock-only contract', () => {
  it('列表只返回已冻结的 DIRECT Grant DTO，继承投影不污染契约', async () => {
    const listed = (await requestThroughMock('/api/v1/admin/grants', {
      params: { page: 1, pageSize: 100 },
    })) as { items: Array<Record<string, unknown>> };

    expect(listed.items.length).toBeGreaterThan(0);
    for (const grant of listed.items) {
      expect(grant.source).toBe('DIRECT');
      expect(Object.keys(grant).sort()).toEqual([
        'capability',
        'id',
        'principal',
        'scope',
        'source',
        'status',
        'validFrom',
        'validTo',
        'version',
      ]);
      expect(Object.keys(grant.principal as object).sort()).toEqual([
        'displayName',
        'employeeNo',
        'id',
      ]);
    }
  });

  it('继承 Grant 不允许单条撤销', async () => {
    await expect(
      requestThroughMock(
        '/api/v1/admin/grants/grant-role-development-leader',
        mutationOptions({ reason: '请求单条撤销' }, 'DELETE'),
      ),
    ).rejects.toMatchObject({
      response: {
        data: {
          detail: expect.stringContaining('继承授权不能单条撤销'),
          status: 422,
        },
        status: 422,
      },
    });
  });

  it('授予后按 principal/capability 可查询完整 Grant tuple', async () => {
    const created = await requestThroughMock(
      '/api/v1/admin/grants',
      mutationOptions(
        {
          capability: 'workspace.manage',
          principalId: 'account-2',
          reason: '承担营销工作区治理职责',
          scope: { id: 'workspace-platform-core', type: 'WORKSPACE' },
        },
        'POST',
      ),
    );

    expect(created).toMatchObject({
      capability: 'workspace.manage',
      id: expect.any(String),
      principal: {
        displayName: '吴桐',
        employeeNo: 'E1002',
        id: 'account-2',
      },
      scope: {
        id: 'workspace-platform-core',
        label: '营销工作区',
        type: 'WORKSPACE',
      },
      source: 'DIRECT',
      status: 'ACTIVE',
      validFrom: expect.any(String),
      validTo: null,
      version: 1,
    });

    const listed = (await requestThroughMock('/api/v1/admin/grants', {
      params: {
        capability: 'workspace.manage',
        page: 1,
        pageSize: 10,
        principalId: 'account-2',
      },
    })) as { items: Array<{ id: string }>; total: number };
    expect(listed).toEqual({
      items: [expect.objectContaining({ id: (created as { id: string }).id })],
      total: 1,
    });
  });

  it('新建账号与工作区会进入同一治理目录并可立即创建 Grant', async () => {
    const catalog = createGovernanceCatalog();
    const accountRoutes = createAdminAccountsMock({ catalog });
    const workspaceRoutes = createAdminWorkspacesMock({ catalog });
    const grantRoutes = createAdminGrantsMock({ catalog });
    const requestAccounts = createMockRequester(() => accountRoutes);
    const requestWorkspaces = createMockRequester(() => workspaceRoutes);
    const requestGrants = createMockRequester(() => grantRoutes);

    const accountReceipt = (await requestAccounts(
      '/api/v1/admin/accounts',
      mutationOptions(
        {
          displayName: '林一',
          employeeNo: 'E9001',
          reason: '跨端点实体闭环',
        },
        'POST',
      ),
    )) as { account: { id: string } };
    const workspace = (await requestWorkspaces(
      '/api/v1/admin/workspaces',
      mutationOptions(
        {
          name: '国际化工作区',
          ownerId: 'leader-li',
          reason: '跨端点实体闭环',
        },
        'POST',
      ),
    )) as { id: string };

    const created = await requestGrants(
      '/api/v1/admin/grants',
      mutationOptions(
        {
          capability: 'task.develop',
          principalId: accountReceipt.account.id,
          reason: '加入国际化交付',
          scope: { id: workspace.id, type: 'WORKSPACE' },
        },
        'POST',
      ),
    );

    expect(created).toMatchObject({
      principal: { displayName: '林一', employeeNo: 'E9001' },
      scope: { label: '国际化工作区', type: 'WORKSPACE' },
      status: 'ACTIVE',
    });
  });

  it('撤销必须携带 reason，成功后状态与版本可由列表观察', async () => {
    await expect(
      requestThroughMock('/api/v1/admin/grants/grant-audit-reader', {
        headers: {
          'Idempotency-Key': '00000000-0000-4000-8000-000000000008',
        },
        method: 'DELETE',
      }),
    ).rejects.toMatchObject({
      response: {
        data: { detail: 'reason 为必填项', status: 422 },
        status: 422,
      },
    });

    const revoked = await requestThroughMock(
      '/api/v1/admin/grants/grant-audit-reader',
      mutationOptions({ reason: '审计轮值结束' }, 'DELETE'),
    );
    expect(revoked).toMatchObject({ status: 'REVOKED', version: 2 });

    const listed = (await requestThroughMock('/api/v1/admin/grants', {
      params: { page: 1, pageSize: 10, principalId: 'account-4' },
    })) as { items: Array<{ id: string; status: string; version: number }> };
    expect(listed.items).toContainEqual(
      expect.objectContaining({
        id: 'grant-audit-reader',
        status: 'REVOKED',
        version: 2,
      }),
    );
  });
});
