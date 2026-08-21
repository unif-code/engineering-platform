import { createApiErrorFixture } from '@root/tests/fixtures/apiError';
import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { App, ConfigProvider } from 'antd';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type {
  AuditEvent,
  AuditEventsQuery,
  AuditEventsResponse,
} from '@/features/administration';

const administrationMocks = vi.hoisted(() => ({
  listAuditEvents: vi.fn(),
}));

vi.mock('@/features/administration', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@/features/administration')>()),
  ...administrationMocks,
}));

import AuditPage from '.';

const INITIAL_WAIT = { timeout: 5_000 };
const FROZEN_NOW = new Date(2026, 7, 10, 12, 0, 0);

function makeAuditEvent(overrides: Partial<AuditEvent> = {}): AuditEvent {
  return {
    action: 'Config Publish',
    actor: '孙杰',
    correlationId: 'corr-audit-001',
    id: 'AUD-2026-0810-001',
    occurredAt: '2026-08-10T08:30:00.000Z',
    reason: '策略发布前的复核完成',
    requestId: 'req-audit-001',
    result: 'success',
    risk: 'high',
    summary: 'Config Publish · CONFIGURATION / access-policy-v8',
    target: 'CONFIGURATION / access-policy-v8',
    targetId: 'access-policy-v8',
    targetType: 'CONFIGURATION',
    ...overrides,
  };
}

function rangeBounds(days: number) {
  const from = new Date();
  from.setHours(0, 0, 0, 0);
  from.setDate(from.getDate() - (days - 1));
  const to = new Date();
  to.setHours(23, 59, 59, 999);
  return { from: from.toISOString(), to: to.toISOString() };
}

function renderPage() {
  return render(
    <ConfigProvider theme={{ token: { motion: false } }}>
      <App>
        <AuditPage />
      </App>
    </ConfigProvider>,
  );
}

async function selectOption(label: string, option: string) {
  const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
  await user.click(screen.getByRole('combobox', { name: label }));
  await user.click(
    await screen.findByRole('option', { name: option }, INITIAL_WAIT),
  );
}

beforeEach(() => {
  vi.useFakeTimers({ now: FROZEN_NOW, toFake: ['Date'] });
  administrationMocks.listAuditEvents.mockReset();
});

afterEach(() => {
  vi.useRealTimers();
});

describe('AuditPage', () => {
  it('does not show static audit metrics or trend fallbacks when the API has no aggregate contract', () => {
    administrationMocks.listAuditEvents.mockReturnValue(
      new Promise<AuditEventsResponse>(() => {}),
    );

    renderPage();

    expect(
      screen.queryByRole('article', { name: '近 7 日操作：395' }),
    ).not.toBeInTheDocument();
    expect(
      screen.queryByRole('article', { name: '高危操作：3' }),
    ).not.toBeInTheDocument();
    expect(
      screen.queryByRole('article', { name: '拦截事件：1' }),
    ).not.toBeInTheDocument();
    expect(
      screen.queryByRole('article', { name: '覆盖率：100%' }),
    ).not.toBeInTheDocument();
    expect(screen.queryByText('最近 7 天审计事实')).not.toBeInTheDocument();
    expect(screen.queryByText('需要优先复核')).not.toBeInTheDocument();
    expect(screen.queryByText('策略已阻止业务效果')).not.toBeInTheDocument();
    expect(screen.queryByText('全链路审计覆盖')).not.toBeInTheDocument();
    expect(
      screen.queryByRole('figure', { name: '近 7 日审计趋势' }),
    ).not.toBeInTheDocument();
    expect(
      screen.queryByRole('figure', { name: '审计动作分类' }),
    ).not.toBeInTheDocument();
    expect(
      screen.queryByRole('list', { name: '审计结果分布' }),
    ).not.toBeInTheDocument();
    expect(screen.queryByText('成功92%')).not.toBeInTheDocument();
    expect(
      within(screen.getByRole('region', { name: '审计指标' })).getAllByText(
        '—',
      ),
    ).toHaveLength(4);
  });

  it('renders real audit DTO fields in the table and detail drawer without invented aggregates', async () => {
    const event = makeAuditEvent();
    administrationMocks.listAuditEvents.mockResolvedValueOnce({
      items: [event],
      nextCursor: null,
    } satisfies AuditEventsResponse);

    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
    renderPage();

    expect(screen.getAllByText('当前审计接口未提供聚合统计')).toHaveLength(4);
    expect(
      within(screen.getByRole('region', { name: '审计指标' })).getAllByText(
        '—',
      ),
    ).toHaveLength(4);
    const row = await screen.findByRole(
      'row',
      { name: /AUD-2026-0810-001/ },
      INITIAL_WAIT,
    );
    expect(row).toHaveTextContent('孙杰');
    expect(row).toHaveTextContent('CONFIGURATION / access-policy-v8');
    expect(row).toHaveTextContent('—');
    expect(administrationMocks.listAuditEvents).toHaveBeenCalledWith({
      ...rangeBounds(7),
      limit: 3,
    });

    await user.click(within(row).getByRole('button', { name: '查看详情' }));

    const drawer = await screen.findByRole('dialog', {
      name: '审计事件详情',
    });
    expect(drawer).toHaveTextContent('corr-audit-001');
    expect(drawer).toHaveTextContent('req-audit-001');
    expect(drawer).toHaveTextContent('策略发布前的复核完成');
  });

  it('shows the real empty table state and unavailable aggregate values', async () => {
    administrationMocks.listAuditEvents.mockResolvedValueOnce({
      items: [],
      nextCursor: null,
    } satisfies AuditEventsResponse);

    renderPage();

    await waitFor(() => {
      expect(administrationMocks.listAuditEvents).toHaveBeenCalledTimes(1);
    }, INITIAL_WAIT);
    expect(screen.getByRole('table')).toBeInTheDocument();
    expect(
      screen.queryByRole('row', { name: /AUD-2026-/ }),
    ).not.toBeInTheDocument();
    expect(screen.getByText('共 0 条')).toBeInTheDocument();
    expect(screen.getByText('当前没有真实审计数据')).toBeInTheDocument();
    expect(screen.getAllByText('—')).toHaveLength(4);
  });

  it('shows a 403 Problem Details message with its requestId and clears the table', async () => {
    administrationMocks.listAuditEvents.mockRejectedValueOnce(
      createApiErrorFixture({
        detail: '无权查看审计事件',
        requestId: 'req-audit-forbidden',
        status: 403,
        title: 'FORBIDDEN',
      }),
    );

    renderPage();

    expect(await screen.findByRole('alert')).toHaveTextContent(
      '无权查看审计事件（requestId: req-audit-forbidden）',
    );
    expect(
      screen.getByRole('button', { name: '重试加载审计事件' }),
    ).toBeVisible();
    expect(screen.getByText('共 0 条')).toBeInTheDocument();
  });

  it('刷新失败时清除旧行并进入显式错误态', async () => {
    administrationMocks.listAuditEvents
      .mockResolvedValueOnce({
        items: [makeAuditEvent()],
        nextCursor: null,
      } satisfies AuditEventsResponse)
      .mockRejectedValueOnce(
        createApiErrorFixture({
          detail: '审计刷新失败',
          requestId: 'req-audit-refresh',
          status: 503,
        }),
      );
    renderPage();
    expect(
      await screen.findByRole(
        'row',
        { name: /AUD-2026-0810-001/ },
        INITIAL_WAIT,
      ),
    ).toBeVisible();

    await selectOption('时间范围', '今天');

    expect(await screen.findByRole('alert')).toHaveTextContent(
      '审计刷新失败（requestId: req-audit-refresh）',
    );
    expect(screen.queryByRole('row', { name: /AUD-2026-0810-001/ })).toBeNull();
    expect(screen.getByText('共 0 条')).toBeVisible();
  });

  it('uses the frozen system clock when mapping the today range to the API query', async () => {
    administrationMocks.listAuditEvents.mockImplementation(
      async (_query: AuditEventsQuery) =>
        ({ items: [], nextCursor: null }) satisfies AuditEventsResponse,
    );
    renderPage();
    await waitFor(() => {
      expect(administrationMocks.listAuditEvents).toHaveBeenCalledTimes(1);
    }, INITIAL_WAIT);

    await selectOption('时间范围', '今天');

    await waitFor(() => {
      expect(administrationMocks.listAuditEvents).toHaveBeenLastCalledWith({
        ...rangeBounds(1),
        limit: 3,
      });
    }, INITIAL_WAIT);
  });
});
