import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent, { type UserEvent } from '@testing-library/user-event';
import { App, ConfigProvider } from 'antd';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
  createMockFetch,
  type MockRoutes,
} from '../../../tests/mockRequestHarness';

const { fetchMock, requestMock } = vi.hoisted(() => {
  const fetchMock = vi.fn();
  vi.stubGlobal('fetch', fetchMock);
  return { fetchMock, requestMock: vi.fn() };
});

vi.mock('@umijs/max', async () => ({
  ...(await import('@tanstack/react-query')),
  defineMock: <T,>(routes: T) => routes,
}));

import { createAdminAccountsMock } from '../../../mock/adminAccounts';
import { createAdminGrantsMock } from '../../../mock/adminGrants';
import { createAdminWorkspacesMock } from '../../../mock/adminWorkspaces';
import AdminGrantsPage from '.';

const INITIAL_WAIT = { timeout: 5_000 };
const INTERACTION_TEST_TIMEOUT = 30_000;
let routes: MockRoutes;
const fetchThroughMock = createMockFetch(() => routes);

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
  fetchMock.mockReset();
  fetchMock.mockImplementation(
    async (input: RequestInfo | URL, init?: RequestInit) => {
      const request =
        input instanceof Request ? input : new Request(String(input), init);
      const url = new URL(request.url);
      const bodyText = await request.clone().text();
      const headers = Object.fromEntries(
        [...request.headers.entries()].filter(([name]) =>
          ['idempotency-key', 'if-match'].includes(name.toLocaleLowerCase()),
        ),
      );
      requestMock(url.pathname, {
        ...(bodyText ? { data: JSON.parse(bodyText) } : {}),
        ...(Object.keys(headers).length > 0 ? { headers } : {}),
        method: request.method,
        ...(url.search ? { params: Object.fromEntries(url.searchParams) } : {}),
      });
      return fetchThroughMock(input, init);
    },
  );
});

describe('AdminGrantsPage', () => {
  it('按新版原型呈现授权统计、分类筛选与七列表格', async () => {
    const user = userEvent.setup();
    renderPage();

    expect(
      await screen.findByRole(
        'row',
        { name: /陈晓.*开发任务.*营销工作区.*直接/ },
        INITIAL_WAIT,
      ),
    ).toBeInTheDocument();
    expect(
      screen.getByText(
        '一条授权 = 主体 × 能力 × 范围。菜单可见性只是体验，最终判定始终由服务端做',
      ),
    ).toBeVisible();
    const table = screen.getByRole('table');
    expect(table).toBeInTheDocument();
    expect(table.closest('.ant-table-small')).not.toBeNull();
    const stats = screen.getByRole('region', { name: 'Grant 统计' });
    for (const label of [
      '生效中授权',
      '临时授权',
      '高危能力授权',
      '角色继承',
    ]) {
      expect(within(stats).getByText(label)).toBeVisible();
    }
    expect(
      screen.getByRole('radiogroup', { name: 'Grant 分类' }),
    ).toBeVisible();
    expect(requestMock).toHaveBeenCalledWith('/api/v1/admin/grants', {
      method: 'GET',
    });

    await user.click(
      within(screen.getByRole('radiogroup', { name: 'Grant 分类' })).getByText(
        '继承',
      ),
    );
    expect(
      await screen.findByRole('row', { name: /开发Leader.*分配任务.*继承/ }),
    ).toBeVisible();
    expect(screen.queryByRole('row', { name: /陈晓/ })).not.toBeInTheDocument();
  });

  it(
    '授予请求体保留 principal、capability、Workspace scope 与 reason',
    async () => {
      const user = userEvent.setup();
      renderPage();
      await screen.findByRole('table', {}, INITIAL_WAIT);

      await user.click(screen.getByRole('button', { name: '新增授权' }));
      const dialog = await screen.findByRole('dialog', { name: '新增授权' });
      await selectOption(user, '主体类型', '用户');
      await selectOption(user, '主体', 'E1002 · 吴桐');
      await selectOption(user, '能力', '工作区配置');
      await user.click(screen.getByRole('combobox', { name: '范围' }));
      for (const department of ['营销部门', '交易部门', '中台部门']) {
        expect(screen.getByRole('option', { name: department })).toBeVisible();
      }
      await user.click(
        await screen.findByRole('option', { name: '营销工作区' }),
      );
      await user.click(screen.getByRole('combobox', { name: '有效期' }));
      expect(screen.getByRole('option', { name: '30 天临时' })).toBeVisible();
      expect(screen.getByRole('option', { name: '90 天临时' })).toBeVisible();
      await user.click(await screen.findByRole('option', { name: '长期' }));
      await user.type(
        within(dialog).getByRole('textbox', { name: '授权原因' }),
        '承担营销工作区治理职责',
      );
      await selectOption(user, '主体类型', '角色');
      await user.click(
        within(dialog).getByRole('button', { name: '确认授予' }),
      );
      expect(await within(dialog).findByText('请选择主体')).toBeVisible();
      expect(requestMock).not.toHaveBeenCalledWith(
        '/api/v1/admin/grants',
        expect.objectContaining({ method: 'POST' }),
      );
      await selectOption(user, '主体类型', '用户');
      await selectOption(user, '主体', 'E1002 · 吴桐');
      await user.click(
        within(dialog).getByRole('button', { name: '确认授予' }),
      );

      expect(await screen.findByText('能力已授予')).toBeInTheDocument();
      expect(requestMock).toHaveBeenCalledWith('/api/v1/admin/grants', {
        data: {
          capability: 'ws.config',
          principalId: 'account-2',
          reason: '承担营销工作区治理职责',
          scopeId: 'workspace-platform-core',
          scopeType: 'WORKSPACE',
          source: 'MANUAL',
        },
        headers: {
          'Idempotency-Key': expect.stringMatching(/^[0-9a-f-]{36}$/),
        },
        method: 'POST',
      });
    },
    INTERACTION_TEST_TIMEOUT,
  );

  it(
    '撤销要求 reason，并向具体 Grant 发送带幂等键的 DELETE',
    async () => {
      const user = userEvent.setup();
      renderPage();
      const row = await screen.findByRole(
        'row',
        { name: /陈晓.*开发任务.*营销工作区.*直接/ },
        INITIAL_WAIT,
      );

      await user.click(within(row).getByRole('button', { name: '撤销' }));
      const dialog = await screen.findByRole('dialog', { name: '撤销 Grant' });
      await user.click(
        within(dialog).getByRole('button', { name: '确认撤销' }),
      );
      expect(await within(dialog).findByText('请输入撤销原因')).toBeVisible();
      await user.type(
        within(dialog).getByRole('textbox', { name: '撤销原因' }),
        '审计轮值结束',
      );
      await user.click(
        within(dialog).getByRole('button', { name: '确认撤销' }),
      );

      expect(await screen.findByText('Grant 已撤销')).toBeInTheDocument();
      expect(requestMock).toHaveBeenCalledWith(
        '/api/v1/admin/grants/grant-audit-reader',
        {
          data: { reason: '审计轮值结束' },
          headers: {
            'Idempotency-Key': expect.stringMatching(/^[0-9a-f-]{36}$/),
            'If-Match': '"v1"',
          },
          method: 'DELETE',
        },
      );
      await waitFor(() => {
        expect(
          within(row).queryByRole('button', { name: '撤销' }),
        ).not.toBeInTheDocument();
      });
    },
    INTERACTION_TEST_TIMEOUT,
  );
});
