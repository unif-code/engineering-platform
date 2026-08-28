import { createProblemError } from '@root/tests/fixtures/problemError';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { act, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { App, ConfigProvider } from 'antd';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { REQUIREMENT_POLL_INTERVAL_MS } from './binding';
import type { RequirementDetails, WorkItem } from './type';

const requirementMocks = vi.hoisted(() => ({
  getRequirement: vi.fn(),
}));
const routeMocks = vi.hoisted(() => ({
  requirementId: 'requirement-1',
}));

vi.mock('@umijs/max', async () => ({
  ...(await import('@tanstack/react-query')),
  useParams: () => ({ requirementId: routeMocks.requirementId }),
}));

vi.mock('./service', () => ({
  getRequirement: requirementMocks.getRequirement,
}));

import { RequirementDetailPage } from './RequirementDetailPage';

function workItem(overrides: Partial<WorkItem> = {}): WorkItem {
  return {
    assignmentState: 'ASSIGNED',
    baseCommitSha: null,
    createdAt: '2026-08-28T08:00:00Z',
    createdBy: 'account-1',
    executorId: 'account-1',
    executorType: 'HUMAN',
    humanOwnerId: 'account-1',
    id: 'work-item-1',
    repositoryBlockedAt: null,
    repositoryBlockedReasonCode: null,
    repositoryId: 'repository-1',
    repositoryState: 'WAITING_REPOSITORY',
    requiredCapabilities: ['requirement.create'],
    requirementId: routeMocks.requirementId,
    revision: 1,
    state: 'DRAFT',
    taskBranch: null,
    updatedAt: '2026-08-28T08:01:00Z',
    ...overrides,
  };
}

function details(item: WorkItem = workItem()): RequirementDetails {
  return {
    requirement: {
      acceptanceCriteria: [
        '任务分支必须从精确 main SHA 创建',
        '回读验证分支指向同一 commit',
      ],
      createdAt: '2026-08-28T08:00:00Z',
      createdBy: 'account-1',
      description: '建立 Requirement 的首个确定性任务分支',
      id: routeMocks.requirementId,
      initialRepositoryId: 'repository-1',
      recordState: 'ACTIVE',
      revision: 1,
      state: 'CREATED',
      title: `建立任务分支 ${routeMocks.requirementId}`,
      type: 'feat',
      updatedAt: '2026-08-28T08:01:00Z',
      workspaceId: 'workspace-1',
    },
    workItems: [item],
  };
}

function readyDetails() {
  return details(
    workItem({
      baseCommitSha: '0123456789abcdef0123456789abcdef01234567',
      repositoryState: 'BOUND',
      taskBranch: `task/req-${routeMocks.requirementId}`,
    }),
  );
}

function renderPage() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return render(
    <QueryClientProvider client={queryClient}>
      <ConfigProvider theme={{ token: { motion: false } }}>
        <App>
          <RequirementDetailPage />
        </App>
      </ConfigProvider>
    </QueryClientProvider>,
  );
}

beforeEach(() => {
  routeMocks.requirementId = 'requirement-1';
  requirementMocks.getRequirement.mockReset();
});

afterEach(() => {
  vi.useRealTimers();
});

describe('RequirementDetailPage', () => {
  it('请求未完成时只展示明确加载骨架', () => {
    requirementMocks.getRequirement.mockReturnValue(
      new Promise<RequirementDetails>(() => undefined),
    );

    renderPage();

    expect(
      screen.getByRole('status', { name: '正在加载需求详情' }),
    ).toBeInTheDocument();
    expect(screen.queryByText(/建立任务分支/)).not.toBeInTheDocument();
  });

  it('展示精确 Requirement/WorkItem/READY Binding 事实且没有后续版本动作', async () => {
    requirementMocks.getRequirement.mockResolvedValue(readyDetails());
    renderPage();

    expect(
      await screen.findByRole('heading', {
        name: '建立任务分支 requirement-1',
      }),
    ).toBeVisible();
    expect(screen.getAllByText('requirement-1').length).toBeGreaterThanOrEqual(
      2,
    );
    expect(
      screen.getByText('建立 Requirement 的首个确定性任务分支'),
    ).toBeVisible();
    expect(screen.getByText('任务分支必须从精确 main SHA 创建')).toBeVisible();
    expect(screen.getByText('回读验证分支指向同一 commit')).toBeVisible();
    expect(screen.getByText('task/req-requirement-1')).toBeVisible();
    expect(
      screen.getByText('0123456789abcdef0123456789abcdef01234567'),
    ).toBeVisible();
    expect(screen.getByText('work-item-1')).toBeVisible();
    expect(screen.getAllByText('repository-1').length).toBeGreaterThanOrEqual(
      2,
    );
    for (const futureAction of [
      '创建 MR',
      '合并',
      'Artifact',
      'Acceptance',
      'Chat',
      'Model',
    ]) {
      expect(screen.queryByText(futureAction)).not.toBeInTheDocument();
    }
  });

  it.each([
    createProblemError({
      detail: '无权查看其他 Workspace 的需求',
      requestId: 'req-detail-403',
      status: 403,
    }),
    createProblemError({
      detail: 'Requirement 不存在',
      requestId: 'req-detail-404',
      status: 404,
    }),
    new Error('network unavailable'),
  ])('加载失败展示安全 Problem：%s', async (error) => {
    requirementMocks.getRequirement.mockRejectedValue(error);
    renderPage();

    const alert = await screen.findByRole('alert');
    expect(alert).toHaveTextContent(
      error instanceof Error && error.message === 'network unavailable'
        ? 'network unavailable'
        : /无权查看|Requirement 不存在/,
    );
    expect(
      screen.getByRole('button', { name: '重试加载需求详情' }),
    ).toBeVisible();
  });

  it('错误可手动重试并恢复到精确终态', async () => {
    requirementMocks.getRequirement
      .mockRejectedValueOnce(
        createProblemError({
          detail: '详情暂时不可用',
          requestId: 'req-detail-503',
          status: 503,
        }),
      )
      .mockResolvedValueOnce(readyDetails());
    const user = userEvent.setup();
    renderPage();
    expect(await screen.findByRole('alert')).toHaveTextContent(
      '详情暂时不可用（requestId: req-detail-503）',
    );

    await user.click(screen.getByRole('button', { name: '重试加载需求详情' }));

    expect(await screen.findByText('任务分支已验证')).toBeVisible();
    expect(requirementMocks.getRequirement).toHaveBeenCalledTimes(2);
  });

  it('BOUND 缺少 SHA 时进入 INVALID_API_RESPONSE，而不是猜测 READY', async () => {
    requirementMocks.getRequirement.mockResolvedValue(
      details(
        workItem({
          repositoryState: 'BOUND',
          taskBranch: 'task/partial-binding',
        }),
      ),
    );
    renderPage();

    expect(await screen.findByRole('alert')).toHaveTextContent(
      'BOUND 状态缺少精确 base commit 或 task branch',
    );
    expect(screen.queryByText('任务分支已验证')).not.toBeInTheDocument();
  });

  it('PENDING 自动轮询到 READY 后停止继续请求', async () => {
    vi.useFakeTimers();
    requirementMocks.getRequirement
      .mockResolvedValueOnce(details())
      .mockResolvedValueOnce(readyDetails());
    renderPage();
    await act(async () => {
      await vi.advanceTimersByTimeAsync(0);
    });
    expect(screen.getAllByText('等待仓库绑定')).toHaveLength(2);

    await act(async () => {
      await vi.advanceTimersByTimeAsync(REQUIREMENT_POLL_INTERVAL_MS);
    });
    expect(requirementMocks.getRequirement).toHaveBeenCalledTimes(2);
    await act(async () => {
      await Promise.resolve();
      await Promise.resolve();
      await vi.advanceTimersByTimeAsync(1);
    });
    expect(screen.getByText('任务分支已验证')).toBeInTheDocument();

    await act(async () => {
      await vi.advanceTimersByTimeAsync(REQUIREMENT_POLL_INTERVAL_MS * 3);
    });
    expect(requirementMocks.getRequirement).toHaveBeenCalledTimes(2);
  });

  it('PENDING 页面卸载后停止轮询', async () => {
    vi.useFakeTimers();
    requirementMocks.getRequirement.mockResolvedValue(details());
    const view = renderPage();
    await act(async () => {
      await vi.advanceTimersByTimeAsync(0);
    });
    expect(requirementMocks.getRequirement).toHaveBeenCalledTimes(1);

    view.unmount();
    await act(async () => {
      await vi.advanceTimersByTimeAsync(REQUIREMENT_POLL_INTERVAL_MS * 3);
    });

    expect(requirementMocks.getRequirement).toHaveBeenCalledTimes(1);
  });

  it('路由切换后旧请求晚到不能覆盖新 Requirement 终态', async () => {
    let resolveOld: ((value: RequirementDetails) => void) | undefined;
    const oldRequest = new Promise<RequirementDetails>((resolve) => {
      resolveOld = resolve;
    });
    requirementMocks.getRequirement
      .mockReturnValueOnce(oldRequest)
      .mockImplementationOnce(async () => readyDetails());
    const view = renderPage();
    await waitFor(() => {
      expect(requirementMocks.getRequirement).toHaveBeenCalledWith(
        'requirement-1',
      );
    });

    routeMocks.requirementId = 'requirement-2';
    view.rerender(
      <QueryClientProvider
        client={
          new QueryClient({
            defaultOptions: { queries: { retry: false } },
          })
        }
      >
        <ConfigProvider theme={{ token: { motion: false } }}>
          <App>
            <RequirementDetailPage />
          </App>
        </ConfigProvider>
      </QueryClientProvider>,
    );

    expect(
      await screen.findByRole('heading', {
        name: '建立任务分支 requirement-2',
      }),
    ).toBeVisible();
    expect(requirementMocks.getRequirement).toHaveBeenCalledWith(
      'requirement-2',
    );

    await act(async () => {
      if (resolveOld === undefined) {
        throw new Error('old Requirement request was not started');
      }
      routeMocks.requirementId = 'requirement-1';
      resolveOld(details());
      await oldRequest;
      routeMocks.requirementId = 'requirement-2';
    });

    expect(
      screen.getByRole('heading', {
        name: '建立任务分支 requirement-2',
      }),
    ).toBeVisible();
    expect(screen.getByText('任务分支已验证')).toBeVisible();
    expect(screen.queryByText('等待仓库绑定')).not.toBeInTheDocument();
  });
});
