import { beforeEach, describe, expect, it, vi } from 'vitest';

const listWorkspacesMock = vi.hoisted(() => vi.fn());

vi.mock('@/features/administration', () => ({
  listWorkspaces: listWorkspacesMock,
}));

import type { WorkspaceQueryParams } from './type';
import { queryWorkspaceRows, toWorkspaceListQuery } from './util';

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
      items: [{ id: 'workspace-agent-runtime', name: 'Agent Runtime' }],
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
      data: [expect.objectContaining({ name: 'Agent Runtime' })],
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
