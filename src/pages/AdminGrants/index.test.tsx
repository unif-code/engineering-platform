import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent, { type UserEvent } from '@testing-library/user-event';
import { App, ConfigProvider } from 'antd';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { GrantSummary } from '@/features/administration';
import {
  ACCOUNT_FIXTURES,
  GRANT_FIXTURES,
  WORKSPACE_FIXTURES,
} from '../../../tests/fixtures/accessGovernance';

const administrationMocks = vi.hoisted(() => ({
  createGrant: vi.fn(),
  listAccounts: vi.fn(),
  listGrants: vi.fn(),
  listWorkspaces: vi.fn(),
  revokeGrant: vi.fn(),
}));

vi.mock('@umijs/max', async () => ({
  ...(await import('@tanstack/react-query')),
}));

vi.mock('@/features/administration', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@/features/administration')>()),
  ...administrationMocks,
}));

import AdminGrantsPage from '.';

const INITIAL_WAIT = { timeout: 15_000 };
const INTERACTION_TEST_TIMEOUT = 30_000;
const ACTIVE_WORKSPACES = Object.freeze(
  WORKSPACE_FIXTURES.filter(({ status }) => status === 'ACTIVE'),
);
const INITIAL_GRANTS_RESPONSE = Object.freeze({
  items: GRANT_FIXTURES,
  total: GRANT_FIXTURES.length,
});
const CREATED_GRANT = Object.freeze<GrantSummary>({
  capability: 'ws.config',
  id: 'grant-workspace-config',
  principal: Object.freeze({
    displayName: '吴桐',
    employeeNo: 'E1002',
    id: 'account-2',
  }),
  scope: Object.freeze({
    id: 'workspace-platform-core',
    label: '营销工作区',
    type: 'WORKSPACE',
  }),
  source: 'MANUAL',
  status: 'ACTIVE',
  validFrom: '2026-08-18T08:00:00.000Z',
  validTo: null,
  version: 1,
});
const REVOKED_GRANT = Object.freeze<GrantSummary>({
  ...GRANT_FIXTURES[0],
  status: 'REVOKED',
  version: 2,
});

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
  Object.values(administrationMocks).forEach((mock) => {
    mock.mockReset();
  });
  administrationMocks.listAccounts.mockResolvedValue(
    Object.freeze({
      items: ACCOUNT_FIXTURES,
      total: ACCOUNT_FIXTURES.length,
    }),
  );
  administrationMocks.listWorkspaces.mockResolvedValue(
    Object.freeze({
      items: ACTIVE_WORKSPACES,
      total: ACTIVE_WORKSPACES.length,
    }),
  );
  administrationMocks.listGrants.mockResolvedValue(INITIAL_GRANTS_RESPONSE);
  administrationMocks.createGrant.mockResolvedValue(CREATED_GRANT);
  administrationMocks.revokeGrant.mockResolvedValue(REVOKED_GRANT);
});

describe('AdminGrantsPage', () => {
  it('按新版原型呈现授权统计、分类筛选与七列表格', async () => {
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
    for (const label of ['生效中授权', '临时授权', '高危能力授权']) {
      expect(within(stats).getByText(label)).toBeVisible();
    }
    expect(within(stats).queryByText('角色继承')).not.toBeInTheDocument();
    expect(
      screen.getByRole('radiogroup', { name: 'Grant 分类' }),
    ).toBeVisible();
    expect(administrationMocks.listGrants).toHaveBeenCalledWith({
      page: 1,
      pageSize: 100,
    });
    expect(administrationMocks.listAccounts).toHaveBeenCalledWith({
      page: 1,
      pageSize: 100,
      sortBy: 'employeeNo',
      sortOrder: 'asc',
      status: 'ENABLED',
    });
    expect(administrationMocks.listWorkspaces).toHaveBeenCalledWith({
      page: 1,
      pageSize: 100,
      status: 'ACTIVE',
    });

    expect(
      within(
        screen.getByRole('radiogroup', { name: 'Grant 分类' }),
      ).queryByText('继承'),
    ).not.toBeInTheDocument();
    expect(
      screen.queryByRole('row', { name: /开发Leader.*分配任务.*继承/ }),
    ).not.toBeInTheDocument();
  });

  it(
    '授予通过 Feature 公开入口传递 principal、capability、Workspace scope 与 reason',
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
      expect(administrationMocks.createGrant).not.toHaveBeenCalled();
      await selectOption(user, '主体类型', '用户');
      await selectOption(user, '主体', 'E1002 · 吴桐');
      administrationMocks.listGrants.mockResolvedValue(
        Object.freeze({
          items: Object.freeze([...GRANT_FIXTURES, CREATED_GRANT]),
          total: GRANT_FIXTURES.length + 1,
        }),
      );
      await user.click(
        within(dialog).getByRole('button', { name: '确认授予' }),
      );

      expect(await screen.findByText('能力已授予')).toBeInTheDocument();
      expect(administrationMocks.createGrant.mock.calls[0]?.[0]).toEqual({
        capability: 'ws.config',
        principalId: 'account-2',
        reason: '承担营销工作区治理职责',
        scope: { id: 'workspace-platform-core', type: 'WORKSPACE' },
      });
      expect(
        await screen.findByRole(
          'row',
          { name: /吴桐.*工作区配置.*营销工作区/ },
          INITIAL_WAIT,
        ),
      ).toBeInTheDocument();
    },
    INTERACTION_TEST_TIMEOUT,
  );

  it(
    '撤销要求 reason，并把 Grant ID 与 version 交给 service 生成 ETag',
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
      administrationMocks.listGrants.mockResolvedValue(
        Object.freeze({
          items: Object.freeze([REVOKED_GRANT, ...GRANT_FIXTURES.slice(1)]),
          total: GRANT_FIXTURES.length,
        }),
      );
      await user.click(
        within(dialog).getByRole('button', { name: '确认撤销' }),
      );

      expect(await screen.findByText('Grant 已撤销')).toBeInTheDocument();
      expect(administrationMocks.revokeGrant).toHaveBeenCalledWith(
        'grant-audit-reader',
        { reason: '审计轮值结束' },
        1,
      );
      const revokedRow = await screen.findByRole(
        'row',
        { name: /陈晓.*开发任务.*营销工作区.*已撤销/ },
        INITIAL_WAIT,
      );
      await waitFor(() => {
        expect(
          within(revokedRow).queryByRole('button', { name: '撤销' }),
        ).not.toBeInTheDocument();
      });
      expect(within(revokedRow).getByText('已撤销')).toBeVisible();
    },
    INTERACTION_TEST_TIMEOUT,
  );
});
