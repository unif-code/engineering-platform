import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
  createMockRequester,
  type MockRoutes,
} from '../tests/mockRequestHarness';

vi.mock('@umijs/max', () => ({
  defineMock: <T>(routes: T) => routes,
}));

import { createAdminOrganizationMock } from './adminOrg';

let routes: MockRoutes;
const requestThroughMock = createMockRequester(() => routes);

beforeEach(() => {
  routes = createAdminOrganizationMock();
});

describe('admin organization mock-only contract', () => {
  it('组织树仅返回已冻结节点字段，部门卡片元数据留在页面展示层', async () => {
    const response = (await requestThroughMock(
      '/api/v1/admin/organization/tree',
    )) as Record<string, unknown>;
    const items = response.items as Array<Record<string, unknown>>;

    expect(response).not.toHaveProperty('departments');
    expect(Object.keys(items[0] ?? {}).sort()).toEqual([
      'children',
      'displayName',
      'employeeNo',
      'id',
      'kind',
      'superiorId',
    ]);
  });
});
