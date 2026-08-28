import { createProblemError } from '@root/tests/fixtures/problemError';
import { act, render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { App, ConfigProvider } from 'antd';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { RequirementListPage, RequirementSummary } from './type';

const requirementMocks = vi.hoisted(() => ({
  listRequirements: vi.fn(),
}));

const pageMocks = vi.hoisted(() => ({
  back: vi.fn(),
  historyStack: [] as Array<{
    pathname: string;
    search: string;
    state: unknown;
  }>,
  initialState: {
    capabilities: [] as string[],
    navigation: [],
    principal: null as null | {
      accountId: string | null;
      employeeId: string;
      name: string;
    },
    scopedCapabilities: [] as Array<{
      capability: string;
      scopeId: string | null;
      scopeType: 'PLATFORM' | 'WORKSPACE';
    }>,
    workspaces: [] as Array<{ id: string; name: string; ownerId: string }>,
  },
  locationPathname: '/requirements',
  locationSearch: '',
  locationState: null as unknown,
  push: vi.fn(),
  replace: vi.fn(),
}));

vi.mock('@umijs/max', async () => ({
  ...(await import('@tanstack/react-query')),
  history: {
    back: () => {
      pageMocks.back();
      const previous = pageMocks.historyStack.pop();
      if (previous) {
        pageMocks.locationPathname = previous.pathname;
        pageMocks.locationSearch = previous.search;
        pageMocks.locationState = previous.state;
      }
    },
    push: (path: string, state?: unknown) => {
      state === undefined ? pageMocks.push(path) : pageMocks.push(path, state);
      if (path === '/requirements' || path.startsWith('/requirements?')) {
        pageMocks.historyStack.push({
          pathname: pageMocks.locationPathname,
          search: pageMocks.locationSearch,
          state: pageMocks.locationState,
        });
        const queryIndex = path.indexOf('?');
        pageMocks.locationPathname =
          queryIndex === -1 ? path : path.slice(0, queryIndex);
        pageMocks.locationSearch =
          queryIndex === -1 ? '' : path.slice(queryIndex);
        pageMocks.locationState = state ?? null;
      }
    },
    replace: (path: string, state?: unknown) => {
      pageMocks.replace(path, state);
      const queryIndex = path.indexOf('?');
      pageMocks.locationPathname =
        queryIndex === -1 ? path : path.slice(0, queryIndex);
      pageMocks.locationSearch =
        queryIndex === -1 ? '' : path.slice(queryIndex);
      pageMocks.locationState = state ?? null;
    },
  },
  useLocation: () => ({
    pathname: pageMocks.locationPathname,
    search: pageMocks.locationSearch,
    state: pageMocks.locationState,
  }),
  useModel: () => ({ initialState: pageMocks.initialState }),
}));

vi.mock('./service', () => ({
  listRequirements: requirementMocks.listRequirements,
}));

vi.mock('./CreateRequirementModal', () => ({
  CreateRequirementModal: ({
    initialWorkspaceId,
    onCancel,
    onCreated,
    sessionKey,
    workspaces: createWorkspaces,
  }: {
    initialWorkspaceId?: string;
    onCancel: () => void;
    onCreated: (result: { requirement: { id: string } }) => Promise<void>;
    sessionKey: string;
    workspaces: Array<{ id: string; name: string }>;
  }) => (
    <section aria-label="创建需求对话框">
      <output aria-label="创建工作区">
        {createWorkspaces.map((workspace) => workspace.name).join(',')}
      </output>
      <output aria-label="默认创建工作区">{initialWorkspaceId}</output>
      <output aria-label="创建 Session">{sessionKey}</output>
      <button
        onClick={() =>
          void onCreated({ requirement: { id: 'REQ-CREATED-0001' } })
        }
        type="button"
      >
        完成模拟创建
      </button>
      <button onClick={onCancel} type="button">
        取消模拟创建
      </button>
    </section>
  ),
}));

import { RequirementsPage } from './RequirementsPage';

const workspaceOneId = '10000000-0000-0000-0000-000000000001';
const workspacePlatformOnlyId = '10000000-0000-0000-0000-000000000002';
const workspaceCreateOnlyId = '10000000-0000-0000-0000-000000000003';
const workspaceTwoId = '10000000-0000-0000-0000-000000000004';

const workspaces = [
  { id: workspaceOneId, name: '平台研发', ownerId: 'account-owner-1' },
  {
    id: workspacePlatformOnlyId,
    name: '平台级误配',
    ownerId: 'account-owner-2',
  },
  {
    id: workspaceCreateOnlyId,
    name: '仅可创建',
    ownerId: 'account-owner-3',
  },
  { id: workspaceTwoId, name: '交付研发', ownerId: 'account-owner-4' },
];

function readableInitialState() {
  return {
    capabilities: ['requirement.create', 'requirement.read'],
    navigation: [],
    principal: {
      accountId: 'account-1',
      employeeId: '00000001',
      name: '平台用户',
    },
    scopedCapabilities: [
      {
        capability: 'requirement.read',
        scopeId: workspaceOneId,
        scopeType: 'WORKSPACE' as const,
      },
      {
        capability: 'requirement.read',
        scopeId: null,
        scopeType: 'PLATFORM' as const,
      },
      {
        capability: 'requirement.create',
        scopeId: workspaceCreateOnlyId,
        scopeType: 'WORKSPACE' as const,
      },
      {
        capability: 'requirement.read',
        scopeId: workspaceTwoId,
        scopeType: 'WORKSPACE' as const,
      },
    ],
    workspaces: [...workspaces],
  };
}

function requirement(
  id: string,
  workspaceId: string,
  overrides: Partial<RequirementSummary> = {},
): RequirementSummary {
  return {
    id,
    state: 'CREATED',
    title: `需求 ${id}`,
    type: 'feat',
    updatedAt: '2026-08-28T08:01:00Z',
    workspaceId,
    ...overrides,
  };
}

function page(
  items: RequirementSummary[],
  nextCursor: string | null = null,
): RequirementListPage {
  return { items, nextCursor };
}

function renderPage() {
  return render(
    <ConfigProvider theme={{ token: { motion: false } }}>
      <App>
        <RequirementsPage />
      </App>
    </ConfigProvider>,
  );
}

async function selectWorkspace(name: string) {
  const user = userEvent.setup();
  await user.click(screen.getByRole('combobox', { name: '工作区' }));
  await user.click(await screen.findByRole('option', { name }));
}

beforeEach(() => {
  requirementMocks.listRequirements.mockReset();
  pageMocks.back.mockReset();
  pageMocks.push.mockReset();
  pageMocks.replace.mockReset();
  pageMocks.historyStack = [];
  pageMocks.locationPathname = '/requirements';
  pageMocks.locationSearch = '';
  pageMocks.locationState = null;
  pageMocks.initialState = readableInitialState();
});

describe('RequirementsPage', () => {
  it('只投影具有精确 Workspace requirement.read 的工作区和真实列表字段', async () => {
    const row = {
      ...requirement('REQ-2026-0001', workspaceOneId, {
        title: '建立确定性任务分支',
      }),
      baseCommitSha: 'f'.repeat(40),
      taskBranch: 'task/should-not-escape',
    };
    requirementMocks.listRequirements.mockResolvedValue(page([row]));
    const user = userEvent.setup();

    renderPage();

    const tableRow = await screen.findByRole('row', {
      name: /REQ-2026-0001/,
    });
    expect(requirementMocks.listRequirements).toHaveBeenCalledWith({
      limit: 20,
      workspaceId: workspaceOneId,
    });
    expect(pageMocks.replace).toHaveBeenCalledWith(
      `/requirements?workspaceId=${workspaceOneId}`,
      expect.any(Object),
    );
    await user.click(screen.getByRole('combobox', { name: '工作区' }));
    expect(
      await screen.findByRole('option', { name: '平台研发' }),
    ).toBeVisible();
    expect(screen.getByRole('option', { name: '交付研发' })).toBeVisible();
    expect(
      screen.queryByRole('option', { name: '平台级误配' }),
    ).not.toBeInTheDocument();
    expect(
      screen.queryByRole('option', { name: '仅可创建' }),
    ).not.toBeInTheDocument();

    expect(
      within(screen.getByRole('table'))
        .getAllByRole('columnheader')
        .map((header) => header.textContent),
    ).toEqual(['需求 ID', '标题', '类型', '状态', '更新时间']);
    expect(tableRow).toHaveTextContent('建立确定性任务分支');
    expect(tableRow).toHaveTextContent('功能');
    expect(tableRow).toHaveTextContent('已创建');
    expect(tableRow.querySelector('time')).toHaveAttribute(
      'datetime',
      '2026-08-28T08:01:00Z',
    );
    expect(screen.queryByText('task/should-not-escape')).toBeNull();
    expect(screen.queryByText('f'.repeat(40))).toBeNull();
    expect(screen.queryByText(/Branch Binding/)).toBeNull();

    await user.click(
      within(tableRow).getByRole('button', {
        name: '查看需求 REQ-2026-0001',
      }),
    );
    expect(pageMocks.push).toHaveBeenCalledWith('/requirements/REQ-2026-0001');
  });

  it('没有可读 Workspace 时展示真实空态且不发列表请求', () => {
    pageMocks.initialState = {
      ...readableInitialState(),
      scopedCapabilities: [],
    };

    renderPage();

    expect(screen.getByText('当前账号没有可读取的工作区')).toBeVisible();
    expect(screen.queryByRole('table')).not.toBeInTheDocument();
    expect(requirementMocks.listRequirements).not.toHaveBeenCalled();
  });

  it('初始状态或 scoped capability 集合缺失时保持安全空态', () => {
    pageMocks.initialState = undefined as never;
    const firstView = renderPage();
    expect(screen.getByText('当前账号没有可读取的工作区')).toBeVisible();
    firstView.unmount();

    pageMocks.initialState = {
      ...readableInitialState(),
      scopedCapabilities: undefined as never,
    };
    renderPage();
    expect(screen.getByText('当前账号没有可读取的工作区')).toBeVisible();
    expect(requirementMocks.listRequirements).not.toHaveBeenCalled();
  });

  it('创建入口只投影具有精确 Workspace requirement.create 的工作区', async () => {
    requirementMocks.listRequirements.mockResolvedValue(page([]));
    const user = userEvent.setup();
    renderPage();
    await waitFor(() => {
      expect(requirementMocks.listRequirements).toHaveBeenCalled();
    });

    await user.click(screen.getByRole('button', { name: '创建需求' }));

    const dialog = screen.getByRole('region', { name: '创建需求对话框' });
    expect(
      within(dialog).getByRole('status', { name: '创建工作区' }),
    ).toHaveTextContent('仅可创建');
    expect(
      within(dialog).getByRole('status', { name: '默认创建工作区' }),
    ).toHaveTextContent(workspaceCreateOnlyId);
    expect(
      within(dialog).getByRole('status', { name: '创建 Session' }),
    ).toHaveTextContent('account-1');
    expect(dialog).not.toHaveTextContent('平台研发');
    expect(dialog).not.toHaveTextContent('平台级误配');
  });

  it('accountId 缺失时使用 employeeId，并把当前可创建 Workspace 作为默认值', async () => {
    const initialState = readableInitialState();
    initialState.scopedCapabilities.push({
      capability: 'requirement.create',
      scopeId: workspaceOneId,
      scopeType: 'WORKSPACE',
    });
    pageMocks.initialState = {
      ...initialState,
      principal: { ...initialState.principal, accountId: null },
    };
    requirementMocks.listRequirements.mockResolvedValue(page([]));
    const user = userEvent.setup();
    renderPage();
    await waitFor(() => {
      expect(requirementMocks.listRequirements).toHaveBeenCalled();
    });

    await user.click(screen.getByRole('button', { name: '创建需求' }));

    const dialog = screen.getByRole('region', { name: '创建需求对话框' });
    expect(
      within(dialog).getByRole('status', { name: '默认创建工作区' }),
    ).toHaveTextContent(workspaceOneId);
    expect(
      within(dialog).getByRole('status', { name: '创建 Session' }),
    ).toHaveTextContent('00000001');

    await user.click(screen.getByRole('button', { name: '取消模拟创建' }));
    expect(
      screen.queryByRole('region', { name: '创建需求对话框' }),
    ).not.toBeInTheDocument();
  });

  it('没有精确 Workspace requirement.create 时不显示创建入口', async () => {
    pageMocks.initialState = {
      ...readableInitialState(),
      scopedCapabilities: readableInitialState().scopedCapabilities.filter(
        (capability) => capability.capability !== 'requirement.create',
      ),
    };
    requirementMocks.listRequirements.mockResolvedValue(page([]));

    renderPage();
    await waitFor(() => {
      expect(requirementMocks.listRequirements).toHaveBeenCalled();
    });

    expect(
      screen.queryByRole('button', { name: '创建需求' }),
    ).not.toBeInTheDocument();
  });

  it('创建成功关闭表单、刷新列表并导航到新 Requirement', async () => {
    requirementMocks.listRequirements.mockResolvedValue(page([]));
    const user = userEvent.setup();
    renderPage();
    await waitFor(() => {
      expect(requirementMocks.listRequirements).toHaveBeenCalledTimes(1);
    });
    await user.click(screen.getByRole('button', { name: '创建需求' }));

    await user.click(screen.getByRole('button', { name: '完成模拟创建' }));

    await waitFor(() => {
      expect(requirementMocks.listRequirements).toHaveBeenCalledTimes(2);
      expect(pageMocks.push).toHaveBeenCalledWith(
        '/requirements/REQ-CREATED-0001',
      );
    });
    expect(
      screen.queryByRole('region', { name: '创建需求对话框' }),
    ).not.toBeInTheDocument();
  });

  it('只用服务端 cursor 顺序前进和返回，不显示伪造总数', async () => {
    requirementMocks.listRequirements
      .mockResolvedValueOnce(
        page([requirement('REQ-PAGE-1', workspaceOneId)], 'cursor-page-2'),
      )
      .mockResolvedValueOnce(
        page([requirement('REQ-PAGE-2', workspaceOneId)], 'cursor-page-3'),
      )
      .mockResolvedValueOnce(page([requirement('REQ-PAGE-3', workspaceOneId)]))
      .mockResolvedValueOnce(
        page([requirement('REQ-PAGE-2', workspaceOneId)], 'cursor-page-3'),
      );
    const user = userEvent.setup();
    renderPage();

    expect(
      await screen.findByRole('row', { name: /REQ-PAGE-1/ }),
    ).toBeVisible();
    expect(screen.queryByText(/共\s*\d+/)).not.toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: '下一页' }));

    expect(
      await screen.findByRole('row', { name: /REQ-PAGE-2/ }),
    ).toBeVisible();
    expect(pageMocks.push).toHaveBeenCalledWith(
      `/requirements?workspaceId=${workspaceOneId}&cursor=cursor-page-2&page=2`,
      expect.any(Object),
    );
    expect(requirementMocks.listRequirements).toHaveBeenNthCalledWith(2, {
      cursor: 'cursor-page-2',
      limit: 20,
      workspaceId: workspaceOneId,
    });
    expect(screen.getByText('第 2 页')).toBeVisible();

    await user.click(screen.getByRole('button', { name: '下一页' }));
    expect(
      await screen.findByRole('row', { name: /REQ-PAGE-3/ }),
    ).toBeVisible();
    expect(requirementMocks.listRequirements).toHaveBeenNthCalledWith(3, {
      cursor: 'cursor-page-3',
      limit: 20,
      workspaceId: workspaceOneId,
    });
    expect(screen.getByText('第 3 页')).toBeVisible();
    expect(screen.getByRole('button', { name: '下一页' })).toBeDisabled();

    await user.click(screen.getByRole('button', { name: '上一页' }));
    expect(pageMocks.back).toHaveBeenCalledOnce();
    expect(
      await screen.findByRole('row', { name: /REQ-PAGE-2/ }),
    ).toBeVisible();
    expect(requirementMocks.listRequirements).toHaveBeenNthCalledWith(4, {
      cursor: 'cursor-page-2',
      limit: 20,
      workspaceId: workspaceOneId,
    });
    expect(screen.getByText('第 2 页')).toBeVisible();
  });

  it('切换 Workspace 会重置页码、cursor 和旧数据并忽略过期完成', async () => {
    let resolveStalePage: ((value: RequirementListPage) => void) | undefined;
    const stalePage = new Promise<RequirementListPage>((resolve) => {
      resolveStalePage = resolve;
    });
    requirementMocks.listRequirements
      .mockResolvedValueOnce(
        page(
          [requirement('REQ-WORKSPACE-1-PAGE-1', workspaceOneId)],
          'cursor-workspace-1-page-2',
        ),
      )
      .mockReturnValueOnce(stalePage)
      .mockResolvedValueOnce(
        page([requirement('REQ-WORKSPACE-2-PAGE-1', workspaceTwoId)]),
      );
    const user = userEvent.setup();
    renderPage();

    expect(
      await screen.findByRole('row', {
        name: /REQ-WORKSPACE-1-PAGE-1/,
      }),
    ).toBeVisible();
    await user.click(screen.getByRole('button', { name: '下一页' }));
    await waitFor(() => {
      expect(requirementMocks.listRequirements).toHaveBeenCalledTimes(2);
    });

    await selectWorkspace('交付研发');

    await waitFor(() => {
      expect(requirementMocks.listRequirements).toHaveBeenCalledTimes(3);
    });
    expect(
      await screen.findByRole('row', {
        name: /REQ-WORKSPACE-2-PAGE-1/,
      }),
    ).toBeVisible();
    expect(screen.getByText('第 1 页')).toBeVisible();
    expect(requirementMocks.listRequirements).toHaveBeenNthCalledWith(3, {
      limit: 20,
      workspaceId: workspaceTwoId,
    });
    expect(pageMocks.push).toHaveBeenLastCalledWith(
      `/requirements?workspaceId=${workspaceTwoId}`,
      expect.any(Object),
    );

    await act(async () => {
      if (resolveStalePage === undefined) {
        throw new Error('stale Requirement request was not started');
      }
      resolveStalePage(page([requirement('REQ-STALE-PAGE-2', workspaceOneId)]));
      await stalePage;
    });

    expect(
      screen.getByRole('row', { name: /REQ-WORKSPACE-2-PAGE-1/ }),
    ).toBeVisible();
    expect(screen.queryByText('REQ-STALE-PAGE-2')).not.toBeInTheDocument();
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
  });

  it('列表 Problem 清空数据、保留 requestId 并可显式重试', async () => {
    requirementMocks.listRequirements
      .mockRejectedValueOnce(
        createProblemError({
          detail: '需求列表暂时不可用',
          requestId: 'req-requirements-list-503',
          status: 503,
        }),
      )
      .mockResolvedValueOnce(
        page([requirement('REQ-RETRY-SUCCESS', workspaceOneId)]),
      );
    const user = userEvent.setup();
    renderPage();

    expect(await screen.findByRole('alert')).toHaveTextContent(
      '需求列表暂时不可用（requestId: req-requirements-list-503）',
    );
    expect(screen.getByText('暂无真实需求')).toBeVisible();
    expect(screen.queryByText(/共\s*\d+/)).not.toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: '重试加载需求列表' }));

    expect(
      await screen.findByRole('row', { name: /REQ-RETRY-SUCCESS/ }),
    ).toBeVisible();
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
    expect(requirementMocks.listRequirements).toHaveBeenCalledTimes(2);
  });

  it('从可分享 URL 恢复 Workspace、opaque cursor 与页码且不伪造上一页', async () => {
    pageMocks.locationSearch = `?workspaceId=${workspaceTwoId}&cursor=shared-opaque-cursor&page=4`;
    requirementMocks.listRequirements.mockResolvedValue(
      page([requirement('REQ-SHARED-PAGE', workspaceTwoId)]),
    );

    renderPage();

    expect(
      await screen.findByRole('row', { name: /REQ-SHARED-PAGE/ }),
    ).toBeVisible();
    expect(requirementMocks.listRequirements).toHaveBeenCalledWith({
      cursor: 'shared-opaque-cursor',
      limit: 20,
      workspaceId: workspaceTwoId,
    });
    expect(screen.getByText('第 4 页')).toBeVisible();
    expect(screen.getByRole('button', { name: '上一页' })).toBeDisabled();
    expect(pageMocks.replace).not.toHaveBeenCalled();
  });

  it('组件存活期间接收外部 URL 变化并切换到对应列表事实', async () => {
    requirementMocks.listRequirements
      .mockResolvedValueOnce(page([requirement('REQ-INITIAL', workspaceOneId)]))
      .mockResolvedValueOnce(
        page([requirement('REQ-EXTERNAL', workspaceTwoId)]),
      );
    const view = renderPage();
    expect(
      await screen.findByRole('row', { name: /REQ-INITIAL/ }),
    ).toBeVisible();

    pageMocks.locationSearch = `?workspaceId=${workspaceTwoId}&cursor=external-cursor&page=3`;
    view.rerender(
      <ConfigProvider theme={{ token: { motion: false } }}>
        <App>
          <RequirementsPage />
        </App>
      </ConfigProvider>,
    );

    expect(
      await screen.findByRole('row', { name: /REQ-EXTERNAL/ }),
    ).toBeVisible();
    expect(requirementMocks.listRequirements).toHaveBeenLastCalledWith({
      cursor: 'external-cursor',
      limit: 20,
      workspaceId: workspaceTwoId,
    });
    expect(screen.getByText('第 3 页')).toBeVisible();
  });
});
