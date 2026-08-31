import { createProblemError } from '@root/tests/fixtures/problemError';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { App, ConfigProvider } from 'antd';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { Requirement, WorkItem } from './type';

const serviceMocks = vi.hoisted(() => ({
  addWorkItem: vi.fn(),
  assignWorkItem: vi.fn(),
  listAuthorizedRepositories: vi.fn(),
}));

vi.mock('@umijs/max', async () => ({
  ...(await import('@tanstack/react-query')),
}));

vi.mock('./service', () => serviceMocks);

import { WorkItemPlanningPanel } from './WorkItemPlanningPanel';

const requirement: Requirement = {
  acceptanceCriteria: ['完成闭环'],
  createdAt: '2026-08-31T08:00:00Z',
  createdBy: 'account-creator',
  currentSddBaselineId: null,
  description: 'V0.4 Requirement',
  id: 'requirement-1',
  initialRepositoryId: 'repository-1',
  recordState: 'ACTIVE',
  requiredWorkItemSetHash: 'work-item-set-hash',
  requiredWorkItemSetVersion: 1,
  requirementVersion: 1,
  revision: 7,
  routeSnapshot: { requirementType: 'feat', version: 2 },
  routeSnapshotHash: 'route-hash',
  routeSnapshotVersion: 2,
  state: 'PREPARING',
  title: 'V0.4 flow',
  type: 'feat',
  updatedAt: '2026-08-31T08:01:00Z',
  workspaceId: 'workspace-1',
};

const workItem: WorkItem = {
  assignmentState: 'UNASSIGNED',
  baseCommitSha: null,
  createdAt: '2026-08-31T08:00:00Z',
  createdBy: 'account-creator',
  executorId: null,
  executorType: 'HUMAN',
  humanOwnerId: null,
  id: 'work-item-1',
  repositoryBlockedAt: null,
  repositoryBlockedReasonCode: null,
  repositoryId: 'repository-1',
  repositoryState: 'WAITING_REPOSITORY',
  requiredCapabilities: ['code.change'],
  requirementId: requirement.id,
  revision: 3,
  state: 'DRAFT',
  taskBranch: null,
  updatedAt: '2026-08-31T08:01:00Z',
};

function renderPanel(
  overrides: Partial<React.ComponentProps<typeof WorkItemPlanningPanel>> = {},
) {
  const onChanged = vi.fn().mockResolvedValue(undefined);
  const props: React.ComponentProps<typeof WorkItemPlanningPanel> = {
    canAssign: true,
    canCreate: true,
    onChanged,
    requirement,
    requestId: 'request-detail',
    sessionKey: 'account-creator',
    workItemAssignments: [],
    workItems: [workItem],
    ...overrides,
  };
  const queryClient = new QueryClient({
    defaultOptions: { mutations: { retry: false }, queries: { retry: false } },
  });
  const tree = (
    currentProps: React.ComponentProps<typeof WorkItemPlanningPanel>,
  ) => (
    <QueryClientProvider client={queryClient}>
      <ConfigProvider theme={{ token: { motion: false } }}>
        <App>
          <WorkItemPlanningPanel
            key={`${currentProps.sessionKey}:${currentProps.requirement.id}`}
            {...currentProps}
          />
        </App>
      </ConfigProvider>
    </QueryClientProvider>
  );
  const view = render(tree(props));
  return {
    onChanged,
    queryClient,
    rerenderPanel: (
      next: Partial<React.ComponentProps<typeof WorkItemPlanningPanel>>,
    ) => view.rerender(tree({ ...props, ...next })),
  };
}

async function selectOption(label: string, option: string) {
  const user = userEvent.setup();
  await user.click(screen.getByRole('combobox', { name: label }));
  await user.click(await screen.findByRole('option', { name: option }));
}

beforeEach(() => {
  serviceMocks.addWorkItem.mockReset();
  serviceMocks.assignWorkItem.mockReset();
  serviceMocks.listAuthorizedRepositories.mockReset();
  serviceMocks.listAuthorizedRepositories.mockResolvedValue([
    {
      defaultBranch: 'main',
      projectPath: 'platform/frontend',
      provider: 'gitlab',
      repositoryId: 'repository-2',
    },
  ]);
});

describe('WorkItemPlanningPanel', () => {
  it('无写 Capability 时只展示服务端事实', () => {
    renderPanel({ canAssign: false, canCreate: false });

    expect(screen.getByText('work-item-1')).toBeVisible();
    expect(screen.getByText('WorkItem Revision')).toBeVisible();
    expect(screen.queryByRole('button', { name: '增加 WorkItem' })).toBeNull();
    expect(screen.queryByRole('button', { name: '分配负责人' })).toBeNull();
    expect(serviceMocks.listAuthorizedRepositories).not.toHaveBeenCalled();
  });

  it('从当前 Workspace 授权仓库增加 WorkItem 并用 Requirement revision', async () => {
    serviceMocks.addWorkItem
      .mockRejectedValueOnce(new Error('增加结果未知'))
      .mockResolvedValueOnce({});
    const { onChanged } = renderPanel();
    const user = userEvent.setup();

    await user.click(screen.getByRole('button', { name: '增加 WorkItem' }));
    const dialog = await screen.findByRole('dialog', { name: '增加 WorkItem' });
    await waitFor(() => {
      expect(serviceMocks.listAuthorizedRepositories).toHaveBeenCalledWith(
        'workspace-1',
        expect.any(AbortSignal),
      );
    });
    await selectOption('仓库', 'platform/frontend · main');
    await user.click(within(dialog).getByRole('button', { name: '确认增加' }));

    expect(await within(dialog).findByRole('alert')).toHaveTextContent(
      '增加结果未知',
    );
    await user.click(
      within(dialog).getByRole('button', { name: '重新读取状态' }),
    );
    await user.click(within(dialog).getByRole('button', { name: '确认增加' }));

    await waitFor(() => {
      expect(serviceMocks.addWorkItem).toHaveBeenCalledTimes(2);
    });
    expect(serviceMocks.addWorkItem.mock.calls[0]).toEqual([
      'requirement-1',
      'repository-2',
      7,
      expect.any(String),
    ]);
    expect(serviceMocks.addWorkItem.mock.calls[1]?.[3]).toBe(
      serviceMocks.addWorkItem.mock.calls[0]?.[3],
    );
    expect(onChanged).toHaveBeenCalledTimes(2);
  });

  it('授权仓库为空时显示明确空态并禁止提交', async () => {
    serviceMocks.listAuthorizedRepositories.mockResolvedValue([]);
    renderPanel();

    await userEvent
      .setup()
      .click(screen.getByRole('button', { name: '增加 WorkItem' }));

    expect(
      await screen.findByText('该工作区没有可增加的授权仓库'),
    ).toBeVisible();
    expect(screen.getByRole('button', { name: '确认增加' })).toBeDisabled();
  });

  it('授权仓库权限失败时不泄露选项，并允许重新读取', async () => {
    serviceMocks.listAuthorizedRepositories
      .mockRejectedValueOnce(
        createProblemError({
          detail: '无权读取该 Workspace 仓库',
          requestId: 'request-repositories-403',
          status: 403,
        }),
      )
      .mockResolvedValueOnce([]);
    renderPanel();
    const user = userEvent.setup();

    await user.click(screen.getByRole('button', { name: '增加 WorkItem' }));
    expect(await screen.findByText(/无权读取该 Workspace 仓库/)).toBeVisible();
    await user.click(screen.getByRole('button', { name: '重试加载授权仓库' }));

    await waitFor(() => {
      expect(serviceMocks.listAuthorizedRepositories).toHaveBeenCalledTimes(2);
    });
    expect(
      await screen.findByText('该工作区没有可增加的授权仓库'),
    ).toBeVisible();
  });

  it('只展示当前未被 supersede 的 WorkItem Assignment', () => {
    renderPanel({
      workItemAssignments: [
        {
          assignedAt: '2026-08-31T08:00:00Z',
          assignedBy: 'account-creator',
          assigneeId: 'account-other',
          id: 'assignment-other',
          reason: '其他 WorkItem',
          revision: 1,
          supersededAt: null,
          workItemId: 'work-item-other',
        },
        {
          assignedAt: '2026-08-31T08:00:00Z',
          assignedBy: 'account-creator',
          assigneeId: 'account-old',
          id: 'assignment-old',
          reason: '已被替代',
          revision: 1,
          supersededAt: '2026-08-31T08:01:00Z',
          workItemId: workItem.id,
        },
        {
          assignedAt: '2026-08-31T08:01:00Z',
          assignedBy: 'account-creator',
          assigneeId: 'account-current',
          id: 'assignment-current',
          reason: '当前负责人',
          revision: 2,
          supersededAt: null,
          workItemId: workItem.id,
        },
      ],
    });

    expect(screen.getByText(/account-current.*当前负责人/)).toBeVisible();
    expect(screen.queryByText(/account-old.*已被替代/)).toBeNull();
  });

  it('分配失败后相同 payload 重试复用 key，并使用 WorkItem revision', async () => {
    serviceMocks.assignWorkItem
      .mockRejectedValueOnce(new Error('结果未知，请重新读取状态'))
      .mockResolvedValueOnce({});
    const { onChanged, rerenderPanel } = renderPanel();
    const user = userEvent.setup();

    await user.click(screen.getByRole('button', { name: '分配负责人' }));
    const dialog = await screen.findByRole('dialog', {
      name: '分配 WorkItem 负责人',
    });
    await user.type(
      within(dialog).getByRole('textbox', { name: '负责人账号 ID' }),
      ' account-owner ',
    );
    await user.type(
      within(dialog).getByRole('textbox', { name: '分配原因' }),
      ' 负责前端实现 ',
    );
    await user.click(within(dialog).getByRole('button', { name: '确认分配' }));

    expect(await within(dialog).findByRole('alert')).toHaveTextContent(
      '结果未知，请重新读取状态',
    );
    await user.click(
      within(dialog).getByRole('button', { name: '重新读取状态' }),
    );
    rerenderPanel({ workItems: [{ ...workItem, revision: 4 }] });
    await user.click(within(dialog).getByRole('button', { name: '确认分配' }));
    await waitFor(() => {
      expect(serviceMocks.assignWorkItem).toHaveBeenCalledTimes(2);
    });
    const [firstCall, secondCall] = serviceMocks.assignWorkItem.mock.calls;
    expect(firstCall).toEqual([
      'requirement-1',
      'work-item-1',
      { humanOwnerId: 'account-owner', reason: '负责前端实现' },
      3,
      expect.any(String),
    ]);
    expect(secondCall).toEqual([
      'requirement-1',
      'work-item-1',
      { humanOwnerId: 'account-owner', reason: '负责前端实现' },
      4,
      firstCall?.[4],
    ]);
    expect(onChanged).toHaveBeenCalledTimes(2);
  });

  it('Session 切换后相同命令生成新提交身份并关闭旧 Modal', async () => {
    serviceMocks.addWorkItem
      .mockRejectedValueOnce(new Error('结果未知'))
      .mockResolvedValueOnce({});
    const { rerenderPanel } = renderPanel();
    const user = userEvent.setup();

    await user.click(screen.getByRole('button', { name: '增加 WorkItem' }));
    let dialog = await screen.findByRole('dialog', { name: '增加 WorkItem' });
    await selectOption('仓库', 'platform/frontend · main');
    await user.click(within(dialog).getByRole('button', { name: '确认增加' }));
    expect(await within(dialog).findByText('结果未知')).toBeVisible();

    rerenderPanel({ sessionKey: 'account-other' });
    await waitFor(() => {
      expect(
        screen.queryByRole('dialog', { name: '增加 WorkItem' }),
      ).toBeNull();
    });
    await user.click(screen.getByRole('button', { name: '增加 WorkItem' }));
    dialog = await screen.findByRole('dialog', { name: '增加 WorkItem' });
    await selectOption('仓库', 'platform/frontend · main');
    await user.click(within(dialog).getByRole('button', { name: '确认增加' }));

    await waitFor(() => {
      expect(serviceMocks.addWorkItem).toHaveBeenCalledTimes(2);
    });
    expect(serviceMocks.addWorkItem.mock.calls[1]?.[3]).not.toBe(
      serviceMocks.addWorkItem.mock.calls[0]?.[3],
    );
  });
});
