import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
  createMockRequester,
  type MockRoutes,
} from '../tests/mockRequestHarness';

vi.mock('@umijs/max', () => ({
  defineMock: <T,>(routes: T) => routes,
}));

import { createAdminGrantsMock } from './adminGrants';

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
  it('授予后按 principal/capability 可查询完整 Grant tuple', async () => {
    const created = await requestThroughMock(
      '/api/v1/admin/grants',
      mutationOptions(
        {
          capability: 'workspace.manage',
          principalId: 'account-2',
          reason: '承担 Platform Core 治理职责',
          scope: { id: 'workspace-platform-core', type: 'WORKSPACE' },
        },
        'POST',
      ),
    );

    expect(created).toMatchObject({
      capability: 'workspace.manage',
      id: expect.any(String),
      principal: { id: 'account-2' },
      scope: {
        id: 'workspace-platform-core',
        label: 'Platform Core',
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
      params: { page: 1, pageSize: 10, principalId: 'account-1' },
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
