import { createProblemError } from '@root/tests/fixtures/problemError';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import {
  act,
  fireEvent,
  render,
  screen,
  waitFor,
} from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { App, ConfigProvider } from 'antd';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  REQUIREMENT_AUTO_POLL_WINDOW_MS,
  REQUIREMENT_POLL_INTERVAL_MS,
} from './binding';
import type { RequirementDetails, WorkItem } from './type';

const requirementMocks = vi.hoisted(() => ({
  getRequirement: vi.fn(),
}));
const routeMocks = vi.hoisted(() => ({
  principal: {
    accountId: 'account-a',
    employeeId: '00000001',
    name: '账号 A',
  } as null | { accountId: string | null; employeeId: string; name: string },
  requirementId: 'requirement-1',
  scopedCapabilities: [] as Array<{
    capability: string;
    scopeId: string | null;
    scopeType: 'GLOBAL' | 'WORKSPACE';
  }>,
}));

vi.mock('@umijs/max', async () => ({
  ...(await import('@tanstack/react-query')),
  useModel: () => ({
    initialState: {
      principal: routeMocks.principal,
      scopedCapabilities: routeMocks.scopedCapabilities,
    },
  }),
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
    currentDecision: null,
    currentGate: null,
    currentGateAssignment: null,
    currentSddBaseline: null,
    requestId: 'req-detail-success',
    requirement: {
      acceptanceCriteria: [
        '任务分支必须从精确 main SHA 创建',
        '回读验证分支指向同一 commit',
      ],
      createdAt: '2026-08-28T08:00:00Z',
      createdBy: 'account-1',
      currentSddBaselineId: null,
      description: '建立 Requirement 的首个确定性任务分支',
      id: routeMocks.requirementId,
      initialRepositoryId: 'repository-1',
      recordState: 'ACTIVE',
      requiredWorkItemSetHash: 'work-item-set-hash-1',
      requiredWorkItemSetVersion: 1,
      requirementVersion: 1,
      revision: 1,
      routeSnapshot: {
        requirementType: 'feat',
        requiredCapabilities: ['code.change'],
        steps: ['brainstorming', 'writing-plans'],
        version: 1,
      },
      routeSnapshotHash: 'route-snapshot-hash-1',
      routeSnapshotVersion: 1,
      state: 'CREATED',
      title: `建立任务分支 ${routeMocks.requirementId}`,
      type: 'feat',
      updatedAt: '2026-08-28T08:01:00Z',
      workspaceId: 'workspace-1',
    },
    workItemAssignments: [],
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

function pageTree(queryClient: QueryClient) {
  return (
    <QueryClientProvider client={queryClient}>
      <ConfigProvider theme={{ token: { motion: false } }}>
        <App>
          <RequirementDetailPage />
        </App>
      </ConfigProvider>
    </QueryClientProvider>
  );
}

function renderPage(
  queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  }),
) {
  return render(pageTree(queryClient));
}

beforeEach(() => {
  routeMocks.principal = {
    accountId: 'account-a',
    employeeId: '00000001',
    name: '账号 A',
  };
  routeMocks.requirementId = 'requirement-1';
  routeMocks.scopedCapabilities = [];
  requirementMocks.getRequirement.mockReset();
});

afterEach(() => {
  vi.useRealTimers();
});

describe('RequirementDetailPage', () => {
  it('缺少路由 Requirement ID 时不发请求并展示明确错误', () => {
    routeMocks.requirementId = '';

    renderPage();

    expect(screen.getByRole('alert')).toHaveTextContent('缺少 Requirement ID');
    expect(requirementMocks.getRequirement).not.toHaveBeenCalled();
  });

  it('Session 未就绪时不发请求且不读取详情', () => {
    routeMocks.principal = null;

    renderPage();

    expect(screen.getByRole('alert')).toHaveTextContent(
      'Session 未就绪，无法读取需求详情',
    );
    expect(requirementMocks.getRequirement).not.toHaveBeenCalled();
  });

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

  it('只按当前 Requirement Workspace 的精确 Capability 显示 V0.4 写入口', async () => {
    routeMocks.scopedCapabilities = [
      {
        capability: 'work_item.create',
        scopeId: 'workspace-1',
        scopeType: 'WORKSPACE',
      },
      {
        capability: 'work_item.assign',
        scopeId: 'workspace-1',
        scopeType: 'WORKSPACE',
      },
      {
        capability: 'requirement.baseline.submit',
        scopeId: 'workspace-1',
        scopeType: 'WORKSPACE',
      },
      {
        capability: 'requirement.baseline.assign',
        scopeId: 'workspace-other',
        scopeType: 'WORKSPACE',
      },
    ];
    requirementMocks.getRequirement.mockResolvedValue(details());

    renderPage();

    expect(
      await screen.findByRole('button', { name: '增加 WorkItem' }),
    ).toBeVisible();
    expect(screen.getByRole('button', { name: '分配负责人' })).toBeVisible();
    expect(screen.getByRole('button', { name: '创建 SDD' })).toBeVisible();
    expect(screen.queryByRole('button', { name: '改派审核人' })).toBeNull();
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

  it.each([
    { message: 'problem 不是对象', problem: null },
    { message: 'status 不是数字', problem: { status: '403' } },
  ])('畸形 Problem 状态不会伪装成权限错误：%s', async (error) => {
    requirementMocks.getRequirement.mockRejectedValue(error);
    renderPage();

    expect(await screen.findByRole('alert')).toHaveTextContent(error.message);
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

  it('已有详情后台刷新收到 403 时立即隐藏陈旧敏感事实', async () => {
    requirementMocks.getRequirement
      .mockResolvedValueOnce(readyDetails())
      .mockRejectedValueOnce(
        createProblemError({
          detail: '当前账号已失去该 Workspace 权限',
          requestId: 'req-detail-revoked',
          status: 403,
        }),
      );
    const user = userEvent.setup();
    renderPage();
    expect(await screen.findByText('任务分支已验证')).toBeVisible();

    await user.click(screen.getByRole('button', { name: '刷新状态' }));

    expect(await screen.findByRole('alert')).toHaveTextContent(
      '当前账号已失去该 Workspace 权限',
    );
    expect(screen.queryByText('任务分支已验证')).not.toBeInTheDocument();
    expect(
      screen.queryByText('建立 Requirement 的首个确定性任务分支'),
    ).not.toBeInTheDocument();
  });

  it('已有详情后台刷新失败时保留事实、展示错误并允许重试', async () => {
    requirementMocks.getRequirement
      .mockResolvedValueOnce(readyDetails())
      .mockRejectedValueOnce(
        createProblemError({
          detail: '详情刷新暂时不可用',
          requestId: 'req-detail-refresh-503',
          status: 503,
        }),
      )
      .mockResolvedValueOnce(readyDetails());
    const user = userEvent.setup();
    renderPage();
    expect(await screen.findByText('任务分支已验证')).toBeVisible();

    await user.click(screen.getByRole('button', { name: '刷新状态' }));

    expect(await screen.findByRole('alert')).toHaveTextContent(
      '详情刷新暂时不可用（requestId: req-detail-refresh-503）',
    );
    expect(screen.getByText('任务分支已验证')).toBeVisible();

    await user.click(screen.getByRole('button', { name: '重试加载需求详情' }));
    await waitFor(() => {
      expect(requirementMocks.getRequirement).toHaveBeenCalledTimes(3);
      expect(screen.queryByRole('alert')).not.toBeInTheDocument();
    });
  });

  it('accountId 缺失时使用 employeeId 隔离缓存，并兼容空 requestId', async () => {
    routeMocks.principal = {
      accountId: null,
      employeeId: '00000001',
      name: '员工账号',
    };
    routeMocks.scopedCapabilities = undefined as never;
    const response = readyDetails();
    response.requestId = null;
    const queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false } },
    });
    requirementMocks.getRequirement.mockResolvedValue(response);

    renderPage(queryClient);

    expect(await screen.findByText('任务分支已验证')).toBeVisible();
    expect(
      queryClient.getQueryData([
        'requirement-details',
        '00000001',
        'requirement-1',
      ]),
    ).toEqual(response);
  });

  it('没有 WorkItem 时展示真实空态', async () => {
    const response = details();
    response.workItems = [];
    requirementMocks.getRequirement.mockResolvedValue(response);

    renderPage();

    expect(
      await screen.findByText('当前 Requirement 没有 WorkItem'),
    ).toBeVisible();
  });

  it('同一 QueryClient 切换账号会中止旧请求且不会向新账号显示晚到详情', async () => {
    let oldSignal: AbortSignal | undefined;
    let resolveOld: ((value: RequirementDetails) => void) | undefined;
    const oldDetails = details();
    const oldRequest = new Promise<RequirementDetails>((resolve) => {
      resolveOld = resolve;
    });
    requirementMocks.getRequirement
      .mockImplementationOnce(async (_requirementId, signal: AbortSignal) => {
        oldSignal = signal;
        return oldRequest;
      })
      .mockRejectedValueOnce(
        createProblemError({
          detail: '账号 B 无权查看该 Requirement',
          requestId: 'req-detail-account-b',
          status: 403,
        }),
      );
    const queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false } },
    });
    const view = renderPage(queryClient);
    await waitFor(() => {
      expect(requirementMocks.getRequirement).toHaveBeenCalledTimes(1);
    });

    routeMocks.principal = {
      accountId: 'account-b',
      employeeId: '00000002',
      name: '账号 B',
    };
    view.rerender(pageTree(queryClient));

    expect(await screen.findByRole('alert')).toHaveTextContent(
      '账号 B 无权查看该 Requirement',
    );
    expect(oldSignal?.aborted).toBe(true);

    await act(async () => {
      if (resolveOld === undefined) {
        throw new Error('old Requirement request was not started');
      }
      resolveOld(oldDetails);
      await oldRequest;
    });

    expect(
      screen.queryByText('建立 Requirement 的首个确定性任务分支'),
    ).not.toBeInTheDocument();
    expect(
      queryClient.getQueryData([
        'requirement-details',
        'account-a',
        'requirement-1',
      ]),
    ).toBeUndefined();
  });

  it('未知 BLOCKED 原因只显示通用文案与详情响应 requestId', async () => {
    requirementMocks.getRequirement.mockResolvedValue(
      details(
        workItem({
          repositoryBlockedReasonCode: 'FUTURE_PROVIDER_DETAIL' as never,
          repositoryState: 'BLOCKED',
        }),
      ),
    );
    renderPage();

    const alert = await screen.findByRole('alert');
    expect(alert).toHaveTextContent('仓库绑定已阻塞，请联系平台管理员');
    expect(alert).toHaveTextContent('requestId: req-detail-success');
    expect(alert).not.toHaveTextContent('FUTURE_PROVIDER_DETAIL');
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

  it('PENDING 自动轮询达到 60 秒上限后停止并保留单次手动刷新', async () => {
    vi.useFakeTimers();
    requirementMocks.getRequirement.mockResolvedValue(details());
    renderPage();
    await act(async () => {
      await vi.advanceTimersByTimeAsync(0);
    });
    for (
      let elapsed = 0;
      elapsed < REQUIREMENT_AUTO_POLL_WINDOW_MS;
      elapsed += REQUIREMENT_POLL_INTERVAL_MS
    ) {
      await act(async () => {
        await vi.advanceTimersByTimeAsync(REQUIREMENT_POLL_INTERVAL_MS);
        await Promise.resolve();
      });
    }
    await act(async () => {
      await vi.advanceTimersByTimeAsync(REQUIREMENT_POLL_INTERVAL_MS);
      await Promise.resolve();
    });

    expect(screen.getByText('自动刷新已暂停')).toBeVisible();
    const callsAtDeadline = requirementMocks.getRequirement.mock.calls.length;
    expect(callsAtDeadline).toBeGreaterThan(1);

    await act(async () => {
      await vi.advanceTimersByTimeAsync(REQUIREMENT_POLL_INTERVAL_MS * 3);
    });
    expect(requirementMocks.getRequirement).toHaveBeenCalledTimes(
      callsAtDeadline,
    );

    fireEvent.click(screen.getByRole('button', { name: '手动刷新' }));
    await act(async () => {
      await vi.advanceTimersByTimeAsync(0);
    });
    expect(requirementMocks.getRequirement).toHaveBeenCalledTimes(
      callsAtDeadline + 1,
    );
  });

  it('页面暂停期间越过轮询期限时立即停止自动对账', async () => {
    vi.useFakeTimers();
    const startedAt = new Date('2026-08-28T08:00:00Z');
    vi.setSystemTime(startedAt);
    requirementMocks.getRequirement.mockResolvedValue(details());
    renderPage();
    await act(async () => {
      await vi.advanceTimersByTimeAsync(0);
    });
    expect(screen.getAllByText('等待仓库绑定')).toHaveLength(2);

    vi.setSystemTime(startedAt.getTime() + REQUIREMENT_AUTO_POLL_WINDOW_MS + 1);
    fireEvent.click(screen.getByRole('button', { name: '刷新状态' }));
    await act(async () => {
      await vi.advanceTimersByTimeAsync(0);
      await Promise.resolve();
    });

    expect(screen.getByText('自动刷新已暂停')).toBeVisible();
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
        expect.any(AbortSignal),
      );
    });

    routeMocks.requirementId = 'requirement-2';
    const nextQueryClient = new QueryClient({
      defaultOptions: { queries: { retry: false } },
    });
    view.rerender(pageTree(nextQueryClient));

    expect(
      await screen.findByRole('heading', {
        name: '建立任务分支 requirement-2',
      }),
    ).toBeVisible();
    expect(requirementMocks.getRequirement).toHaveBeenCalledWith(
      'requirement-2',
      expect.any(AbortSignal),
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
