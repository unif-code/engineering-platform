import { afterEach, describe, expect, it, vi } from 'vitest';
import { AUDIT_ROWS } from './constant';
import type { AuditQueryParams } from './type';
import { queryAuditRows } from './util';

async function runQuery(
  params: AuditQueryParams = {},
  sort: Record<string, 'ascend' | 'descend' | null> = {},
  filter: Record<string, Array<number | string> | null> = {},
) {
  return queryAuditRows(params, sort, filter);
}

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('queryAuditRows', () => {
  it('同时应用 range、action、risk 与 keyword 筛选', async () => {
    const result = await runQuery({
      action: 'Config Publish',
      current: 1,
      keyword: '策略',
      pageSize: 20,
      range: 'today',
      risk: 'high',
    });

    expect(result).toEqual({
      data: [expect.objectContaining({ id: 'AUD-2026-0810-001' })],
      success: true,
      total: 1,
    });
  });

  it('按 occurredAt 升序和降序排列', async () => {
    const ascending = await runQuery(
      { current: 1, pageSize: 20, range: 'all' },
      { occurredAt: 'ascend' },
    );
    const descending = await runQuery(
      { current: 1, pageSize: 20, range: 'all' },
      { occurredAt: 'descend' },
    );

    expect(ascending.data?.map((row) => row.id)).toEqual([
      'AUD-2026-0802-009',
      'AUD-2026-0805-008',
      'AUD-2026-0807-007',
      'AUD-2026-0808-006',
      'AUD-2026-0809-002',
      'AUD-2026-0810-005',
      'AUD-2026-0810-004',
      'AUD-2026-0810-003',
      'AUD-2026-0810-001',
    ]);
    expect(descending.data?.map((row) => row.id)).toEqual([
      'AUD-2026-0810-001',
      'AUD-2026-0810-003',
      'AUD-2026-0810-004',
      'AUD-2026-0810-005',
      'AUD-2026-0809-002',
      'AUD-2026-0808-006',
      'AUD-2026-0807-007',
      'AUD-2026-0805-008',
      'AUD-2026-0802-009',
    ]);
  });

  it('按 current 和 pageSize 返回当前页并保留筛选总数', async () => {
    const result = await runQuery({
      current: 2,
      pageSize: 3,
      range: 'all',
    });

    expect(result.data?.map((row) => row.id)).toEqual([
      'AUD-2026-0810-005',
      'AUD-2026-0809-002',
      'AUD-2026-0808-006',
    ]);
    expect(result.total).toBe(9);
  });

  it('无匹配项时返回空页和零总数', async () => {
    const result = await runQuery({
      current: 1,
      keyword: '不存在的审计事件',
      pageSize: 20,
      range: 'all',
    });

    expect(result).toEqual({ data: [], success: true, total: 0 });
  });

  it('不修改冻结 fixture，并且每次返回新的数据数组', async () => {
    const before = AUDIT_ROWS.map((row) => ({ ...row }));

    expect(Object.isFrozen(AUDIT_ROWS)).toBe(true);
    expect(AUDIT_ROWS.every((row) => Object.isFrozen(row))).toBe(true);

    const first = await runQuery({ current: 1, pageSize: 20, range: 'all' });
    const second = await runQuery({ current: 1, pageSize: 20, range: 'all' });

    expect(AUDIT_ROWS).toEqual(before);
    expect(first.data).not.toBe(AUDIT_ROWS);
    expect(second.data).not.toBe(first.data);
  });

  it('纯本地查询不会调用 global fetch', async () => {
    const fetchSpy = vi.fn();
    vi.stubGlobal('fetch', fetchSpy);

    await runQuery(
      {
        action: 'Artifact Accept',
        current: 1,
        keyword: 'artifact',
        pageSize: 20,
        range: '7d',
        risk: 'medium',
      },
      { occurredAt: 'descend' },
    );

    expect(fetchSpy).not.toHaveBeenCalled();
  });
});
