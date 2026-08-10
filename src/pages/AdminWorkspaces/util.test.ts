import { afterEach, describe, expect, it, vi } from 'vitest';
import { WORKSPACE_ROWS } from './constant';
import type { WorkspaceQueryParams } from './type';
import { queryWorkspaceRows } from './util';

async function runQuery(
  params: WorkspaceQueryParams = {},
  sort: Record<string, 'ascend' | 'descend' | null> = {},
  filter: Record<string, Array<number | string> | null> = {},
) {
  return queryWorkspaceRows(params, sort, filter);
}

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('queryWorkspaceRows', () => {
  it('忽略大小写和首尾空白搜索工作区名称', async () => {
    const result = await runQuery({
      current: 1,
      keyword: '  agent RUNTIME  ',
      pageSize: 20,
      status: 'all',
    });

    expect(result).toEqual({
      data: [expect.objectContaining({ name: 'Agent Runtime' })],
      success: true,
      total: 1,
    });
  });

  it('按 restricted 状态筛选工作区', async () => {
    const result = await runQuery({
      current: 1,
      pageSize: 20,
      status: 'restricted',
    });

    expect(result).toEqual({
      data: [expect.objectContaining({ name: 'Delivery Governance' })],
      success: true,
      total: 1,
    });
  });

  it('按 current 和 pageSize 分页并保留筛选后的 total', async () => {
    const result = await runQuery({
      current: 2,
      pageSize: 1,
      status: 'active',
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

  it('不修改冻结 fixture，并且每次返回新的数据数组', async () => {
    const before = WORKSPACE_ROWS.map((row) => ({ ...row }));

    expect(Object.isFrozen(WORKSPACE_ROWS)).toBe(true);
    expect(WORKSPACE_ROWS.every((row) => Object.isFrozen(row))).toBe(true);

    const first = await runQuery({ current: 1, pageSize: 20 });
    const second = await runQuery({ current: 1, pageSize: 20 });

    expect(WORKSPACE_ROWS).toEqual(before);
    expect(first.data).not.toBe(WORKSPACE_ROWS);
    expect(second.data).not.toBe(first.data);
  });

  it('纯本地查询不会调用 global fetch', async () => {
    const fetchSpy = vi.fn();
    vi.stubGlobal('fetch', fetchSpy);

    await runQuery({
      current: 1,
      keyword: 'platform',
      pageSize: 20,
      status: 'active',
    });

    expect(fetchSpy).not.toHaveBeenCalled();
  });
});
