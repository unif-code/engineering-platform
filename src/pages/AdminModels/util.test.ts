import { afterEach, describe, expect, it, vi } from 'vitest';
import { MODEL_EVALUATION_ROWS, MODEL_ROWS } from './constant';
import type { ModelQueryParams } from './type';
import { queryModelEvaluationRows, queryModelRows } from './util';

async function runQuery(
  params: ModelQueryParams = {},
  sort: Record<string, 'ascend' | 'descend' | null> = {},
  filter: Record<string, Array<number | string> | null> = {},
) {
  return queryModelRows(params, sort, filter);
}

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('queryModelRows', () => {
  it('忽略大小写和首尾空白搜索名称、Provider 与用途', async () => {
    const byName = await runQuery({
      current: 1,
      keyword: '  qWen3  ',
      pageSize: 20,
      status: 'all',
    });
    const byProvider = await runQuery({
      current: 1,
      keyword: '  anthropic ',
      pageSize: 20,
      status: 'all',
    });
    const byPurpose = await runQuery({
      current: 1,
      keyword: '备选路由',
      pageSize: 20,
      status: 'all',
    });

    expect(byName.data?.map((row) => row.id)).toEqual(['model-qwen3-coder']);
    expect(byProvider.data?.map((row) => row.id)).toEqual([
      'model-claude-sonnet-4',
    ]);
    expect(byPurpose.data?.map((row) => row.id)).toEqual(['model-deepseek-r1']);
  });

  it('按 evaluation 状态筛选模型', async () => {
    const result = await runQuery({
      current: 1,
      pageSize: 20,
      status: 'evaluation',
    });

    expect(result).toEqual({
      data: [expect.objectContaining({ id: 'model-qwen3-coder' })],
      success: true,
      total: 1,
    });
  });

  it('按 updatedAt 升降序和 contextWindow 降序排列', async () => {
    const updatedAscending = await runQuery(
      { current: 1, pageSize: 20 },
      { updatedAt: 'ascend' },
    );
    const updatedDescending = await runQuery(
      { current: 1, pageSize: 20 },
      { updatedAt: 'descend' },
    );
    const contextDescending = await runQuery(
      { current: 1, pageSize: 20 },
      { contextWindow: 'descend' },
    );

    expect(updatedAscending.data?.map((row) => row.id)).toEqual([
      'model-deepseek-r1',
      'model-qwen3-coder',
      'model-claude-sonnet-4',
      'model-gpt-4-1',
    ]);
    expect(updatedDescending.data?.map((row) => row.id)).toEqual([
      'model-gpt-4-1',
      'model-claude-sonnet-4',
      'model-qwen3-coder',
      'model-deepseek-r1',
    ]);
    expect(contextDescending.data?.map((row) => row.id)).toEqual([
      'model-gpt-4-1',
      'model-qwen3-coder',
      'model-claude-sonnet-4',
      'model-deepseek-r1',
    ]);
  });

  it('按 current 和 pageSize 分页并保留筛选后的 total', async () => {
    const result = await runQuery({
      current: 2,
      pageSize: 1,
      status: 'active',
    });

    expect(result.data?.map((row) => row.id)).toEqual([
      'model-claude-sonnet-4',
    ]);
    expect(result.total).toBe(2);
  });

  it('无匹配项时返回空页和零总数', async () => {
    const result = await runQuery({
      current: 1,
      keyword: '不存在的模型',
      pageSize: 20,
      status: 'all',
    });

    expect(result).toEqual({ data: [], success: true, total: 0 });
  });

  it('不修改冻结 fixture，并且每次返回新的数据数组', async () => {
    const before = MODEL_ROWS.map((row) => ({ ...row }));

    expect(Object.isFrozen(MODEL_ROWS)).toBe(true);
    expect(MODEL_ROWS.every((row) => Object.isFrozen(row))).toBe(true);

    const first = await runQuery(
      { current: 1, pageSize: 20 },
      { contextWindow: 'ascend' },
    );
    const second = await runQuery({ current: 1, pageSize: 20 });

    expect(MODEL_ROWS).toEqual(before);
    expect(first.data).not.toBe(MODEL_ROWS);
    expect(second.data).not.toBe(first.data);
  });

  it('纯本地查询不会调用 global fetch', async () => {
    const fetchSpy = vi.fn();
    vi.stubGlobal('fetch', fetchSpy);

    await runQuery(
      {
        current: 1,
        keyword: 'code',
        pageSize: 20,
        status: 'evaluation',
      },
      { updatedAt: 'descend' },
    );

    expect(fetchSpy).not.toHaveBeenCalled();
  });
});

describe('queryModelEvaluationRows', () => {
  it('返回本地评测信封且不调用 fetch 或修改 fixture', async () => {
    const fetchSpy = vi.fn();
    vi.stubGlobal('fetch', fetchSpy);
    const before = MODEL_EVALUATION_ROWS.map((row) => ({ ...row }));

    const result = await queryModelEvaluationRows({}, {}, {});

    expect(result).toEqual({ data: before, success: true, total: 3 });
    expect(result.data).not.toBe(MODEL_EVALUATION_ROWS);
    expect(MODEL_EVALUATION_ROWS).toEqual(before);
    expect(fetchSpy).not.toHaveBeenCalled();
  });
});
