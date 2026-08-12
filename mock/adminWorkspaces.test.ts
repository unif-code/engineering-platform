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
  data: { accountId: 'leader-wu', reason: '职责交接' },
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
  it('列表只返回冻结的 WorkspaceSummary 契约字段', async () => {
    const page = (await requestThroughMock('/api/v1/admin/workspaces', {
      params: { page: 1, pageSize: 10 },
    })) as {
      items: Array<{
        memberCount: number;
        name: string;
        owner: { displayName: string };
        status: string;
      }>;
      total: number;
    };

    expect(page.items.map(({ name }) => name)).toEqual([
      '营销工作区',
      '交易工作区',
      '中台工作区',
      '历史活动专区',
    ]);
    expect(page.total).toBe(4);
    for (const workspace of page.items) {
      expect(Object.keys(workspace).sort()).toEqual([
        'id',
        'leaders',
        'memberCount',
        'name',
        'owner',
        'status',
        'version',
      ]);
    }
  });

  it('Owner 转让后仅保留新 Owner 与独立受邀 Leader 的成员投影', async () => {
    const workspace = (await requestThroughMock(
      '/api/v1/admin/workspaces/workspace-platform-core/transfer-owner',
      mutationOptions,
    )) as { leaders: Array<{ id: string }>; owner: { id: string } };

    expect(workspace.owner.id).toBe('leader-wu');
    expect(workspace.leaders.map(({ id }) => id)).toEqual(['leader-wu']);

    const members = (await requestThroughMock(
      '/api/v1/admin/workspaces/workspace-platform-core/members',
    )) as { items: Array<{ accountId: string }> };
    expect(members.items.map(({ accountId }) => accountId)).toEqual([
      'leader-wu',
      'member-wang',
    ]);
  });
});
