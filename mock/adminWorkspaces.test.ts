import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
  createMockRequester,
  type MockRoutes,
} from '../tests/mockRequestHarness';

vi.mock('@umijs/max', () => ({
  defineMock: <T>(routes: T) => routes,
}));

import { createAdminWorkspacesMock } from './adminWorkspaces';

const mutationOptions = {
  data: { accountId: 'leader-shen', reason: '职责交接' },
  headers: {
    'Idempotency-Key': '00000000-0000-4000-8000-000000000001',
  },
  method: 'POST',
} as const;

let routes: MockRoutes;
const requestThroughMock = createMockRequester(() => routes);

beforeEach(() => {
  routes = createAdminWorkspacesMock();
});

describe('admin workspaces mock contract', () => {
  it('Owner 转让后仅保留新 Owner 与独立受邀 Leader 的成员投影', async () => {
    const workspace = (await requestThroughMock(
      '/api/v1/admin/workspaces/workspace-platform-core/transfer-owner',
      mutationOptions,
    )) as { leaders: Array<{ id: string }>; owner: { id: string } };

    expect(workspace.owner.id).toBe('leader-shen');
    expect(workspace.leaders.map(({ id }) => id)).toEqual(['leader-shen']);

    const members = (await requestThroughMock(
      '/api/v1/admin/workspaces/workspace-platform-core/members',
    )) as { items: Array<{ accountId: string }> };
    expect(members.items.map(({ accountId }) => accountId)).toEqual([
      'leader-shen',
      'member-han',
    ]);
  });
});
