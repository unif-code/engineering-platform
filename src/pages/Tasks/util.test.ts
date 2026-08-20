import { afterEach, describe, expect, it, vi } from 'vitest';
import { TASK_ROWS } from './constant';
import { queryTaskRows } from './util';

async function runQuery(
  params: Record<string, unknown> = {},
  sort: Record<string, 'ascend' | 'descend' | null> = {},
  filter: Record<string, Array<number | string> | null> = {},
) {
  return queryTaskRows(params, sort, filter);
}

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('queryTaskRows', () => {
  it('组合 keyword 与 status 筛选', async () => {
    const result = await runQuery(
      { current: 1, keyword: '仓库迁移', pageSize: 20 },
      {},
      { status: ['blocked'] },
    );

    expect(result).toEqual({
      data: [expect.objectContaining({ id: 'REQ-2026-0138' })],
      success: true,
      total: 1,
    });
  });

  it('按 updatedAt 升序和降序排列', async () => {
    const ascending = await runQuery(
      { current: 1, pageSize: 20 },
      { updatedAt: 'ascend' },
    );
    const descending = await runQuery(
      { current: 1, pageSize: 20 },
      { updatedAt: 'descend' },
    );

    expect(ascending.data?.map((row) => row.id)).toEqual([
      'REQ-2026-0113',
      'REQ-2026-0119',
      'REQ-2026-0124',
      'REQ-2026-0129',
      'REQ-2026-0138',
      'REQ-2026-0142',
    ]);
    expect(descending.data?.map((row) => row.id)).toEqual([
      'REQ-2026-0142',
      'REQ-2026-0138',
      'REQ-2026-0129',
      'REQ-2026-0124',
      'REQ-2026-0119',
      'REQ-2026-0113',
    ]);
  });

  it('按 current 和 pageSize 返回当前页', async () => {
    const result = await runQuery({ current: 2, pageSize: 2 });

    expect(result.data?.map((row) => row.id)).toEqual([
      'REQ-2026-0129',
      'REQ-2026-0124',
    ]);
    expect(result.total).toBe(6);
  });

  it('缺少分页参数时使用第一页和默认页容量', async () => {
    const result = await runQuery();

    expect(result.data).toHaveLength(TASK_ROWS.length);
    expect(result.total).toBe(TASK_ROWS.length);
  });

  it('无匹配项时返回空页和零总数', async () => {
    const result = await runQuery({
      current: 1,
      keyword: '不存在的任务',
      pageSize: 20,
    });

    expect(result).toEqual({ data: [], success: true, total: 0 });
  });

  it('不修改冻结 fixture，并且每次返回新的数据数组', async () => {
    const before = TASK_ROWS.map((row) => ({ ...row }));

    expect(Object.isFrozen(TASK_ROWS)).toBe(true);
    expect(TASK_ROWS.every((row) => Object.isFrozen(row))).toBe(true);

    const first = await runQuery({ current: 1, pageSize: 20 });
    const second = await runQuery({ current: 1, pageSize: 20 });

    expect(TASK_ROWS).toEqual(before);
    expect(first.data).not.toBe(TASK_ROWS);
    expect(second.data).not.toBe(first.data);
  });

  it('纯本地查询不会调用 global fetch', async () => {
    const fetchSpy = vi.fn();
    vi.stubGlobal('fetch', fetchSpy);

    await runQuery(
      { current: 1, keyword: '需求', pageSize: 20 },
      { updatedAt: 'descend' },
      { status: ['running'] },
    );

    expect(fetchSpy).not.toHaveBeenCalled();
  });
});
