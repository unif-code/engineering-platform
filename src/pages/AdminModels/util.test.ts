import { afterEach, describe, expect, it, vi } from 'vitest';
import { MODEL_EVALUATION_ROWS, MODEL_ROWS } from './constant';
import { queryModelEvaluationRows, queryModelRows } from './util';

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('queryModelRows', () => {
  it('按原型顺序返回五个模型的 ProTable 信封', async () => {
    const result = await queryModelRows({ current: 1, pageSize: 10 }, {}, {});

    expect(result.data?.map((row) => row.name)).toEqual([
      'DeepSeek V4',
      'Qwen3.8 Max',
      'Kimi3',
      'Claude Opus 5',
      'GPT-5.6',
    ]);
    expect(result).toEqual({
      data: expect.any(Array),
      success: true,
      total: 5,
    });
  });

  it('按 current 和 pageSize 分页并保留完整 total', async () => {
    const result = await queryModelRows({ current: 2, pageSize: 2 }, {}, {});

    expect(result.data?.map((row) => row.name)).toEqual([
      'Kimi3',
      'Claude Opus 5',
    ]);
    expect(result.total).toBe(5);
  });

  it('不修改冻结 fixture，每次返回新数组且不调用 fetch', async () => {
    const fetchSpy = vi.fn();
    vi.stubGlobal('fetch', fetchSpy);
    const before = MODEL_ROWS.map((row) => ({ ...row }));

    expect(Object.isFrozen(MODEL_ROWS)).toBe(true);
    expect(MODEL_ROWS.every((row) => Object.isFrozen(row))).toBe(true);

    const first = await queryModelRows({ current: 1, pageSize: 10 }, {}, {});
    const second = await queryModelRows({ current: 1, pageSize: 10 }, {}, {});

    expect(MODEL_ROWS).toEqual(before);
    expect(first.data).not.toBe(MODEL_ROWS);
    expect(second.data).not.toBe(first.data);
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
    expect(result.data?.[0]).toEqual(
      expect.objectContaining({ id: 'EV-3312', deployment: 'qwen3.8-max' }),
    );
    expect(result.data).not.toBe(MODEL_EVALUATION_ROWS);
    expect(MODEL_EVALUATION_ROWS).toEqual(before);
    expect(fetchSpy).not.toHaveBeenCalled();
  });
});
