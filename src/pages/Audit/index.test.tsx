import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { App, ConfigProvider } from 'antd';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  createMockRequester,
  type MockRoutes,
} from '../../../tests/mockRequestHarness';

const requestMock = vi.hoisted(() => vi.fn());

vi.mock('@umijs/max', () => ({
  defineMock: <T,>(routes: T) => routes,
  request: requestMock,
}));

vi.mock('@ant-design/charts', () => ({
  Column: () => <div data-ant-design-chart="column" />,
}));

import { createAdminAuditMock } from '../../../mock/adminAudit';
import AuditPage from '.';

const INITIAL_WAIT = { timeout: 5_000 };
let routes: MockRoutes;
const requestThroughMock = createMockRequester(() => routes);

function renderPage() {
  return render(
    <ConfigProvider theme={{ token: { motion: false } }}>
      <App>
        <AuditPage />
      </App>
    </ConfigProvider>,
  );
}

beforeEach(() => {
  routes = createAdminAuditMock();
  requestMock.mockReset();
  requestMock.mockImplementation(requestThroughMock);
});

afterEach(() => {
  vi.useRealTimers();
});

describe('AuditPage', () => {
  it('呈现审计指标、趋势、筛选工具栏和契约表格', async () => {
    renderPage();

    const metrics = screen.getByRole('region', { name: '审计指标' });
    expect(within(metrics).getAllByRole('article')).toHaveLength(4);
    expect(
      within(metrics).getByRole('article', { name: '高风险事件：4' }),
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
      actionChart.querySelector('[data-ant-design-chart="column"]'),
    ).toBeInTheDocument();
    expect(
      screen.getByRole('toolbar', { name: '审计筛选与操作' }),
    ).toBeInTheDocument();
    expect(
      await screen.findByRole(
        'row',
        { name: /AUD-2026-0810-001/ },
        INITIAL_WAIT,
      ),
    ).toBeInTheDocument();
    expect(screen.getByRole('table')).toBeInTheDocument();
    expect(requestMock).toHaveBeenCalledWith('/api/v1/admin/audit-events', {
      method: 'GET',
      params: { limit: 3 },
    });
    expect(
      screen.queryByText(
        '查看不可变审计事实，并通过 Correlation ID 串联排查链路',
      ),
    ).not.toBeInTheDocument();
  });

  it('从审计行打开详情 Drawer，并可通过关闭按钮移除', async () => {
    const user = userEvent.setup();
    renderPage();

    const auditRow = await screen.findByRole('row', {
      name: /AUD-2026-0810-001/,
    });
    await user.click(
      within(auditRow).getByRole('button', { name: '查看详情' }),
    );

    const dialog = await screen.findByRole('dialog', {
      name: '审计事件详情',
    });
    expect(dialog).toHaveTextContent('Correlation ID');
    expect(dialog).toHaveTextContent('corr-audit-0810-001');
    expect(dialog).toHaveTextContent('Config Publish');
    expect(dialog).toHaveTextContent('生产策略 / access-policy-v8');
    expect(dialog).toHaveTextContent('完整摘要');
    expect(dialog).toHaveTextContent(
      '生产策略 access-policy-v8 已发布，版本由 7 提升至 8。',
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
    await screen.findByRole('row', { name: /AUD-2026-0810-001/ });
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

  it('保存筛选只提示静态操作且不改变审计行', async () => {
    const user = userEvent.setup();
    renderPage();

    const table = await screen.findByRole('table');
    await screen.findByRole('row', { name: /AUD-2026-0810-001/ });
    const initialRowCount = within(table).getAllByRole('row').length;

    await user.click(screen.getByRole('button', { name: '保存筛选' }));

    expect(await screen.findByRole('alert')).toHaveTextContent(
      '静态原型操作：保存审计筛选，未保存任何业务数据。',
    );
    expect(within(table).getAllByRole('row')).toHaveLength(initialRowCount);
    expect(
      screen.getByRole('row', { name: /AUD-2026-0810-001/ }),
    ).toBeInTheDocument();
  });

  it('按时间、actor 与 targetType 查询契约端点', async () => {
    vi.useFakeTimers({
      now: new Date(2026, 7, 10, 12, 0, 0),
      toFake: ['Date'],
    });
    const user = userEvent.setup();
    const now = new Date();
    const from = new Date(now);
    from.setHours(0, 0, 0, 0);
    const to = new Date(now);
    to.setHours(23, 59, 59, 999);
    renderPage();
    await screen.findByRole('table', {}, INITIAL_WAIT);

    await user.click(screen.getByRole('combobox', { name: '时间范围' }));
    await user.click(await screen.findByRole('option', { name: '今天' }));
    await user.type(screen.getByRole('searchbox', { name: '操作人' }), '孙杰');
    await user.click(screen.getByRole('combobox', { name: '目标类型' }));
    await user.click(await screen.findByRole('option', { name: '配置' }));

    await waitFor(() => {
      expect(requestMock).toHaveBeenCalledWith('/api/v1/admin/audit-events', {
        method: 'GET',
        params: {
          actor: '孙杰',
          from: from.toISOString(),
          limit: 3,
          targetType: 'CONFIGURATION',
          to: to.toISOString(),
        },
      });
    });
    expect(
      await screen.findByRole('row', { name: /AUD-2026-0810-001/ }),
    ).toBeInTheDocument();
  });

  it('连续加载三页时按事件 ID 去重，并在末页移除加载更多', async () => {
    const user = userEvent.setup();
    renderPage();
    const table = await screen.findByRole('table', {}, INITIAL_WAIT);
    await screen.findByRole('row', { name: /AUD-2026-0810-001/ });

    const firstLoadMore = screen.getByRole('button', { name: '加载更多' });
    await waitFor(() => expect(firstLoadMore).toBeEnabled());
    await user.click(firstLoadMore);
    await waitFor(() => {
      expect(
        requestMock.mock.calls.filter(
          ([url, options]) =>
            url === '/api/v1/admin/audit-events' &&
            options?.params?.cursor !== undefined,
        ),
      ).toHaveLength(1);
    });
    await screen.findByRole('row', { name: /AUD-2026-0808-006/ });
    const secondLoadMore = screen.getByRole('button', { name: '加载更多' });
    await waitFor(() => expect(secondLoadMore).toBeEnabled());
    await user.click(secondLoadMore);
    await waitFor(() => {
      expect(
        requestMock.mock.calls.filter(
          ([url, options]) =>
            url === '/api/v1/admin/audit-events' &&
            options?.params?.cursor !== undefined,
        ),
      ).toHaveLength(2);
    });
    await screen.findByRole('row', { name: /AUD-2026-0802-009/ });

    const eventIds = within(table)
      .getAllByText(/^AUD-2026-/)
      .map((node) => node.textContent);
    expect(eventIds).toHaveLength(9);
    expect(new Set(eventIds).size).toBe(9);
    expect(
      screen.queryByRole('button', { name: '加载更多' }),
    ).not.toBeInTheDocument();
    expect(
      requestMock.mock.calls.filter(
        ([url, options]) =>
          url === '/api/v1/admin/audit-events' &&
          options?.params?.cursor !== undefined,
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
        requestMock.mock.calls.filter(
          ([url, options]) =>
            url === '/api/v1/admin/audit-events' &&
            options?.params?.cursor !== undefined,
        ),
      ).toHaveLength(1);
    }, INITIAL_WAIT);
    await screen.findByRole('row', { name: /AUD-2026-0808-006/ }, INITIAL_WAIT);
    const callsBeforeSort = requestMock.mock.calls.length;

    await user.click(
      within(table).getByRole('columnheader', { name: /发生时间/ }),
    );

    await waitFor(() => {
      expect(requestMock.mock.calls.length).toBeGreaterThan(callsBeforeSort);
      const [, options] = requestMock.mock.calls.at(-1) ?? [];
      expect(options?.params?.cursor).toBeUndefined();
    });
    await waitFor(() => {
      expect(within(table).getAllByText(/^AUD-2026-/)).toHaveLength(3);
    });
    expect(
      screen.queryByRole('row', { name: /AUD-2026-0808-006/ }),
    ).not.toBeInTheDocument();
  });

  it('加载更多首次失败后保留按钮，并可用同一 cursor 显式重试', async () => {
    const user = userEvent.setup();
    let rejectedOnce = false;
    requestMock.mockImplementation(
      async (url: string, options?: { params?: Record<string, unknown> }) => {
        if (options?.params?.cursor !== undefined && !rejectedOnce) {
          rejectedOnce = true;
          throw new Error('temporary audit failure');
        }
        return requestThroughMock(url, options);
      },
    );
    renderPage();
    await screen.findByRole('row', { name: /AUD-2026-0810-001/ });

    const firstLoadMore = screen.getByRole('button', { name: '加载更多' });
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
        requestMock.mock.calls.filter(
          ([url, options]) =>
            url === '/api/v1/admin/audit-events' &&
            options?.params?.cursor !== undefined,
        ),
      ).toHaveLength(2);
    });
    await screen.findByRole('row', { name: /AUD-2026-0808-006/ });
    const cursorCalls = requestMock.mock.calls.filter(
      ([url, options]) =>
        url === '/api/v1/admin/audit-events' &&
        options?.params?.cursor !== undefined,
    );
    expect(cursorCalls).toHaveLength(2);
    expect(cursorCalls[1]?.[1]?.params?.cursor).toBe(
      cursorCalls[0]?.[1]?.params?.cursor,
    );
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
