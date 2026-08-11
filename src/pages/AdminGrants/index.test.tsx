import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent, { type UserEvent } from '@testing-library/user-event';
import { App, ConfigProvider } from 'antd';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
  createMockRequester,
  type MockRoutes,
} from '../../../tests/mockRequestHarness';

const requestMock = vi.hoisted(() => vi.fn());

vi.mock('@umijs/max', async () => ({
  ...(await import('@tanstack/react-query')),
  defineMock: <T,>(routes: T) => routes,
  request: requestMock,
}));

import { createAdminAccountsMock } from '../../../mock/adminAccounts';
import { createAdminGrantsMock } from '../../../mock/adminGrants';
import { createAdminWorkspacesMock } from '../../../mock/adminWorkspaces';
import AdminGrantsPage from '.';

const INITIAL_WAIT = { timeout: 5_000 };
let routes: MockRoutes;
const requestThroughMock = createMockRequester(() => routes);

function renderPage() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return render(
    <QueryClientProvider client={queryClient}>
      <ConfigProvider theme={{ token: { motion: false } }}>
        <App>
          <AdminGrantsPage />
        </App>
      </ConfigProvider>
    </QueryClientProvider>,
  );
}

async function selectOption(user: UserEvent, label: string, option: string) {
  await user.click(screen.getByRole('combobox', { name: label }));
  await user.click(await screen.findByRole('option', { name: option }));
}

beforeEach(() => {
  routes = {
    ...createAdminAccountsMock(),
    ...createAdminWorkspacesMock(),
    ...createAdminGrantsMock(),
  };
  requestMock.mockReset();
  requestMock.mockImplementation(requestThroughMock);
});

describe('AdminGrantsPage', () => {
  it('用 ProTable request 呈现 principal × capability × scope 直授列表', async () => {
    renderPage();

    expect(
      await screen.findByRole(
        'row',
        { name: /示例用户甲.*audit\.read.*Platform/ },
        INITIAL_WAIT,
      ),
    ).toBeInTheDocument();
    expect(screen.getByRole('table')).toBeInTheDocument();
    expect(
      screen.getByRole('toolbar', { name: 'Grant 筛选与操作' }),
    ).toBeInTheDocument();
    expect(requestMock).toHaveBeenCalledWith('/api/v1/admin/grants', {
      method: 'GET',
      params: { page: 1, pageSize: 10 },
    });
    expect(
      screen.queryByText(/角色模板|Capability Template/),
    ).not.toBeInTheDocument();
  });

  it('授予请求体保留 principal、capability、Workspace scope 与 reason', async () => {
    const user = userEvent.setup();
    renderPage();
    await screen.findByRole('table', {}, INITIAL_WAIT);

    await user.click(screen.getByRole('button', { name: '授予能力' }));
    const dialog = await screen.findByRole('dialog', { name: '授予能力' });
    await selectOption(user, 'Principal', '10000002 · 示例用户乙');
    await selectOption(user, 'Capability', 'Workspace 治理');
    await selectOption(user, 'Scope 类型', 'Workspace');
    await selectOption(user, 'Workspace', 'Platform Core');
    await user.type(
      within(dialog).getByRole('textbox', { name: '授予原因' }),
      '承担 Platform Core 治理职责',
    );
    await user.click(within(dialog).getByRole('button', { name: '确认授予' }));

    expect(await screen.findByText('能力已授予')).toBeInTheDocument();
    expect(requestMock).toHaveBeenCalledWith('/api/v1/admin/grants', {
      data: {
        capability: 'workspace.manage',
        principalId: 'account-2',
        reason: '承担 Platform Core 治理职责',
        scope: {
          id: 'workspace-platform-core',
          type: 'WORKSPACE',
        },
      },
      headers: {
        'Idempotency-Key': expect.stringMatching(/^[0-9a-f-]{36}$/),
      },
      method: 'POST',
    });
  });

  it('撤销要求 reason，并向具体 Grant 发送带幂等键的 DELETE', async () => {
    const user = userEvent.setup();
    renderPage();
    const row = await screen.findByRole(
      'row',
      { name: /示例用户甲.*audit\.read.*Platform/ },
      INITIAL_WAIT,
    );

    await user.click(within(row).getByRole('button', { name: '撤销' }));
    const dialog = await screen.findByRole('dialog', { name: '撤销 Grant' });
    await user.click(within(dialog).getByRole('button', { name: '确认撤销' }));
    expect(await within(dialog).findByText('请输入撤销原因')).toBeVisible();
    await user.type(
      within(dialog).getByRole('textbox', { name: '撤销原因' }),
      '审计轮值结束',
    );
    await user.click(within(dialog).getByRole('button', { name: '确认撤销' }));

    expect(await screen.findByText('Grant 已撤销')).toBeInTheDocument();
    expect(requestMock).toHaveBeenCalledWith(
      '/api/v1/admin/grants/grant-audit-reader',
      {
        data: { reason: '审计轮值结束' },
        headers: {
          'Idempotency-Key': expect.stringMatching(/^[0-9a-f-]{36}$/),
        },
        method: 'DELETE',
      },
    );
    await waitFor(() => {
      expect(
        within(row).queryByRole('button', { name: '撤销' }),
      ).not.toBeInTheDocument();
    });
  });
});
