import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { AuditQueryParams, AuditRow } from './type';
import {
  mergeAndSelectAuditRows,
  mergeAuditRows,
  queryAuditRows,
  selectAuditRows,
} from './util';

const listAuditEventsMock = vi.hoisted(() => vi.fn());

vi.mock('@/features/administration', () => ({
  listAuditEvents: listAuditEventsMock,
}));

const auditEvent = (overrides: Partial<AuditRow> = {}): AuditRow => ({
  action: 'Config Publish',
  actor: '孙杰',
  correlationId: 'corr-audit-0810-001',
  id: 'AUD-2026-0810-001',
  occurredAt: '2026-08-10T18:40:00+08:00',
  reason: '发布访问治理策略 v8',
  requestId: 'req-audit-0810-001',
  result: 'success',
  risk: 'high',
  sourceIp: '10.1.1.9',
  summary: '生产策略 access-policy-v8 已发布，版本由 7 提升至 8。',
  target: '生产策略 / access-policy-v8',
  targetId: 'access-policy-v8',
  targetType: 'CONFIGURATION',
  ...overrides,
});

async function runQuery(
  params: AuditQueryParams = {},
  sort: Record<string, 'ascend' | 'descend' | null> = {},
  filter: Record<string, Array<number | string> | null> = {},
) {
  return queryAuditRows(params, sort, filter);
}

afterEach(() => {
  vi.useRealTimers();
  vi.unstubAllGlobals();
});

beforeEach(() => {
  listAuditEventsMock.mockReset();
});

describe('queryAuditRows', () => {
  it('在页面适配器中补充原型来源 IP，不扩展 AuditEvent 契约', async () => {
    const { sourceIp: _sourceIp, ...serviceEvent } = auditEvent();
    listAuditEventsMock.mockResolvedValue({
      items: [serviceEvent],
      nextCursor: null,
    });

    const result = await runQuery({ pageSize: 3, range: 'all' });

    expect(result.data).toEqual([
      expect.objectContaining({
        id: 'AUD-2026-0810-001',
        sourceIp: '10.1.1.9',
      }),
    ]);
  });

  it('按当前本地日期动态计算时间范围，而不是固定到 mock 日期', async () => {
    vi.useFakeTimers();
    const now = new Date(2026, 8, 15, 12, 30, 0);
    vi.setSystemTime(now);
    listAuditEventsMock.mockResolvedValue({ items: [], nextCursor: null });
    const from = new Date(now);
    from.setHours(0, 0, 0, 0);
    const to = new Date(now);
    to.setHours(23, 59, 59, 999);

    await runQuery({ pageSize: 3, range: 'today' });

    expect(listAuditEventsMock).toHaveBeenCalledWith({
      from: from.toISOString(),
      limit: 3,
      to: to.toISOString(),
    });
  });

  it('把 range、actor 与 targetType 转为契约查询，并保留既有 action/risk 筛选', async () => {
    vi.useFakeTimers();
    const now = new Date(2026, 7, 10, 12, 0, 0);
    vi.setSystemTime(now);
    const from = new Date(now);
    from.setHours(0, 0, 0, 0);
    const to = new Date(now);
    to.setHours(23, 59, 59, 999);
    listAuditEventsMock.mockResolvedValue({
      items: [
        auditEvent(),
        auditEvent({
          action: 'Promotion',
          id: 'AUD-2026-0810-003',
          requestId: 'req-audit-0810-003',
          risk: 'low',
        }),
      ],
      nextCursor: null,
    });
    const result = await runQuery({
      action: 'Config Publish',
      actor: '孙杰',
      current: 1,
      pageSize: 20,
      range: 'today',
      risk: 'high',
      targetType: 'CONFIGURATION',
    });

    expect(listAuditEventsMock).toHaveBeenCalledWith({
      actor: '孙杰',
      from: from.toISOString(),
      limit: 20,
      targetType: 'CONFIGURATION',
      to: to.toISOString(),
    });
    expect(result).toEqual({
      data: [expect.objectContaining({ id: 'AUD-2026-0810-001' })],
      nextCursor: null,
      success: true,
    });
  });

  it('按 occurredAt 升序和降序排列', async () => {
    const events = [
      auditEvent(),
      auditEvent({
        id: 'AUD-2026-0802-009',
        occurredAt: '2026-08-02T09:35:00+08:00',
        requestId: 'req-audit-0802-009',
      }),
      auditEvent({
        id: 'AUD-2026-0808-006',
        occurredAt: '2026-08-08T12:05:00+08:00',
        requestId: 'req-audit-0808-006',
      }),
    ];
    listAuditEventsMock.mockResolvedValue({
      items: events,
      nextCursor: null,
    });
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
      'AUD-2026-0808-006',
      'AUD-2026-0810-001',
    ]);
    expect(descending.data?.map((row) => row.id)).toEqual([
      'AUD-2026-0810-001',
      'AUD-2026-0808-006',
      'AUD-2026-0802-009',
    ]);
  });

  it('把 cursor 与 pageSize 作为不透明分页参数并保留 nextCursor', async () => {
    listAuditEventsMock.mockResolvedValue({
      items: [auditEvent({ id: 'AUD-page-2' })],
      nextCursor: 'opaque-page-3',
    });
    const result = await runQuery({
      cursor: 'opaque-page-2',
      pageSize: 3,
      range: 'all',
    });

    expect(listAuditEventsMock).toHaveBeenCalledWith({
      cursor: 'opaque-page-2',
      limit: 3,
    });
    expect(result.data?.map((row) => row.id)).toEqual(['AUD-page-2']);
    expect(result.nextCursor).toBe('opaque-page-3');
  });

  it.each([
    ['操作人', '孙杰'],
    ['对象类型', 'configuration'],
    ['对象标识', 'access-policy-v8'],
    ['对象摘要', '版本由 7 提升至 8'],
    ['来源 IP', '10.1.1.9'],
  ])('关键字可在页面本地匹配%s', (_field, keyword) => {
    const rows = [
      auditEvent(),
      auditEvent({
        actor: '刘洋',
        id: 'AUD-unmatched',
        requestId: 'req-unmatched',
        sourceIp: '10.9.3.22',
        summary: '策略服务完成生产晋级。',
        target: '策略服务 / release-2026.08',
        targetId: 'release-2026.08',
        targetType: 'WORKSPACE',
      }),
    ];

    expect(selectAuditRows(rows, { keyword })).toEqual([rows[0]]);
  });

  it('通用关键字不冒充 actor 或其他不存在的服务端契约参数', async () => {
    listAuditEventsMock.mockResolvedValue({
      items: [
        auditEvent(),
        auditEvent({
          actor: '周遥',
          id: 'AUD-theme-v3',
          requestId: 'req-theme-v3',
          sourceIp: '10.8.12.31',
          summary: '开发策略 theme-v3 已发布。',
          target: '开发策略 / theme-v3',
          targetId: 'theme-v3',
        }),
      ],
      nextCursor: null,
    });

    const result = await runQuery({
      keyword: ' theme-v3 ',
      pageSize: 20,
      range: 'all',
    });

    expect(listAuditEventsMock).toHaveBeenCalledWith({ limit: 20 });
    expect(result.data?.map((row) => row.id)).toEqual(['AUD-theme-v3']);
  });

  it('无匹配项时返回空页和零总数', async () => {
    listAuditEventsMock.mockResolvedValue({ items: [], nextCursor: null });
    const result = await runQuery({
      current: 1,
      actor: '不存在的操作人',
      pageSize: 20,
      range: 'all',
    });

    expect(result).toEqual({
      data: [],
      nextCursor: null,
      success: true,
    });
  });

  it('合并 cursor 页时按事件 ID 去重且不修改输入数组', () => {
    const firstPage = [auditEvent(), auditEvent({ id: 'AUD-shared' })];
    const nextPage = [
      auditEvent({ id: 'AUD-shared' }),
      auditEvent({ id: 'AUD-last' }),
    ];

    const merged = mergeAuditRows(firstPage, nextPage);

    expect(merged.map(({ id }) => id)).toEqual([
      'AUD-2026-0810-001',
      'AUD-shared',
      'AUD-last',
    ]);
    expect(firstPage).toHaveLength(2);
    expect(nextPage).toHaveLength(2);
    expect(merged).not.toBe(firstPage);
  });

  it('合并两页后按 occurredAt 对完整已加载集合升序和降序排列', () => {
    const firstPage = [
      auditEvent({ id: 'AUD-03', occurredAt: '2026-08-03T10:00:00Z' }),
      auditEvent({ id: 'AUD-02', occurredAt: '2026-08-02T10:00:00Z' }),
    ];
    const nextPage = [
      auditEvent({ id: 'AUD-02', occurredAt: '2026-08-02T10:00:00Z' }),
      auditEvent({ id: 'AUD-01', occurredAt: '2026-08-01T10:00:00Z' }),
    ];

    expect(
      mergeAndSelectAuditRows(
        firstPage,
        nextPage,
        {},
        {
          occurredAt: 'ascend',
        },
      ).map(({ id }) => id),
    ).toEqual(['AUD-01', 'AUD-02', 'AUD-03']);
    expect(
      mergeAndSelectAuditRows(
        firstPage,
        nextPage,
        {},
        {
          occurredAt: 'descend',
        },
      ).map(({ id }) => id),
    ).toEqual(['AUD-03', 'AUD-02', 'AUD-01']);
  });

  it('通过集中 administration seam 查询且不直接调用 global fetch', async () => {
    const fetchSpy = vi.fn();
    vi.stubGlobal('fetch', fetchSpy);
    listAuditEventsMock.mockResolvedValue({ items: [], nextCursor: null });

    await runQuery(
      {
        action: 'Artifact Accept',
        actor: '郑楠',
        current: 1,
        pageSize: 20,
        range: '7d',
        risk: 'medium',
      },
      { occurredAt: 'descend' },
    );

    expect(listAuditEventsMock).toHaveBeenCalledOnce();
    expect(fetchSpy).not.toHaveBeenCalled();
  });
});
