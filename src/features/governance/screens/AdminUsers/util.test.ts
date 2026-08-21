import { beforeEach, describe, expect, it, vi } from 'vitest';

const listAccountsMock = vi.hoisted(() => vi.fn());

vi.mock('@/features/administration', () => ({
  listAccounts: listAccountsMock,
}));

import type { UserQueryParams } from './type';
import { queryUserRows, toAccountListQuery } from './util';

async function runQuery(
  params: UserQueryParams = {},
  sort: Record<string, 'ascend' | 'descend' | null> = {},
  filter: Record<string, Array<number | string> | null> = {},
) {
  return queryUserRows(params, sort, filter);
}

beforeEach(() => {
  listAccountsMock.mockReset();
  listAccountsMock.mockResolvedValue({ items: [], total: 0 });
});

describe('queryUserRows', () => {
  it('组合 employeeNo、displayName、status 与 profession 转为服务端查询', async () => {
    listAccountsMock.mockResolvedValue({
      items: [
        {
          displayName: '吴桐',
          employeeNo: 'E1002',
          id: 'account-2',
          profession: '产品',
          status: 'ENABLED',
        },
      ],
      total: 1,
    });

    const result = await runQuery({
      current: 2,
      displayName: '  示例用户  ',
      employeeNo: '  100000  ',
      pageSize: 20,
      profession: '  测试  ',
      status: 'ENABLED',
    });

    expect(listAccountsMock).toHaveBeenCalledWith({
      displayName: '示例用户',
      employeeNo: '100000',
      page: 2,
      pageSize: 20,
      profession: '测试',
      status: 'ENABLED',
    });
    expect(result).toEqual({
      data: [
        {
          displayName: '吴桐',
          employeeNo: 'E1002',
          id: 'account-2',
          profession: '产品',
          status: 'ENABLED',
        },
      ],
      success: true,
      total: 1,
    });
  });

  it('all 状态与专业分类不会泄漏到请求参数', () => {
    expect(
      toAccountListQuery({
        current: 1,
        pageSize: 10,
        profession: 'all',
        status: 'all',
      }),
    ).toEqual({ page: 1, pageSize: 10 });
  });

  it('忽略 ProTable 注入的未知状态值', () => {
    expect(
      toAccountListQuery(
        { current: 1, pageSize: 10 },
        {},
        { status: ['UNKNOWN'] },
      ),
    ).toEqual({ page: 1, pageSize: 10 });
  });

  it('把 ProTable employeeNo 降序转换为 sortBy 与 sortOrder', () => {
    expect(
      toAccountListQuery(
        { current: 1, pageSize: 20 },
        { employeeNo: 'descend' },
      ),
    ).toEqual({
      page: 1,
      pageSize: 20,
      sortBy: 'employeeNo',
      sortOrder: 'desc',
    });
  });

  it('忽略非契约排序字段，避免把页面私有字段发送给后端', () => {
    expect(
      toAccountListQuery(
        { current: 1, pageSize: 20 },
        { lastActiveAt: 'ascend' },
      ),
    ).toEqual({ page: 1, pageSize: 20 });
  });

  it('current 和 pageSize 非法时使用第一页与十条分页', () => {
    expect(toAccountListQuery({ current: 0, pageSize: -1 })).toEqual({
      page: 1,
      pageSize: 10,
    });
  });

  it('从 ProTable filter 提取 profession/status，并把 ascend 转成 asc', () => {
    expect(
      toAccountListQuery(
        {
          current: 1,
          displayName: '   ',
          employeeNo: '   ',
          pageSize: 20,
        },
        { profession: 'ascend' },
        { profession: ['研发'], status: ['DISABLED'] },
      ),
    ).toEqual({
      page: 1,
      pageSize: 20,
      profession: '研发',
      sortBy: 'profession',
      sortOrder: 'asc',
      status: 'DISABLED',
    });
  });

  it('null/all filter 与无效分页都回退安全默认值', () => {
    expect(
      toAccountListQuery(
        { current: Number.NaN, pageSize: undefined },
        { status: null },
        { profession: [null as never], status: null },
      ),
    ).toEqual({ page: 1, pageSize: 10 });
    expect(
      toAccountListQuery(
        { current: 1, pageSize: 10 },
        {},
        { profession: ['all'] },
      ),
    ).toEqual({ page: 1, pageSize: 10 });
  });

  it('无匹配项时把服务端空页适配为 ProTable 成功响应', async () => {
    const result = await runQuery({
      current: 1,
      displayName: '不存在的用户',
      pageSize: 20,
      profession: 'all',
      status: 'all',
    });

    expect(result).toEqual({ data: [], success: true, total: 0 });
  });
});
