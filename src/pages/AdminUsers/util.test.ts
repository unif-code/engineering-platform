import { afterEach, describe, expect, it, vi } from 'vitest';
import { USER_ROWS } from './constant';
import type { UserQueryParams } from './type';
import { queryUserRows } from './util';

async function runQuery(
  params: UserQueryParams = {},
  sort: Record<string, 'ascend' | 'descend' | null> = {},
  filter: Record<string, Array<number | string> | null> = {},
) {
  return queryUserRows(params, sort, filter);
}

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('queryUserRows', () => {
  it('组合 keyword、status 与 role 筛选用户', async () => {
    const result = await runQuery({
      current: 1,
      keyword: '  USER.B@EXAMPLE.TEST  ',
      pageSize: 20,
      role: 'Reviewer',
      status: 'active',
    });

    expect(result).toEqual({
      data: [
        expect.objectContaining({
          employeeId: '10000002',
          name: '示例用户乙',
        }),
      ],
      success: true,
      total: 1,
    });
  });

  it('按角色与状态筛选时返回正确 total', async () => {
    const result = await runQuery({
      current: 1,
      pageSize: 20,
      role: 'Reviewer',
      status: 'active',
    });

    expect(result.data?.map((row) => row.employeeId)).toEqual([
      '10000002',
      '10000004',
    ]);
    expect(result.total).toBe(2);
  });

  it('按 lastActiveAt 降序排序', async () => {
    const result = await runQuery(
      { current: 1, pageSize: 20 },
      { lastActiveAt: 'descend' },
    );

    expect(result.data?.map((row) => row.employeeId)).toEqual([
      '10000001',
      '10000002',
      '10000004',
      '10000003',
    ]);
  });

  it('排序后按 current 和 pageSize 分页并保留完整 total', async () => {
    const result = await runQuery(
      { current: 2, pageSize: 2 },
      { employeeId: 'ascend' },
    );

    expect(result.data?.map((row) => row.employeeId)).toEqual([
      '10000003',
      '10000004',
    ]);
    expect(result.total).toBe(4);
  });

  it('不修改深度冻结 fixture，并且每次返回新的数据数组', async () => {
    const before = USER_ROWS.map((row) => ({
      ...row,
      roles: [...row.roles],
    }));

    expect(Object.isFrozen(USER_ROWS)).toBe(true);
    expect(USER_ROWS.every((row) => Object.isFrozen(row))).toBe(true);
    expect(USER_ROWS.every((row) => Object.isFrozen(row.roles))).toBe(true);

    const first = await runQuery(
      { current: 1, pageSize: 20 },
      { lastActiveAt: 'ascend' },
    );
    const second = await runQuery({ current: 1, pageSize: 20 });

    expect(USER_ROWS).toEqual(before);
    expect(first.data).not.toBe(USER_ROWS);
    expect(second.data).not.toBe(first.data);
  });

  it('纯本地查询不会调用 global fetch', async () => {
    const fetchSpy = vi.fn();
    vi.stubGlobal('fetch', fetchSpy);

    await runQuery({
      current: 1,
      keyword: '示例用户',
      pageSize: 20,
      role: 'all',
      status: 'all',
    });

    expect(fetchSpy).not.toHaveBeenCalled();
  });
});
