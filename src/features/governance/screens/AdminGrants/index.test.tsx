import { createProblemError } from '@root/tests/fixtures/problemError';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { act, render, screen, waitFor, within } from '@testing-library/react';
import userEvent, { type UserEvent } from '@testing-library/user-event';
import { App, ConfigProvider } from 'antd';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type {
  AccountSummary,
  GrantSummary,
  WorkspaceSummary,
} from '@/features/administration';

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
const ACCOUNT_FIXTURES = Object.freeze<AccountSummary[]>([
  {
    displayName: '吴桐',
    employeeNo: 'E1002',
    etag: '"v1"',
    id: 'account-2',
    profession: '产品',
    status: 'ENABLED',
  },
  {
    displayName: '陈晓',
    employeeNo: 'E1004',
    etag: '"v1"',
    id: 'account-4',
    profession: '研发',
    status: 'ENABLED',
  },
  {
    displayName: '何山',
    employeeNo: 'E2002',
    etag: '"v1"',
    id: 'account-9',
    profession: '研发',
    status: 'ENABLED',
  },
]);
const WORKSPACE_FIXTURES = Object.freeze<WorkspaceSummary[]>([
  {
    id: 'workspace-platform-core',
    leaders: [],
    memberCount: 12,
    name: '营销工作区',
    owner: { displayName: '吴桐', employeeNo: 'E1002', id: 'account-2' },
    status: 'ACTIVE',
    version: 1,
  },
  {
    id: 'workspace-agent-runtime',
    leaders: [],
    memberCount: 9,
    name: '交易工作区',
    owner: { displayName: '何山', employeeNo: 'E2002', id: 'account-9' },
    status: 'ACTIVE',
    version: 1,
  },
]);
const GRANT_FIXTURES = Object.freeze<GrantSummary[]>([
  {
    capability: 'task.develop',
    id: 'grant-audit-reader',
    principal: { displayName: '陈晓', employeeNo: 'E1004', id: 'account-4' },
    scope: {
      id: 'workspace-platform-core',
      label: '营销工作区',
      type: 'WORKSPACE',
    },
    source: 'MANUAL',
    status: 'ACTIVE',
    validFrom: '2026-07-01T08:00:00.000Z',
    validTo: null,
    version: 1,
  },
  {
    capability: 'mr.merge',
    id: 'grant-merge-trading',
    principal: { displayName: '何山', employeeNo: 'E2002', id: 'account-9' },
    scope: {
      id: 'workspace-agent-runtime',
      label: '交易工作区',
      type: 'WORKSPACE',
    },
    source: 'MANUAL',
    status: 'ACTIVE',
    validFrom: '2026-07-01T08:00:00.000Z',
    validTo: '2026-10-01T08:00:00.000Z',
    version: 1,
  },
  {
    capability: 'ws.config',
    id: 'grant-inherited-workspace-config',
    principal: { displayName: '吴桐', employeeNo: 'E1002', id: 'account-2' },
    scope: {
      id: 'workspace-platform-core',
      label: '营销工作区',
      type: 'WORKSPACE',
    },
    source: 'INHERITED',
    status: 'ACTIVE',
    validFrom: '2026-07-01T08:00:00.000Z',
    validTo: null,
    version: 1,
  },
]);
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

function expectExactlyOneCall(
  mock: { mock: { calls: unknown[][] } },
  ...expectedArguments: unknown[]
) {
  expect(mock.mock.calls).toEqual([expectedArguments]);
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
        { name: /陈晓.*task\.develop.*营销工作区.*直接/ },
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
    expect(within(stats).getByText('—')).toBeVisible();
    expect(within(stats).getByText('角色继承').parentElement).toHaveTextContent(
      '1角色继承',
    );
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
      screen.getByRole('row', { name: /吴桐.*ws\.config.*营销工作区.*继承/ }),
    ).toBeInTheDocument();
  });

  it(
    '授予通过 Feature 公开入口传递 principal、capability、Workspace scope 与 reason',
    async () => {
      const user = userEvent.setup();
      renderPage();
      await screen.findByRole('table', {}, INITIAL_WAIT);

      await user.click(screen.getByRole('button', { name: '新增授权' }));
      const dialog = await screen.findByRole('dialog', { name: '新增授权' });
      await selectOption(user, '主体', 'E1002 · 吴桐');
      await user.type(
        within(dialog).getByRole('textbox', { name: '能力' }),
        'ws.config',
      );
      await user.click(screen.getByRole('combobox', { name: '范围' }));
      for (const department of ['营销部门', '交易部门', '中台部门']) {
        expect(screen.queryByRole('option', { name: department })).toBeNull();
      }
      await user.click(
        await screen.findByRole('option', { name: '营销工作区' }),
      );
      await user.click(screen.getByRole('combobox', { name: '有效期' }));
      expect(
        screen.getByRole('option', {
          name: '30 天临时（当前版本暂未接入）',
        }),
      ).toHaveAttribute('aria-disabled', 'true');
      expect(
        screen.getByRole('option', {
          name: '90 天临时（当前版本暂未接入）',
        }),
      ).toHaveAttribute('aria-disabled', 'true');
      await user.click(await screen.findByRole('option', { name: '长期' }));
      await user.type(
        within(dialog).getByRole('textbox', { name: '授权原因' }),
        '承担营销工作区治理职责',
      );
      expect(
        within(dialog).getByRole('combobox', { name: '主体类型' }),
      ).toBeDisabled();
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
      expectExactlyOneCall(
        administrationMocks.createGrant,
        {
          capability: 'ws.config',
          principalId: 'account-2',
          reason: '承担营销工作区治理职责',
          scope: { id: 'workspace-platform-core', type: 'WORKSPACE' },
        },
        expect.any(Object),
      );
      expect(
        await screen.findByRole(
          'row',
          { name: /吴桐.*ws\.config.*营销工作区.*直接/ },
          INITIAL_WAIT,
        ),
      ).toBeInTheDocument();
    },
    INTERACTION_TEST_TIMEOUT,
  );

  it('高危分类禁用，临时与角色继承分类只使用真实 DTO 字段', async () => {
    const user = userEvent.setup();
    renderPage();
    await screen.findByRole(
      'row',
      { name: /陈晓.*task\.develop/ },
      INITIAL_WAIT,
    );

    const filters = screen.getByRole('radiogroup', { name: 'Grant 分类' });
    expect(
      within(filters).getByRole('radio', { name: '高危能力' }),
    ).toBeDisabled();

    await user.click(within(filters).getByText('临时授权'));
    expect(
      await screen.findByRole('row', { name: /何山.*mr\.merge/ }, INITIAL_WAIT),
    ).toBeInTheDocument();
    expect(
      screen.queryByRole('row', { name: /陈晓.*task\.develop/ }),
    ).toBeNull();

    await user.click(within(filters).getByText('角色继承'));
    expect(
      await screen.findByRole(
        'row',
        { name: /吴桐.*ws\.config.*营销工作区.*继承/ },
        INITIAL_WAIT,
      ),
    ).toBeInTheDocument();
    expect(screen.queryByRole('row', { name: /何山.*mr\.merge/ })).toBeNull();
  });

  it('真实 Grant 列表为空时展示明确空态', async () => {
    administrationMocks.listGrants.mockResolvedValueOnce({
      items: [],
      total: 0,
    });
    renderPage();

    expect(
      await screen.findByText('暂无真实 Grant', {}, INITIAL_WAIT),
    ).toBeVisible();
  });

  it('呈现平台范围、未知能力、继承来源与立即生效兜底', async () => {
    administrationMocks.listGrants.mockResolvedValueOnce({
      items: [
        {
          ...GRANT_FIXTURES[0],
          capability: 'task.unknown',
          id: 'grant-inherited-platform',
          scope: { id: null, label: '全平台', type: 'PLATFORM' },
          source: 'INHERITED',
          validFrom: null,
        },
      ],
      total: 1,
    });
    renderPage();

    const row = await screen.findByRole(
      'row',
      { name: /task\.unknown.*全平台.*继承.*立即 起.*长期/ },
      INITIAL_WAIT,
    );
    expect(within(row).getAllByText('继承')).toHaveLength(2);
    expect(within(row).getByText('—')).toBeVisible();
    expect(within(row).queryByRole('button', { name: '撤销' })).toBeNull();
  });

  it('列表失败展示服务端 detail 与 requestId 并清空旧数据', async () => {
    administrationMocks.listGrants.mockRejectedValueOnce(
      createProblemError({
        detail: 'Grant 列表无权访问',
        requestId: 'req-grant-list-403',
        status: 403,
      }),
    );
    renderPage();

    expect(
      await screen.findByText(/Grant 列表无权访问/, {}, INITIAL_WAIT),
    ).toHaveTextContent('requestId: req-grant-list-403');
    expect(
      screen.getByRole('button', { name: '重试加载 Grant' }),
    ).toBeVisible();
    expect(screen.queryByRole('row', { name: /陈晓.*开发任务/ })).toBeNull();
    expect(
      within(screen.getByRole('region', { name: 'Grant 统计' })).getAllByText(
        '—',
      ),
    ).toHaveLength(4);
  });

  it.each(['resolve', 'reject'] as const)(
    '页面卸载后忽略仍在途 Grant 请求：%s',
    async (outcome) => {
      let resolvePending: (value: typeof INITIAL_GRANTS_RESPONSE) => void =
        () => {
          throw new Error('pending Grant request was not started');
        };
      let rejectPending: (reason: unknown) => void = () => {
        throw new Error('pending Grant request was not started');
      };
      administrationMocks.listGrants.mockImplementationOnce(
        () =>
          new Promise((resolve, reject) => {
            resolvePending = resolve;
            rejectPending = reject;
          }),
      );
      const view = renderPage();
      await waitFor(() => {
        expect(administrationMocks.listGrants).toHaveBeenCalledTimes(1);
      });

      view.unmount();
      await act(async () => {
        if (outcome === 'resolve') {
          resolvePending(INITIAL_GRANTS_RESPONSE);
        } else {
          rejectPending(
            createProblemError({
              detail: '页面卸载后的旧请求',
              requestId: 'unmounted-grant-request',
              status: 403,
            }),
          );
        }
      });

      expect(screen.queryByText(/页面卸载后的旧请求/)).toBeNull();
    },
  );

  it('授予失败保留 Modal 并展示服务端 detail 与 requestId', async () => {
    const user = userEvent.setup();
    administrationMocks.createGrant.mockRejectedValueOnce(
      createProblemError({
        detail: '该授权与现有 Grant 冲突',
        requestId: 'req-grant-create-409',
        status: 409,
      }),
    );
    renderPage();
    await screen.findByRole('table', {}, INITIAL_WAIT);

    await user.click(screen.getByRole('button', { name: '新增授权' }));
    const dialog = await screen.findByRole('dialog', { name: '新增授权' });
    await selectOption(user, '主体', 'E1002 · 吴桐');
    await user.type(
      within(dialog).getByRole('textbox', { name: '能力' }),
      'ws.config',
    );
    await selectOption(user, '范围', '全平台');
    await user.type(
      within(dialog).getByRole('textbox', { name: '授权原因' }),
      '验证重复授权冲突',
    );
    const listCallsBeforeSubmit =
      administrationMocks.listGrants.mock.calls.length;
    await user.click(within(dialog).getByRole('button', { name: '确认授予' }));

    expect(
      await screen.findByText(/该授权与现有 Grant 冲突/),
    ).toHaveTextContent('requestId: req-grant-create-409');
    expect(screen.getByRole('dialog', { name: '新增授权' })).toBeVisible();
    expect(administrationMocks.listGrants).toHaveBeenCalledTimes(
      listCallsBeforeSubmit,
    );
  });

  it('撤销失败保留 Modal 并展示服务端 detail 与 requestId', async () => {
    const user = userEvent.setup();
    administrationMocks.revokeGrant.mockRejectedValueOnce(
      createProblemError({
        detail: 'Grant 版本已过期',
        requestId: 'req-grant-revoke-412',
        status: 412,
      }),
    );
    renderPage();
    const row = await screen.findByRole(
      'row',
      { name: /陈晓.*task\.develop.*营销工作区.*直接/ },
      INITIAL_WAIT,
    );
    await user.click(within(row).getByRole('button', { name: '撤销' }));
    const dialog = await screen.findByRole('dialog', { name: '撤销 Grant' });
    await user.type(
      within(dialog).getByRole('textbox', { name: '撤销原因' }),
      '验证并发冲突',
    );
    const listCallsBeforeSubmit =
      administrationMocks.listGrants.mock.calls.length;
    await user.click(within(dialog).getByRole('button', { name: '确认撤销' }));

    expect(await screen.findByText(/Grant 版本已过期/)).toHaveTextContent(
      'requestId: req-grant-revoke-412',
    );
    expect(screen.getByRole('dialog', { name: '撤销 Grant' })).toBeVisible();
    expect(administrationMocks.listGrants).toHaveBeenCalledTimes(
      listCallsBeforeSubmit,
    );
  });

  it(
    '撤销要求 reason，并把 Grant ID 与 version 交给 service 生成 ETag',
    async () => {
      const user = userEvent.setup();
      renderPage();
      const row = await screen.findByRole(
        'row',
        { name: /陈晓.*task\.develop.*营销工作区.*直接/ },
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
      expectExactlyOneCall(
        administrationMocks.revokeGrant,
        'grant-audit-reader',
        { reason: '审计轮值结束' },
        1,
      );
      const revokedRow = await screen.findByRole(
        'row',
        { name: /陈晓.*task\.develop.*营销工作区.*已撤销/ },
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
