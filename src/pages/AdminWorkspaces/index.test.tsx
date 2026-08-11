import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent, { type UserEvent } from '@testing-library/user-event';
import { App, ConfigProvider } from 'antd';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
  createMockRequester,
  type MockRequest,
  type MockResponse,
  type MockRoutes,
} from '../../../tests/mockRequestHarness';

const requestMock = vi.hoisted(() => vi.fn());

vi.mock('@umijs/max', async () => ({
  ...(await import('@tanstack/react-query')),
  defineMock: <T,>(routes: T) => routes,
  request: requestMock,
}));

import { createAdminOrganizationMock } from '../../../mock/adminOrg';
import { createAdminWorkspacesMock } from '../../../mock/adminWorkspaces';
import AdminWorkspacesPage from '.';

let routes: MockRoutes;
const requestThroughMock = createMockRequester(() => routes);

const INITIAL_WAIT = { timeout: 5_000 };

function renderPage() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return render(
    <QueryClientProvider client={queryClient}>
      <ConfigProvider theme={{ token: { motion: false } }}>
        <App>
          <AdminWorkspacesPage />
        </App>
      </ConfigProvider>
    </QueryClientProvider>,
  );
}

async function selectOption(user: UserEvent, label: string, option: string) {
  await user.click(screen.getByRole('combobox', { name: label }));
  await user.click(await screen.findByRole('option', { name: option }));
}

async function findTopmostDialog() {
  // rc-util 在 NODE_ENV=test 下把每个 overlay 的 useId 固定为 test-id，
  // 嵌套 Drawer + Modal 的 aria-labelledby 因而冲突；真实浏览器中的 React id 唯一。
  await waitFor(() => {
    expect(screen.getAllByRole('dialog')).toHaveLength(2);
  });
  const dialog = screen.getAllByRole('dialog').at(-1);
  if (dialog === undefined) {
    throw new Error('未找到顶层操作对话框');
  }
  return dialog;
}

beforeEach(() => {
  routes = {
    ...createAdminOrganizationMock(),
    ...createAdminWorkspacesMock(),
  };
  requestMock.mockReset();
  requestMock.mockImplementation(requestThroughMock);
});

describe('AdminWorkspacesPage', () => {
  it('呈现服务端工作区、筛选工具栏和 1050px 横向表格', async () => {
    renderPage();

    expect(
      screen.getByRole('toolbar', { name: '工作区筛选与操作' }),
    ).toBeInTheDocument();
    expect(
      await screen.findByRole('row', { name: /Platform Core/ }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole('row', { name: /Agent Runtime/ }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole('row', { name: /Delivery Governance/ }),
    ).toBeInTheDocument();

    const table = screen.getByRole('table');
    expect(table).toHaveStyle({ width: '1050px' });
    expect(within(table).getAllByRole('row')).toHaveLength(4);
  });

  it('可通过搜索与状态筛选可见工作区', async () => {
    const user = userEvent.setup();
    renderPage();
    await screen.findByRole('row', { name: /Platform Core/ });

    const search = screen.getByRole('searchbox', { name: '搜索工作区' });
    await user.type(search, 'Agent');

    await waitFor(() => {
      expect(
        screen.getByRole('row', { name: /Agent Runtime/ }),
      ).toBeInTheDocument();
      expect(
        screen.queryByRole('row', { name: /Platform Core/ }),
      ).not.toBeInTheDocument();
      expect(
        screen.queryByRole('row', { name: /Delivery Governance/ }),
      ).not.toBeInTheDocument();
    });

    await user.clear(search);
    await selectOption(user, '工作区状态', '已归档');

    await waitFor(() => {
      expect(
        screen.getByRole('row', { name: /Delivery Governance/ }),
      ).toBeInTheDocument();
      expect(
        screen.queryByRole('row', { name: /Platform Core/ }),
      ).not.toBeInTheDocument();
      expect(
        screen.queryByRole('row', { name: /Agent Runtime/ }),
      ).not.toBeInTheDocument();
    });
  });

  it('创建 Modal 通过契约保存并刷新工作区列表', async () => {
    const user = userEvent.setup();
    renderPage();

    const table = await screen.findByRole('table');
    await waitFor(() => {
      expect(within(table).getAllByRole('row')).toHaveLength(4);
    });
    await user.click(screen.getByRole('button', { name: '创建工作区' }));
    const dialog = await screen.findByRole('dialog', { name: '创建工作区' });

    await user.type(
      within(dialog).getByRole('textbox', { name: '名称' }),
      'Prototype Workspace',
    );
    await selectOption(user, 'Owner', '方舟');
    await user.type(
      within(dialog).getByRole('textbox', { name: '创建原因' }),
      '验证 Workspace 治理契约',
    );
    await user.click(within(dialog).getByRole('button', { name: /创\s*建/ }));

    expect(await screen.findByText('工作区已创建')).toBeInTheDocument();
    await waitFor(() => {
      expect(
        screen.queryByRole('dialog', { name: '创建工作区' }),
      ).not.toBeInTheDocument();
    });
    expect(
      await screen.findByRole('row', { name: /Prototype Workspace/ }),
    ).toBeInTheDocument();
    expect(screen.queryByText(/静态原型操作/)).not.toBeInTheDocument();
  });

  it('查看打开治理详情抽屉并呈现 Leader 与成员来源投影', async () => {
    const user = userEvent.setup();
    renderPage();

    await screen.findByRole('table');
    const workspaceRow = await screen.findByRole('row', {
      name: /Platform Core/,
    });
    await user.click(
      within(workspaceRow).getByRole('button', { name: '查看' }),
    );
    const drawer = await screen.findByRole('dialog', {
      name: '工作区详情：Platform Core',
    });
    expect(drawer).toHaveTextContent('Leader 名单');
    expect(drawer).toHaveTextContent('方舟');
    expect(drawer).toHaveTextContent('沈一');
    expect(drawer).toHaveTextContent('成员投影（只读）');
    expect(drawer).toHaveTextContent('Owner');
    expect(drawer).toHaveTextContent('Leader');
    expect(drawer).toHaveTextContent('直属');
    expect(
      within(drawer).queryByRole('button', { name: '编辑' }),
    ).not.toBeInTheDocument();
  });

  it('旧筛选请求晚返回时不会覆盖最新结果', async () => {
    const user = userEvent.setup();
    const initialPage = await requestThroughMock('/api/v1/admin/workspaces', {
      params: { page: 1, pageSize: 10 },
    });
    let resolveInitial: (value: unknown) => void = () => {
      throw new Error('initial workspace request was not started');
    };
    requestMock.mockImplementationOnce(
      () =>
        new Promise((resolve) => {
          resolveInitial = resolve;
        }),
    );
    renderPage();

    await user.type(
      screen.getByRole('searchbox', { name: '搜索工作区' }),
      'Agent',
    );
    expect(
      await screen.findByRole('row', { name: /Agent Runtime/ }, INITIAL_WAIT),
    ).toBeInTheDocument();
    expect(screen.getByText('共 1 个工作区')).toBeInTheDocument();

    resolveInitial(initialPage);
    await waitFor(() => {
      expect(screen.getByText('共 1 个工作区')).toBeInTheDocument();
      expect(
        screen.queryByRole('row', { name: /Platform Core/ }),
      ).not.toBeInTheDocument();
    });
  });

  it('Owner 移除入口禁用并提示先转让，转让候选仅含受邀 Leader', async () => {
    const user = userEvent.setup();
    renderPage();
    const row = await screen.findByRole(
      'row',
      { name: /Platform Core/ },
      INITIAL_WAIT,
    );
    await user.click(within(row).getByRole('button', { name: '查看' }));
    const drawer = await screen.findByRole('dialog', {
      name: '工作区详情：Platform Core',
    });

    const ownerRow = within(drawer).getByRole('listitem', { name: /方舟/ });
    expect(
      within(ownerRow).getByRole('button', { name: '移除 Leader 方舟' }),
    ).toBeDisabled();
    expect(within(ownerRow).getByTitle('请先转让 Owner')).toBeInTheDocument();

    await user.click(
      within(drawer).getByRole('button', { name: '转让 Owner' }),
    );
    await user.click(screen.getByRole('combobox', { name: '新 Owner' }));
    expect(await screen.findByRole('option', { name: '沈一' })).toBeVisible();
    expect(
      screen.queryByRole('option', { name: '赵晨' }),
    ).not.toBeInTheDocument();
    expect(
      screen.queryByRole('option', { name: '方舟' }),
    ).not.toBeInTheDocument();
  });

  it('Owner 转让后，非受邀的旧 Owner 与其直属员工移出成员投影', async () => {
    const user = userEvent.setup();
    renderPage();
    const row = await screen.findByRole(
      'row',
      { name: /Platform Core/ },
      INITIAL_WAIT,
    );
    await user.click(within(row).getByRole('button', { name: '查看' }));
    const drawer = await screen.findByRole('dialog', {
      name: '工作区详情：Platform Core',
    });

    await user.click(
      within(drawer).getByRole('button', { name: '转让 Owner' }),
    );
    const transferDialog = await findTopmostDialog();
    expect(transferDialog).toHaveTextContent('转让 Owner');
    await selectOption(user, '新 Owner', '沈一');
    await user.type(
      within(transferDialog).getByRole('textbox', { name: '操作原因' }),
      '职责交接',
    );
    await user.click(
      within(transferDialog).getByRole('button', { name: '确认转让' }),
    );

    expect(await screen.findByText('Owner 已转让')).toBeInTheDocument();
    await waitFor(() => {
      const nextOwnerRow = within(drawer).getByRole('listitem', {
        name: /沈一/,
      });
      expect(
        within(nextOwnerRow).getByRole('button', {
          name: '移除 Leader 沈一',
        }),
      ).toBeDisabled();
      expect(
        within(drawer).queryByRole('listitem', { name: /方舟/ }),
      ).not.toBeInTheDocument();
      expect(
        within(drawer).queryByRole('row', { name: /林一/ }),
      ).not.toBeInTheDocument();
    });
    expect(requestMock).toHaveBeenCalledWith(
      '/api/v1/admin/workspaces/workspace-platform-core/transfer-owner',
      {
        data: { accountId: 'leader-shen', reason: '职责交接' },
        headers: {
          'Idempotency-Key': expect.stringMatching(/^[0-9a-f-]{36}$/),
        },
        method: 'POST',
      },
    );
  });

  it('邀请与移除 Leader 均要求 reason 并刷新成员投影', async () => {
    const user = userEvent.setup();
    renderPage();
    const row = await screen.findByRole(
      'row',
      { name: /Platform Core/ },
      INITIAL_WAIT,
    );
    await user.click(within(row).getByRole('button', { name: '查看' }));
    let drawer = await screen.findByRole('dialog', {
      name: '工作区详情：Platform Core',
    });

    await user.click(
      within(drawer).getByRole('button', { name: '邀请 Leader' }),
    );
    const inviteDialog = await findTopmostDialog();
    expect(inviteDialog).toHaveTextContent('邀请 Leader');
    await selectOption(user, 'Leader', '赵晨');
    await user.click(
      within(inviteDialog).getByRole('button', { name: '确认邀请' }),
    );
    expect(
      await within(inviteDialog).findByText('请输入操作原因'),
    ).toBeVisible();
    await user.type(
      within(inviteDialog).getByRole('textbox', { name: '操作原因' }),
      '跨团队协作',
    );
    await user.click(
      within(inviteDialog).getByRole('button', { name: '确认邀请' }),
    );
    expect(await screen.findByText('Leader 已邀请')).toBeInTheDocument();
    drawer = await screen.findByRole('dialog', {
      name: '工作区详情：Platform Core',
    });
    const invitedRow = await within(drawer).findByRole('listitem', {
      name: /赵晨/,
    });

    await user.click(
      within(invitedRow).getByRole('button', { name: '移除 Leader 赵晨' }),
    );
    const removeDialog = await findTopmostDialog();
    expect(removeDialog).toHaveTextContent('移除 Leader');
    await user.type(
      within(removeDialog).getByRole('textbox', { name: '操作原因' }),
      '协作结束',
    );
    await user.click(
      within(removeDialog).getByRole('button', { name: '确认移除' }),
    );
    expect(await screen.findByText('Leader 已移除')).toBeInTheDocument();
    await waitFor(() => {
      expect(
        within(drawer).queryByRole('listitem', { name: /赵晨/ }),
      ).not.toBeInTheDocument();
    });
  });

  it('重复名称保留创建 Modal 并展示 409 Problem 原文与 requestId', async () => {
    const user = userEvent.setup();
    renderPage();
    await screen.findByRole('table');
    await user.click(screen.getByRole('button', { name: '创建工作区' }));
    const dialog = await screen.findByRole('dialog', { name: '创建工作区' });
    await user.type(
      within(dialog).getByRole('textbox', { name: '名称' }),
      'Platform Core',
    );
    await selectOption(user, 'Owner', '方舟');
    await user.type(
      within(dialog).getByRole('textbox', { name: '创建原因' }),
      '重复名称测试',
    );
    await user.click(within(dialog).getByRole('button', { name: /创\s*建/ }));

    expect(
      await screen.findByText(/工作区名称 Platform Core 已存在/),
    ).toHaveTextContent(/requestId: mock-admin-workspace-/);
    expect(dialog).toBeInTheDocument();
  });

  it('Leader 写入的 422 Problem 保留原文与 requestId', async () => {
    routes = {
      ...routes,
      'POST /api/v1/admin/workspaces/:workspaceId/leaders': (
        _request: MockRequest,
        response: MockResponse,
      ) => {
        response.status(422);
        response.setHeader('Content-Type', 'application/problem+json');
        response.json({
          detail: '该 Leader 当前不可邀请',
          requestId: 'mock-workspace-page-422',
          status: 422,
          title: 'WORKSPACE_VALIDATION_ERROR',
        });
      },
    };
    const user = userEvent.setup();
    renderPage();
    const row = await screen.findByRole(
      'row',
      { name: /Platform Core/ },
      INITIAL_WAIT,
    );
    await user.click(within(row).getByRole('button', { name: '查看' }));
    const drawer = await screen.findByRole('dialog', {
      name: '工作区详情：Platform Core',
    });
    await user.click(
      within(drawer).getByRole('button', { name: '邀请 Leader' }),
    );
    const dialog = await findTopmostDialog();
    expect(dialog).toHaveTextContent('邀请 Leader');
    await selectOption(user, 'Leader', '赵晨');
    await user.type(
      within(dialog).getByRole('textbox', { name: '操作原因' }),
      '测试服务端校验',
    );
    await user.click(within(dialog).getByRole('button', { name: '确认邀请' }));

    expect(await screen.findByText(/该 Leader 当前不可邀请/)).toHaveTextContent(
      'requestId: mock-workspace-page-422',
    );
    expect(dialog).toBeInTheDocument();
  });

  it('403 列表拒绝清空旧数据并展示 Problem 原文与 requestId', async () => {
    routes = {
      ...createAdminOrganizationMock(),
      ...createAdminWorkspacesMock({ authorize: () => false }),
    };
    renderPage();

    expect(await screen.findByText(/无 Workspace 治理权限/)).toHaveTextContent(
      /requestId: mock-admin-workspace-/,
    );
    expect(
      screen.queryByRole('row', { name: /Platform Core/ }),
    ).not.toBeInTheDocument();
    expect(screen.getByText('共 0 个工作区')).toBeInTheDocument();
  });
});
