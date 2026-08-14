import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
  createMockRequester,
  type MockRoutes,
} from '../tests/mockRequestHarness';

vi.mock('@umijs/max', () => ({
  defineMock: <T>(routes: T) => routes,
}));

import { createAdminOrganizationMock } from './adminOrg';

const mutationHeaders = {
  'Idempotency-Key': '00000000-0000-4000-8000-000000000001',
};

let routes: MockRoutes;
const requestThroughMock = createMockRequester(() => routes);

beforeEach(() => {
  routes = createAdminOrganizationMock();
});

describe('admin organization mock-only contract', () => {
  it('组织树返回 V0.2 manager/leader/member 层级 DTO', async () => {
    const response = (await requestThroughMock(
      '/api/v1/admin/organization/tree',
    )) as Record<string, unknown>;
    const managers = response.managers as Array<{
      account: Record<string, unknown>;
      leaders: Array<{
        account: Record<string, unknown>;
        members: Array<Record<string, unknown>>;
      }>;
    }>;

    expect(response).not.toHaveProperty('departments');
    expect(Object.keys(managers[0] ?? {}).sort()).toEqual([
      'account',
      'leaders',
    ]);
    expect(Object.keys(managers[0]?.account ?? {}).sort()).toEqual([
      'displayName',
      'employeeNo',
      'id',
    ]);
    expect(Object.keys(managers[0]?.leaders[0] ?? {}).sort()).toEqual([
      'account',
      'members',
    ]);
  });

  it('V0.2 superiorId=null 可解除现有归属', async () => {
    await expect(
      requestThroughMock('/api/v1/admin/accounts/member-wang/superior', {
        data: { reason: '暂时解除组织归属', superiorId: null },
        headers: mutationHeaders,
        method: 'PUT',
      }),
    ).resolves.toBeUndefined();
  });
});
