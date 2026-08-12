import { beforeEach, describe, expect, it, vi } from 'vitest';

const listWorkspacesMock = vi.hoisted(() => vi.fn());

vi.mock('@/features/administration', () => ({
  listWorkspaces: listWorkspacesMock,
}));

import type { WorkspaceQueryParams } from './type';
import {
  flattenLeaders,
  queryWorkspaceRows,
  toWorkspaceListQuery,
} from './util';

async function runQuery(
  params: WorkspaceQueryParams = {},
  sort: Record<string, 'ascend' | 'descend' | null> = {},
  filter: Record<string, Array<number | string> | null> = {},
) {
  return queryWorkspaceRows(params, sort, filter);
}

beforeEach(() => {
  listWorkspacesMock.mockReset();
  listWorkspacesMock.mockResolvedValue({ items: [], total: 0 });
});

describe('queryWorkspaceRows', () => {
  it('去除关键词首尾空白后交给服务端筛选', async () => {
    listWorkspacesMock.mockResolvedValue({
      items: [
        {
          id: 'workspace-platform-core',
          leaders: [],
          memberCount: 12,
          name: '营销工作区',
          owner: {
            displayName: '李强',
            employeeNo: 'E1003',
            id: 'leader-li',
          },
          status: 'ACTIVE',
          version: 1,
        },
      ],
      total: 1,
    });
    const result = await runQuery({
      current: 1,
      keyword: '  agent RUNTIME  ',
      pageSize: 20,
      status: 'all',
    });

    expect(listWorkspacesMock).toHaveBeenCalledWith({
      keyword: 'agent RUNTIME',
      page: 1,
      pageSize: 20,
    });
    expect(result).toEqual({
      data: [
        expect.objectContaining({
          name: '营销工作区',
          repositoryCount: 10,
          team: '营销',
        }),
      ],
      success: true,
      total: 1,
    });
  });

  it('按 archived 状态筛选工作区', async () => {
    listWorkspacesMock.mockResolvedValue({
      items: [{ id: 'workspace-delivery', name: 'Delivery Governance' }],
      total: 1,
    });
    const result = await runQuery({
      current: 1,
      pageSize: 20,
      status: 'ARCHIVED',
    });

    expect(listWorkspacesMock).toHaveBeenCalledWith({
      page: 1,
      pageSize: 20,
      status: 'ARCHIVED',
    });
    expect(result).toEqual({
      data: [expect.objectContaining({ name: 'Delivery Governance' })],
      success: true,
      total: 1,
    });
  });

  it('按 current 和 pageSize 分页并保留筛选后的 total', async () => {
    listWorkspacesMock.mockResolvedValue({
      items: [{ id: 'workspace-agent-runtime', name: 'Agent Runtime' }],
      total: 2,
    });
    const result = await runQuery({
      current: 2,
      pageSize: 1,
      status: 'ACTIVE',
    });

    expect(result.data?.map((row) => row.name)).toEqual(['Agent Runtime']);
    expect(result.total).toBe(2);
  });

  it('无匹配项时返回空页和零总数', async () => {
    const result = await runQuery({
      current: 1,
      keyword: '不存在的工作区',
      pageSize: 20,
      status: 'all',
    });

    expect(result).toEqual({ data: [], success: true, total: 0 });
  });

  it('all 状态与空关键词不会泄漏到请求参数', () => {
    expect(
      toWorkspaceListQuery({
        current: 0,
        keyword: '  ',
        pageSize: -1,
        status: 'all',
      }),
    ).toEqual({ page: 1, pageSize: 10 });
  });

  it('页面查询适配器只调用 domain service seam', async () => {
    await runQuery({
      current: 1,
      keyword: 'platform',
      pageSize: 20,
      status: 'ACTIVE',
    });

    expect(listWorkspacesMock).toHaveBeenCalledTimes(1);
  });
});

describe('flattenLeaders', () => {
  it('只把开发 Leader 投影为 Workspace Owner 候选', () => {
    expect(
      flattenLeaders([
        {
          children: [
            {
              children: [],
              displayName: '吴桐',
              employeeNo: 'E1002',
              id: 'leader-wu',
              kind: 'LEADER',
              superiorId: 'manager-zhao',
            },
            {
              children: [],
              displayName: '李强',
              employeeNo: 'E1003',
              id: 'leader-li',
              kind: 'LEADER',
              superiorId: 'manager-zhao',
            },
          ],
          displayName: '赵敏',
          employeeNo: 'E1007',
          id: 'manager-zhao',
          kind: 'MANAGER',
          superiorId: null,
        },
      ]),
    ).toEqual([{ displayName: '李强', employeeNo: 'E1003', id: 'leader-li' }]);
  });
});
