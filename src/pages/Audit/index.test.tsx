import { act, render, screen, waitFor, within } from '@testing-library/react';
import userEvent, { type UserEvent } from '@testing-library/user-event';
import { App, ConfigProvider } from 'antd';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type {
  AuditEventsQuery,
  AuditEventsResponse,
} from '@/features/administration';
import { ApiError } from '@/services/transport';
import { AUDIT_EVENT_FIXTURES } from '../../../tests/fixtures/accessGovernance';

const administrationMocks = vi.hoisted(() => ({
  listAuditEvents: vi.fn(),
}));

vi.mock('@/features/administration', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@/features/administration')>()),
  ...administrationMocks,
}));

vi.mock('@ant-design/charts', () => ({
  Bar: () => <div data-ant-design-chart="bar" />,
  Column: () => <div data-ant-design-chart="column" />,
}));

import AuditPage from '.';

const INITIAL_WAIT = { timeout: 5_000 };
const AUDIT_FIXTURE_NOW = new Date(2026, 7, 10, 12, 0, 0);
const AUDIT_CURSOR_PREFIX = 'fixture-audit-offset:';

const listAuditFixtureEvents = async (
  query: AuditEventsQuery,
): Promise<AuditEventsResponse> => {
  const from = query.from === undefined ? undefined : Date.parse(query.from);
  const to = query.to === undefined ? undefined : Date.parse(query.to);
  const actor = query.actor?.toLocaleLowerCase();
  const filtered = AUDIT_EVENT_FIXTURES.filter((event) => {
    const occurredAt = Date.parse(event.occurredAt);
    return (
      (actor === undefined ||
        event.actor.toLocaleLowerCase().includes(actor)) &&
      (query.targetType === undefined ||
        event.targetType === query.targetType) &&
      (from === undefined || occurredAt >= from) &&
      (to === undefined || occurredAt <= to)
    );
  });
  const offset = query.cursor?.startsWith(AUDIT_CURSOR_PREFIX)
    ? Number(query.cursor.slice(AUDIT_CURSOR_PREFIX.length))
    : 0;
  const items = filtered.slice(offset, offset + query.limit);
  const nextOffset = offset + items.length;

  return {
    items,
    nextCursor:
      nextOffset < filtered.length
        ? `${AUDIT_CURSOR_PREFIX}${nextOffset}`
        : null,
  };
};

function renderPage() {
  return render(
    <ConfigProvider theme={{ token: { motion: false } }}>
      <App>
        <AuditPage />
      </App>
    </ConfigProvider>,
  );
}

async function selectOption(user: UserEvent, label: string, option: string) {
  await user.click(screen.getByRole('combobox', { name: label }));
  await user.click(
    await screen.findByRole('option', { name: option }, INITIAL_WAIT),
  );
}

beforeEach(() => {
  vi.useFakeTimers({
    now: AUDIT_FIXTURE_NOW,
    toFake: ['Date'],
  });
  administrationMocks.listAuditEvents.mockReset();
  administrationMocks.listAuditEvents.mockImplementation(
    listAuditFixtureEvents,
  );
});

afterEach(() => {
  vi.useRealTimers();
});

describe('AuditPage', { timeout: 30_000 }, () => {
  it('按原型呈现审计指标、三块分析、紧凑筛选和契约表格', async () => {
    renderPage();

    const metrics = screen.getByRole('region', { name: '审计指标' });
    expect(within(metrics).getAllByRole('article')).toHaveLength(4);
    expect(
      within(metrics).getByRole('article', { name: '近 7 日操作：395' }),
    ).toBeInTheDocument();
    expect(
      within(metrics).getByRole('article', { name: '高危操作：3' }),
    ).toBeInTheDocument();
    const trendChart = screen.getByRole('figure', {
      name: '近 7 日审计趋势',
    });
    const actionChart = screen.getByRole('figure', {
      name: '审计动作分类',
    });
    expect(
      trendChart.querySelector('[data-ant-design-chart="column"]'),
    ).toBeInTheDocument();
    expect(
      actionChart.querySelector('[data-ant-design-chart="bar"]'),
    ).toBeInTheDocument();
    expect(
      screen.getByRole('list', { name: '审计结果分布' }),
    ).toHaveTextContent('成功92%');
    expect(
      screen.getByRole('toolbar', { name: '审计筛选与操作' }),
    ).toBeInTheDocument();
    expect(screen.getByText('近 7 天')).toBeInTheDocument();
    expect(
      screen.getByPlaceholderText('操作人 / 对象 / IP'),
    ).toBeInTheDocument();
    expect(
      screen.queryByRole('combobox', { name: '目标类型' }),
    ).not.toBeInTheDocument();
    expect(
      screen.queryByRole('button', { name: '保存筛选' }),
    ).not.toBeInTheDocument();
    const firstAuditRow = await screen.findByRole(
      'row',
      { name: /AUD-2026-0810-001/ },
      INITIAL_WAIT,
    );
    expect(firstAuditRow).toHaveTextContent('10.1.1.9');
    expect(screen.getByRole('table')).toBeInTheDocument();
    expect(
      screen.getByRole('columnheader', { name: '来源 IP' }),
    ).toBeInTheDocument();
    expect(administrationMocks.listAuditEvents).toHaveBeenCalledWith(
      expect.objectContaining({ limit: 3 }),
    );
    expect(
      screen.queryByRole('columnheader', { name: '事件 ID' }),
    ).not.toBeInTheDocument();
    expect(
      screen.queryByRole('columnheader', { name: 'Correlation ID' }),
    ).not.toBeInTheDocument();
    expect(screen.getByText('共 3 条')).toBeInTheDocument();
    expect(
      screen.queryByText(
        '查看不可变审计事实，并通过 Correlation ID 串联排查链路',
      ),
    ).not.toBeInTheDocument();
  });

  it('从审计行打开详情 Drawer，并可通过关闭按钮移除', async () => {
    const user = userEvent.setup();
    renderPage();

    const auditRow = await screen.findByRole(
      'row',
      { name: /AUD-2026-0810-001/ },
      INITIAL_WAIT,
    );
    await user.click(
      within(auditRow).getByRole('button', { name: '查看详情' }),
    );

    const dialog = await screen.findByRole('dialog', {
      name: '审计事件详情',
    });
    expect(dialog).toHaveTextContent('Correlation ID');
    expect(dialog).toHaveTextContent('corr-audit-0810-001');
    expect(dialog).toHaveTextContent('Config Publish');
    expect(dialog).toHaveTextContent('CONFIGURATION / access-policy-v8');
    expect(dialog).toHaveTextContent('完整摘要');
    expect(dialog).toHaveTextContent(
      'Config Publish · CONFIGURATION / access-policy-v8',
    );
    expect(dialog).toHaveTextContent('Request ID');
    expect(dialog).toHaveTextContent('req-audit-0810-001');

    await user.click(
      within(dialog).getByRole('button', { name: /关闭|close/i }),
    );
    await waitFor(() => {
      expect(
        screen.queryByRole('dialog', { name: '审计事件详情' }),
      ).not.toBeInTheDocument();
    });
  });

  it('导出报表只提示静态操作且不改变审计行', async () => {
    const user = userEvent.setup();
    renderPage();

    const table = await screen.findByRole('table');
    await screen.findByRole('row', { name: /AUD-2026-0810-001/ }, INITIAL_WAIT);
    const initialRowCount = within(table).getAllByRole('row').length;

    await user.click(screen.getByRole('button', { name: '导出报表' }));

    expect(await screen.findByRole('alert')).toHaveTextContent(
      '静态原型操作：导出审计报表，未保存任何业务数据。',
    );
    expect(within(table).getAllByRole('row')).toHaveLength(initialRowCount);
    expect(
      screen.getByRole('row', { name: /AUD-2026-0810-001/ }),
    ).toBeInTheDocument();
  });

  it('不展示原型没有的保存筛选和目标类型筛选', async () => {
    renderPage();

    await screen.findByRole('row', { name: /AUD-2026-0810-001/ }, INITIAL_WAIT);
    expect(
      screen.queryByRole('button', { name: '保存筛选' }),
    ).not.toBeInTheDocument();
    expect(
      screen.queryByRole('combobox', { name: '目标类型' }),
    ).not.toBeInTheDocument();
  });

  it('动作与风险筛选重置分页并只展示同时匹配的审计事件', async () => {
    const user = userEvent.setup();
    renderPage();
    await screen.findByRole('row', { name: /AUD-2026-0810-001/ }, INITIAL_WAIT);

    await selectOption(user, '审计动作', '配置发布 · Config Publish');
    await selectOption(user, '风险等级', '低');

    expect(
      await screen.findByRole('row', { name: /AUD-2026-0810-004/ }),
    ).toBeVisible();
    expect(
      screen.queryByRole('row', { name: /AUD-2026-0810-001/ }),
    ).not.toBeInTheDocument();
  });

  it('未知审计动作保留后端标签而不丢失事件', async () => {
    administrationMocks.listAuditEvents.mockResolvedValueOnce({
      items: [
        {
          ...AUDIT_EVENT_FIXTURES[0],
          action: 'Future Governance Action',
          id: 'AUD-RUNTIME-ACTION',
        },
      ],
      nextCursor: null,
    });
    renderPage();

    const row = await screen.findByRole(
      'row',
      { name: /AUD-RUNTIME-ACTION/ },
      INITIAL_WAIT,
    );
    expect(row).toHaveTextContent('Future Governance Action');
  });

  it('首屏加载失败清空列表并展示 Problem', async () => {
    administrationMocks.listAuditEvents.mockRejectedValueOnce(
      new ApiError({
        detail: '审计服务暂时不可用',
        requestId: 'request-audit-initial-error',
        status: 503,
      }),
    );
    renderPage();

    expect(await screen.findByText(/审计服务暂时不可用/)).toHaveTextContent(
      'requestId: request-audit-initial-error',
    );
    expect(screen.getByText('共 0 条')).toBeVisible();
  });

  it('页面卸载后忽略仍在途审计成功结果', async () => {
    let resolvePending: (value: AuditEventsResponse) => void = () => {
      throw new Error('pending audit request was not started');
    };
    administrationMocks.listAuditEvents.mockImplementationOnce(
      () =>
        new Promise((resolve) => {
          resolvePending = resolve;
        }),
    );
    const view = renderPage();
    await waitFor(() => {
      expect(administrationMocks.listAuditEvents).toHaveBeenCalledTimes(1);
    });

    view.unmount();
    await act(async () => {
      resolvePending({ items: [...AUDIT_EVENT_FIXTURES], nextCursor: null });
    });

    expect(screen.queryByRole('row', { name: /AUD-2026-0810-001/ })).toBeNull();
  });

  it('页面卸载后忽略仍在途审计 Problem', async () => {
    let rejectPending: (reason: unknown) => void = () => {
      throw new Error('pending audit request was not started');
    };
    administrationMocks.listAuditEvents.mockImplementationOnce(
      () =>
        new Promise((_resolve, reject) => {
          rejectPending = reject;
        }),
    );
    const view = renderPage();
    await waitFor(() => {
      expect(administrationMocks.listAuditEvents).toHaveBeenCalledTimes(1);
    });

    view.unmount();
    await act(async () => {
      rejectPending(
        new ApiError({
          detail: '页面卸载后的审计错误',
          requestId: 'unmounted-audit-request',
          status: 503,
        }),
      );
    });

    expect(screen.queryByText(/页面卸载后的审计错误/)).not.toBeInTheDocument();
  });

  it('按时间查询契约端点，通用关键字只在页面本地过滤', async () => {
    const user = userEvent.setup();
    const now = new Date();
    const from = new Date(now);
    from.setHours(0, 0, 0, 0);
    const to = new Date(now);
    to.setHours(23, 59, 59, 999);
    renderPage();
    await screen.findByRole('table', {}, INITIAL_WAIT);

    await selectOption(user, '时间范围', '今天');
    await waitFor(() => {
      expect(administrationMocks.listAuditEvents).toHaveBeenCalledWith({
        from: from.toISOString(),
        limit: 3,
        to: to.toISOString(),
      });
    }, INITIAL_WAIT);
    await user.type(
      screen.getByRole('searchbox', { name: '操作人 / 对象 / IP' }),
      '孙杰',
    );

    await waitFor(() => {
      expect(
        administrationMocks.listAuditEvents.mock.calls.at(-1)?.[0],
      ).toEqual({
        from: from.toISOString(),
        limit: 3,
        to: to.toISOString(),
      });
    }, INITIAL_WAIT);
    expect(
      await screen.findByRole('row', { name: /AUD-2026-0810-001/ }),
    ).toBeInTheDocument();
    expect(
      screen.queryByRole('row', { name: /AUD-2026-0810-003/ }),
    ).not.toBeInTheDocument();
  });

  it('连续加载三页时按事件 ID 去重，并在末页移除加载更多', async () => {
    const user = userEvent.setup();
    renderPage();
    await screen.findByRole('table', {}, INITIAL_WAIT);
    await screen.findByRole('row', { name: /AUD-2026-0810-001/ }, INITIAL_WAIT);
    await selectOption(user, '时间范围', '全部时间');
    await waitFor(() => {
      expect(
        administrationMocks.listAuditEvents.mock.calls.at(-1)?.[0],
      ).toEqual({
        limit: 3,
      });
    }, INITIAL_WAIT);

    const firstLoadMore = await screen.findByRole(
      'button',
      { name: '加载更多' },
      INITIAL_WAIT,
    );
    await waitFor(() => expect(firstLoadMore).toBeEnabled());
    await user.click(firstLoadMore);
    await waitFor(() => {
      expect(
        administrationMocks.listAuditEvents.mock.calls.filter(
          ([query]) => query.cursor !== undefined,
        ),
      ).toHaveLength(1);
    });
    await screen.findByRole('row', { name: /AUD-2026-0808-006/ });
    const secondLoadMore = screen.getByRole('button', { name: '加载更多' });
    await waitFor(() => expect(secondLoadMore).toBeEnabled());
    await user.click(secondLoadMore);
    await waitFor(() => {
      expect(
        administrationMocks.listAuditEvents.mock.calls.filter(
          ([query]) => query.cursor !== undefined,
        ),
      ).toHaveLength(2);
    });
    await screen.findByRole('row', { name: /AUD-2026-0802-009/ });

    const currentTable = screen.getByRole('table');
    await waitFor(() => {
      const eventIds = within(currentTable)
        .getAllByRole('row', { name: /AUD-2026-/ })
        .map((row) => row.getAttribute('aria-label')?.split(' ')[0]);
      expect(eventIds).toHaveLength(9);
      expect(new Set(eventIds).size).toBe(9);
      expect(
        screen.queryByRole('button', { name: '加载更多' }),
      ).not.toBeInTheDocument();
    }, INITIAL_WAIT);
    expect(
      administrationMocks.listAuditEvents.mock.calls.filter(
        ([query]) => query.cursor !== undefined,
      ),
    ).toHaveLength(2);
  });

  it('加载 cursor 页后切换时间排序会清空 cursor 并从首屏重新查询', async () => {
    const user = userEvent.setup();
    renderPage();
    const table = await screen.findByRole('table', {}, INITIAL_WAIT);
    await screen.findByRole('row', { name: /AUD-2026-0810-001/ });

    const loadMore = screen.getByRole('button', { name: '加载更多' });
    await waitFor(() => expect(loadMore).toBeEnabled());
    await user.click(loadMore);
    await waitFor(() => {
      expect(
        administrationMocks.listAuditEvents.mock.calls.filter(
          ([query]) => query.cursor !== undefined,
        ),
      ).toHaveLength(1);
    }, INITIAL_WAIT);
    await screen.findByRole('row', { name: /AUD-2026-0808-006/ }, INITIAL_WAIT);
    const callsBeforeSort =
      administrationMocks.listAuditEvents.mock.calls.length;

    await user.click(within(table).getByRole('columnheader', { name: /时间/ }));

    await waitFor(() => {
      expect(
        administrationMocks.listAuditEvents.mock.calls.length,
      ).toBeGreaterThan(callsBeforeSort);
      const [query] =
        administrationMocks.listAuditEvents.mock.calls.at(-1) ?? [];
      expect(query?.cursor).toBeUndefined();
    }, INITIAL_WAIT);
    await waitFor(() => {
      expect(
        within(table).getAllByRole('row', { name: /AUD-2026-/ }),
      ).toHaveLength(3);
    });
    expect(
      screen.queryByRole('row', { name: /AUD-2026-0808-006/ }),
    ).not.toBeInTheDocument();
  });

  it('加载更多首次失败后保留按钮，并可用同一 cursor 显式重试', async () => {
    const user = userEvent.setup();
    let rejectedOnce = false;
    administrationMocks.listAuditEvents.mockImplementation(
      async (query: AuditEventsQuery) => {
        if (query.cursor !== undefined && !rejectedOnce) {
          rejectedOnce = true;
          throw new Error('temporary audit failure');
        }
        return listAuditFixtureEvents(query);
      },
    );
    renderPage();
    await screen.findByRole('row', { name: /AUD-2026-0810-001/ });
    await selectOption(user, '时间范围', '全部时间');

    const firstLoadMore = await screen.findByRole(
      'button',
      { name: '加载更多' },
      INITIAL_WAIT,
    );
    await waitFor(() => expect(firstLoadMore).toBeEnabled());
    await user.click(firstLoadMore);

    expect(await screen.findByRole('alert')).toHaveTextContent(
      'temporary audit failure',
    );
    const retryLoadMore = screen.getByRole('button', {
      name: '加载更多',
    });
    await waitFor(() => expect(retryLoadMore).toBeEnabled());
    await user.click(retryLoadMore);

    await waitFor(() => {
      expect(
        administrationMocks.listAuditEvents.mock.calls.filter(
          ([query]) => query.cursor !== undefined,
        ),
      ).toHaveLength(2);
    });
    await screen.findByRole('row', { name: /AUD-2026-0808-006/ });
    const cursorCalls = administrationMocks.listAuditEvents.mock.calls.filter(
      ([query]) => query.cursor !== undefined,
    );
    expect(cursorCalls).toHaveLength(2);
    expect(cursorCalls[1]?.[0].cursor).toBe(cursorCalls[0]?.[0].cursor);
    expect(
      screen.getByRole('button', { name: '加载更多' }),
    ).toBeInTheDocument();
  });

  it('详情中的 requestId 可复制', async () => {
    const user = userEvent.setup();
    const writeText = vi.fn().mockResolvedValue(undefined);
    Object.defineProperty(navigator, 'clipboard', {
      configurable: true,
      value: { writeText },
    });
    renderPage();

    const auditRow = await screen.findByRole(
      'row',
      { name: /AUD-2026-0810-001/ },
      INITIAL_WAIT,
    );
    await user.click(
      within(auditRow).getByRole('button', { name: '查看详情' }),
    );
    const dialog = await screen.findByRole('dialog', {
      name: '审计事件详情',
    });
    await user.click(
      within(dialog).getByRole('button', { name: '复制 Request ID' }),
    );

    expect(writeText).toHaveBeenCalledWith('req-audit-0810-001');
    expect(await screen.findByRole('alert')).toHaveTextContent(
      'Request ID 已复制',
    );
  });
});
