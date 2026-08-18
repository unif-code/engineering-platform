import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent, { type UserEvent } from '@testing-library/user-event';
import { App, ConfigProvider } from 'antd';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type {
  OrganizationTreeResponse,
  WorkspaceListResponse,
  WorkspaceMembersResponse,
  WorkspaceSummary,
} from '@/features/administration';
import { ApiError } from '@/services/transport';

const administrationMocks = vi.hoisted(() => ({
  createWorkspace: vi.fn(),
  getOrganizationTree: vi.fn(),
  inviteWorkspaceLeader: vi.fn(),
  listWorkspaceMembers: vi.fn(),
  listWorkspaces: vi.fn(),
  removeWorkspaceLeader: vi.fn(),
  transferWorkspaceOwner: vi.fn(),
}));

vi.mock('@umijs/max', async () => ({
  ...(await import('@tanstack/react-query')),
}));

vi.mock('@/features/administration', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@/features/administration')>()),
  ...administrationMocks,
}));

import AdminWorkspacesPage from '.';

const INITIAL_WAIT = { timeout: 5_000 };

const leaderLi = {
  displayName: '李强',
  employeeNo: 'E1003',
  id: 'leader-li',
} as const;
const leaderWu = {
  displayName: '吴桐',
  employeeNo: 'E1002',
  id: 'leader-wu',
} as const;
const leaderLiu = {
  displayName: '刘洋',
  employeeNo: 'E2001',
  id: 'leader-liu',
} as const;
const leaderGao = {
  displayName: '高翔',
  employeeNo: 'E3003',
  id: 'leader-gao',
} as const;

const organizationTree = {
  items: [
    {
      children: [
        {
          children: [
            {
              children: [],
              displayName: '陈晓',
              employeeNo: 'E1004',
              id: 'member-chen',
              kind: 'MEMBER',
              superiorId: leaderLi.id,
            },
            {
              children: [],
              displayName: '郑楠',
              employeeNo: 'E1005',
              id: 'member-zheng',
              kind: 'MEMBER',
              superiorId: leaderLi.id,
            },
          ],
          ...leaderLi,
          kind: 'LEADER',
          superiorId: 'manager-zhao',
        },
        {
          children: [
            {
              children: [],
              displayName: '王悦',
              employeeNo: 'E1001',
              id: 'member-wang',
              kind: 'MEMBER',
              superiorId: leaderWu.id,
            },
          ],
          ...leaderWu,
          kind: 'LEADER',
          superiorId: 'manager-zhao',
        },
      ],
      displayName: '赵敏',
      employeeNo: 'E1007',
      id: 'manager-zhao',
      kind: 'MANAGER',
      superiorId: null,
    },
    {
      children: [
        {
          children: [
            {
              children: [],
              displayName: '何山',
              employeeNo: 'E2002',
              id: 'member-he',
              kind: 'MEMBER',
              superiorId: leaderLiu.id,
            },
          ],
          ...leaderLiu,
          kind: 'LEADER',
          superiorId: 'manager-qin',
        },
      ],
      displayName: '秦岚',
      employeeNo: 'E2003',
      id: 'manager-qin',
      kind: 'MANAGER',
      superiorId: null,
    },
    {
      children: [
        {
          children: [],
          ...leaderGao,
          kind: 'LEADER',
          superiorId: 'manager-luo',
        },
      ],
      displayName: '罗成',
      employeeNo: 'E3001',
      id: 'manager-luo',
      kind: 'MANAGER',
      superiorId: null,
    },
  ],
} satisfies OrganizationTreeResponse;

const activeWorkspace = {
  id: 'workspace-platform-core',
  leaders: [],
  memberCount: undefined,
  name: '营销工作区',
  owner: leaderLi,
  status: 'ACTIVE',
  version: 1,
} satisfies WorkspaceSummary;

const archivedWorkspace = {
  id: 'workspace-marketing-archive',
  leaders: [],
  memberCount: undefined,
  name: '历史活动专区',
  owner: leaderLi,
  status: 'ARCHIVED',
  version: 3,
} satisfies WorkspaceSummary;

const createdWorkspace = {
  id: 'workspace-prototype',
  leaders: [],
  memberCount: undefined,
  name: 'Prototype Workspace',
  owner: leaderLi,
  status: 'ACTIVE',
  version: 1,
} satisfies WorkspaceSummary;

const initialWorkspacePage = {
  items: [
    activeWorkspace,
    {
      id: 'workspace-agent-runtime',
      leaders: [],
      memberCount: undefined,
      name: '交易工作区',
      owner: leaderLiu,
      status: 'ACTIVE',
      version: 1,
    },
    {
      id: 'workspace-delivery-governance',
      leaders: [],
      memberCount: undefined,
      name: '中台工作区',
      owner: leaderGao,
      status: 'ACTIVE',
      version: 1,
    },
    archivedWorkspace,
  ],
  total: 4,
} satisfies WorkspaceListResponse;

const initialMarketingMembers = {
  items: [
    { accountId: leaderLi.id, ...leaderLi, source: 'OWNER' },
    { accountId: leaderWu.id, ...leaderWu, source: 'LEADER' },
    {
      accountId: 'member-chen',
      displayName: '陈晓',
      employeeNo: 'E1004',
      source: 'DIRECT_REPORT',
    },
    {
      accountId: 'member-zheng',
      displayName: '郑楠',
      employeeNo: 'E1005',
      source: 'DIRECT_REPORT',
    },
    {
      accountId: 'member-wang',
      displayName: '王悦',
      employeeNo: 'E1001',
      source: 'DIRECT_REPORT',
    },
  ],
} satisfies WorkspaceMembersResponse;

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
  for (const mock of Object.values(administrationMocks)) {
    mock.mockReset();
  }
  administrationMocks.getOrganizationTree.mockResolvedValue(organizationTree);
  administrationMocks.listWorkspaces.mockResolvedValue(initialWorkspacePage);
  administrationMocks.listWorkspaceMembers.mockResolvedValue(
    initialMarketingMembers,
  );
  administrationMocks.createWorkspace.mockResolvedValue(createdWorkspace);
  administrationMocks.inviteWorkspaceLeader.mockResolvedValue({
    ...activeWorkspace,
    version: 2,
  });
  administrationMocks.removeWorkspaceLeader.mockResolvedValue({
    ...activeWorkspace,
    version: 2,
  });
  administrationMocks.transferWorkspaceOwner.mockResolvedValue({
    ...activeWorkspace,
    owner: leaderWu,
    version: 2,
  });
});

describe('AdminWorkspacesPage', () => {
  it('按原型呈现服务端工作区与七列紧凑表格', async () => {
    renderPage();

    expect(
      screen.getByText(
        '管理员创建工作区并指定 Owner（开发Leader）；成员与仓库由 Owner 自行配置，管理端不代管',
      ),
    ).toBeInTheDocument();
    expect(
      screen.getByRole('button', { name: '创建工作区' }),
    ).toBeInTheDocument();
    expect(
      await screen.findByRole('row', { name: /营销工作区/ }),
    ).toBeInTheDocument();
    expect(screen.getByRole('row', { name: /交易工作区/ })).toBeInTheDocument();
    expect(screen.getByRole('row', { name: /中台工作区/ })).toBeInTheDocument();
    expect(
      screen.getByRole('row', { name: /历史活动专区/ }),
    ).toBeInTheDocument();

    const table = screen.getByRole('table');
    expect(table).toHaveStyle({ width: '1050px' });
    expect(
      within(table)
        .getAllByRole('columnheader')
        .map((header) => header.textContent),
    ).toEqual(['工作区', 'Owner', 'Team', '成员', '仓库', '状态', '操作']);
    expect(within(table).getAllByRole('row')).toHaveLength(5);
    expect(
      within(screen.getByRole('row', { name: /营销工作区/ })).getByRole(
        'button',
        { name: '查看配置 营销工作区' },
      ),
    ).toBeInTheDocument();
    const firstWorkspaceRow = screen.getByRole('row', { name: /营销工作区/ });
    expect(firstWorkspaceRow).toHaveTextContent('李强');
    expect(firstWorkspaceRow).toHaveTextContent('营销');
    expect(within(firstWorkspaceRow).getAllByRole('cell')[3]).toHaveTextContent(
      '—',
    );
    expect(firstWorkspaceRow).toHaveTextContent('10 个');
    expect(
      screen.getByText(
        '每个工作区恰有一个 Owner；正式成员为动态投影（Owner + 受邀 Leader 直属有效员工）',
      ),
    ).toBeInTheDocument();
    expect(
      screen.queryByText('管理工作区 Owner、Leader 与只读成员投影'),
    ).not.toBeInTheDocument();
  });

  it('ACTIVE 与 ARCHIVED 工作区都只展示查看配置', async () => {
    renderPage();
    const active = await screen.findByRole('row', { name: /营销工作区/ });
    const archived = screen.getByRole('row', { name: /历史活动专区/ });

    expect(screen.queryByRole('searchbox')).not.toBeInTheDocument();
    expect(screen.queryByRole('combobox')).not.toBeInTheDocument();
    expect(screen.queryByText(/共 \d+ 个工作区/)).not.toBeInTheDocument();
    expect(
      within(active).getByRole('button', {
        name: '查看配置 营销工作区',
      }),
    ).toBeInTheDocument();
    expect(
      within(archived).getByRole('button', {
        name: '查看配置 历史活动专区',
      }),
    ).toBeInTheDocument();
    expect(
      within(active).queryByRole('button', { name: /归档|恢复/ }),
    ).toBeNull();
    expect(
      within(archived).queryByRole('button', { name: /归档|恢复/ }),
    ).toBeNull();
  });

  it('创建 Modal 通过契约保存并刷新工作区列表', async () => {
    const user = userEvent.setup();
    administrationMocks.listWorkspaces
      .mockResolvedValueOnce(initialWorkspacePage)
      .mockResolvedValue({
        items: [...initialWorkspacePage.items, createdWorkspace],
        total: 5,
      } satisfies WorkspaceListResponse);
    renderPage();

    const table = await screen.findByRole('table');
    await waitFor(() => {
      expect(within(table).getAllByRole('row')).toHaveLength(5);
    });
    await user.click(screen.getByRole('button', { name: '创建工作区' }));
    const dialog = await screen.findByRole('dialog', { name: '创建工作区' });

    await user.type(
      within(dialog).getByRole('textbox', { name: '工作区名称' }),
      'Prototype Workspace',
    );
    await selectOption(user, '所属 Team', '平台');
    await selectOption(user, 'Owner（开发Leader）', '李强 · 营销');
    await user.click(within(dialog).getByRole('button', { name: /创\s*建/ }));

    expect(administrationMocks.createWorkspace).toHaveBeenCalledWith(
      {
        name: 'Prototype Workspace',
        ownerId: leaderLi.id,
        reason: '通过工作区管理创建工作区',
      },
      expect.any(Object),
    );
    expect(await screen.findByText('工作区已创建')).toBeInTheDocument();
    await waitFor(() => {
      expect(
        screen.queryByRole('dialog', { name: '创建工作区' }),
      ).not.toBeInTheDocument();
    });
    const createdRow = await screen.findByRole('row', {
      name: /Prototype Workspace/,
    });
    expect(createdRow).toHaveTextContent('平台');
    expect(createdRow).toHaveTextContent('0');
    expect(screen.queryByText(/静态原型操作/)).not.toBeInTheDocument();
  });

  it('查看打开治理详情抽屉并呈现 Leader 与成员来源投影', async () => {
    const user = userEvent.setup();
    renderPage();

    await screen.findByRole('table');
    const workspaceRow = await screen.findByRole('row', {
      name: /营销工作区/,
    });
    await user.click(
      within(workspaceRow).getByRole('button', {
        name: '查看配置 营销工作区',
      }),
    );
    const drawer = await screen.findByRole('dialog', {
      name: '工作区详情：营销工作区',
    });
    expect(drawer).toHaveTextContent('Leader 名单');
    expect(drawer).toHaveTextContent('李强');
    expect(drawer).toHaveTextContent('吴桐');
    expect(drawer).toHaveTextContent('成员投影（只读）');
    expect(drawer).toHaveTextContent('Owner');
    expect(drawer).toHaveTextContent('Leader');
    expect(drawer).toHaveTextContent('直属');
    expect(
      within(drawer).queryByRole('button', { name: '编辑' }),
    ).not.toBeInTheDocument();
  });

  it('列表请求延迟返回时仍只渲染服务端结果', async () => {
    let resolveInitial: (value: WorkspaceListResponse) => void = () => {
      throw new Error('initial workspace request was not started');
    };
    const pendingPage = new Promise<WorkspaceListResponse>((resolve) => {
      resolveInitial = resolve;
    });
    administrationMocks.listWorkspaces.mockReturnValue(pendingPage);
    renderPage();

    expect(
      screen.queryByRole('row', { name: /营销工作区/ }),
    ).not.toBeInTheDocument();

    await waitFor(() => {
      expect(administrationMocks.listWorkspaces).toHaveBeenCalled();
    });
    resolveInitial(initialWorkspacePage);
    expect(
      await screen.findByRole('row', { name: /营销工作区/ }, INITIAL_WAIT),
    ).toBeInTheDocument();
    expect(screen.getByRole('row', { name: /交易工作区/ })).toBeInTheDocument();
  });

  it('Owner 移除入口禁用并提示先转让，转让候选仅含受邀 Leader', async () => {
    const user = userEvent.setup();
    renderPage();
    const row = await screen.findByRole(
      'row',
      { name: /营销工作区/ },
      INITIAL_WAIT,
    );
    await user.click(
      within(row).getByRole('button', { name: '查看配置 营销工作区' }),
    );
    const drawer = await screen.findByRole('dialog', {
      name: '工作区详情：营销工作区',
    });

    const ownerRow = within(drawer).getByRole('listitem', { name: /李强/ });
    expect(
      within(ownerRow).getByRole('button', { name: '移除 Leader 李强' }),
    ).toBeDisabled();
    expect(within(ownerRow).getByTitle('请先转让 Owner')).toBeInTheDocument();

    await user.click(
      within(drawer).getByRole('button', { name: '转让 Owner' }),
    );
    await user.click(screen.getByRole('combobox', { name: '新 Owner' }));
    expect(await screen.findByRole('option', { name: '吴桐' })).toBeVisible();
    expect(
      screen.queryByRole('option', { name: '刘洋' }),
    ).not.toBeInTheDocument();
    expect(
      screen.queryByRole('option', { name: '李强' }),
    ).not.toBeInTheDocument();
  });

  it('Owner 转让后，非受邀的旧 Owner 与其直属员工移出成员投影', async () => {
    const user = userEvent.setup();
    administrationMocks.listWorkspaceMembers
      .mockResolvedValueOnce(initialMarketingMembers)
      .mockResolvedValue({
        items: [
          { accountId: leaderWu.id, ...leaderWu, source: 'OWNER' },
          {
            accountId: 'member-wang',
            displayName: '王悦',
            employeeNo: 'E1001',
            source: 'DIRECT_REPORT',
          },
        ],
      } satisfies WorkspaceMembersResponse);
    renderPage();
    const row = await screen.findByRole(
      'row',
      { name: /营销工作区/ },
      INITIAL_WAIT,
    );
    await user.click(
      within(row).getByRole('button', { name: '查看配置 营销工作区' }),
    );
    const drawer = await screen.findByRole('dialog', {
      name: '工作区详情：营销工作区',
    });

    await user.click(
      within(drawer).getByRole('button', { name: '转让 Owner' }),
    );
    const transferDialog = await findTopmostDialog();
    expect(transferDialog).toHaveTextContent('转让 Owner');
    await selectOption(user, '新 Owner', '吴桐');
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
        name: /吴桐/,
      });
      expect(
        within(nextOwnerRow).getByRole('button', {
          name: '移除 Leader 吴桐',
        }),
      ).toBeDisabled();
      expect(
        within(drawer).queryByRole('listitem', { name: /李强/ }),
      ).not.toBeInTheDocument();
      expect(
        within(drawer).queryByRole('row', { name: /陈晓/ }),
      ).not.toBeInTheDocument();
    });
    expect(administrationMocks.transferWorkspaceOwner).toHaveBeenCalledWith(
      activeWorkspace.id,
      { accountId: leaderWu.id, reason: '职责交接' },
      activeWorkspace.version,
    );
  });

  it('邀请与移除 Leader 均要求 reason 并刷新成员投影', async () => {
    const user = userEvent.setup();
    const membersWithLiu = {
      items: [
        ...initialMarketingMembers.items,
        { accountId: leaderLiu.id, ...leaderLiu, source: 'LEADER' },
        {
          accountId: 'member-he',
          displayName: '何山',
          employeeNo: 'E2002',
          source: 'DIRECT_REPORT',
        },
      ],
    } satisfies WorkspaceMembersResponse;
    administrationMocks.listWorkspaceMembers
      .mockResolvedValueOnce(initialMarketingMembers)
      .mockResolvedValueOnce(membersWithLiu)
      .mockResolvedValue(initialMarketingMembers);
    administrationMocks.removeWorkspaceLeader.mockResolvedValue({
      ...activeWorkspace,
      version: 3,
    });
    renderPage();
    const row = await screen.findByRole(
      'row',
      { name: /营销工作区/ },
      INITIAL_WAIT,
    );
    await user.click(
      within(row).getByRole('button', { name: '查看配置 营销工作区' }),
    );
    let drawer = await screen.findByRole('dialog', {
      name: '工作区详情：营销工作区',
    });

    await user.click(
      within(drawer).getByRole('button', { name: '邀请 Leader' }),
    );
    const inviteDialog = await findTopmostDialog();
    expect(inviteDialog).toHaveTextContent('邀请 Leader');
    await selectOption(user, 'Leader', '刘洋');
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
    expect(administrationMocks.inviteWorkspaceLeader).toHaveBeenCalledWith(
      activeWorkspace.id,
      {
        accountId: leaderLiu.id,
        reason: '跨团队协作',
      },
      activeWorkspace.version,
    );
    drawer = await screen.findByRole('dialog', {
      name: '工作区详情：营销工作区',
    });
    const invitedRow = await within(drawer).findByRole('listitem', {
      name: /刘洋/,
    });

    await user.click(
      within(invitedRow).getByRole('button', { name: '移除 Leader 刘洋' }),
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
    expect(administrationMocks.removeWorkspaceLeader).toHaveBeenCalledWith(
      activeWorkspace.id,
      leaderLiu.id,
      { reason: '协作结束' },
      2,
    );
    await waitFor(() => {
      expect(
        within(drawer).queryByRole('listitem', { name: /刘洋/ }),
      ).not.toBeInTheDocument();
    });
  });

  it('重复名称保留创建 Modal 并展示 409 Problem 原文与 requestId', async () => {
    const user = userEvent.setup();
    administrationMocks.createWorkspace.mockRejectedValueOnce(
      new ApiError({
        detail: '工作区名称 营销工作区 已存在',
        requestId: 'req-workspace-create-409',
        status: 409,
      }),
    );
    renderPage();
    await screen.findByRole('table');
    await user.click(screen.getByRole('button', { name: '创建工作区' }));
    const dialog = await screen.findByRole('dialog', { name: '创建工作区' });
    await user.type(
      within(dialog).getByRole('textbox', { name: '工作区名称' }),
      '营销工作区',
    );
    await selectOption(user, '所属 Team', '营销');
    await selectOption(user, 'Owner（开发Leader）', '李强 · 营销');
    await user.click(within(dialog).getByRole('button', { name: /创\s*建/ }));

    expect(
      await screen.findByText(/工作区名称 营销工作区 已存在/),
    ).toHaveTextContent('requestId: req-workspace-create-409');
    expect(dialog).toBeInTheDocument();
  });

  it('Leader 写入的 422 Problem 保留原文与 requestId', async () => {
    administrationMocks.inviteWorkspaceLeader.mockRejectedValueOnce(
      new ApiError({
        detail: '该 Leader 当前不可邀请',
        requestId: 'req-workspace-invite-422',
        status: 422,
      }),
    );
    const user = userEvent.setup();
    renderPage();
    const row = await screen.findByRole(
      'row',
      { name: /营销工作区/ },
      INITIAL_WAIT,
    );
    await user.click(
      within(row).getByRole('button', { name: '查看配置 营销工作区' }),
    );
    const drawer = await screen.findByRole('dialog', {
      name: '工作区详情：营销工作区',
    });
    await user.click(
      within(drawer).getByRole('button', { name: '邀请 Leader' }),
    );
    const dialog = await findTopmostDialog();
    expect(dialog).toHaveTextContent('邀请 Leader');
    await selectOption(user, 'Leader', '刘洋');
    await user.type(
      within(dialog).getByRole('textbox', { name: '操作原因' }),
      '测试服务端校验',
    );
    await user.click(within(dialog).getByRole('button', { name: '确认邀请' }));

    expect(await screen.findByText(/该 Leader 当前不可邀请/)).toHaveTextContent(
      'requestId: req-workspace-invite-422',
    );
    expect(dialog).toBeInTheDocument();
  });

  it('403 列表拒绝清空旧数据并展示 Problem 原文与 requestId', async () => {
    administrationMocks.listWorkspaces.mockRejectedValueOnce(
      new ApiError({
        detail: '无 Workspace 治理权限',
        requestId: 'req-workspace-list-403',
        status: 403,
      }),
    );
    renderPage();

    expect(await screen.findByText(/无 Workspace 治理权限/)).toHaveTextContent(
      'requestId: req-workspace-list-403',
    );
    expect(
      screen.queryByRole('row', { name: /营销工作区/ }),
    ).not.toBeInTheDocument();
    expect(screen.queryByText(/共 \d+ 个工作区/)).not.toBeInTheDocument();
  });
});
