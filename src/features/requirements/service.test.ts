import { beforeEach, describe, expect, it, vi } from 'vitest';
import { ApiError } from '@/services/transport';

const apiMock = vi.hoisted(() => ({ GET: vi.fn(), POST: vi.fn() }));

vi.mock('@/services/generated', () => ({ api: apiMock }));

import {
  createRequirement,
  getRequirement,
  listAuthorizedRepositories,
  listRequirements,
} from './service';

const workspaceId = '10000000-0000-0000-0000-000000000001';
const requirementId = '20000000-0000-0000-0000-000000000002';
const workItemId = '30000000-0000-0000-0000-000000000003';
const repositoryId = '40000000-0000-0000-0000-000000000004';
const createdAt = '2026-08-28T08:00:00Z';
const updatedAt = '2026-08-28T08:01:00Z';

const requirementDto = {
  acceptanceCriteria: ['分支必须从 main 的精确 SHA 创建'],
  createdAt,
  createdBy: 'account-1',
  currentSddBaselineId: null,
  description: '建立 Requirement 的首个确定性任务分支',
  id: requirementId,
  initialRepositoryId: repositoryId,
  recordState: 'ACTIVE' as const,
  requiredWorkItemSetHash: 'internal-work-item-set-hash',
  requiredWorkItemSetVersion: 1,
  requirementVersion: 1,
  revision: 1,
  routeSnapshotHash: 'internal-route-snapshot-hash',
  routeSnapshotVersion: 1,
  state: 'CREATED' as const,
  title: '建立任务分支',
  type: 'feat' as const,
  updatedAt,
  workspaceId,
};

const workItemDto = {
  assignmentState: 'ASSIGNED' as const,
  baseCommitSha: null,
  createdAt,
  createdBy: 'account-1',
  executorId: 'account-1',
  executorType: 'HUMAN' as const,
  humanOwnerId: 'account-1',
  id: workItemId,
  repositoryBlockedAt: null,
  repositoryBlockedReasonCode: null,
  repositoryId,
  repositoryState: 'WAITING_REPOSITORY' as const,
  requiredCapabilities: ['requirement.create'],
  requirementId,
  revision: 1,
  state: 'DRAFT' as const,
  taskBranch: null,
  updatedAt,
};

const expectedRequirement = {
  acceptanceCriteria: ['分支必须从 main 的精确 SHA 创建'],
  createdAt,
  createdBy: 'account-1',
  description: '建立 Requirement 的首个确定性任务分支',
  id: requirementId,
  initialRepositoryId: repositoryId,
  recordState: 'ACTIVE' as const,
  revision: 1,
  state: 'CREATED' as const,
  title: '建立任务分支',
  type: 'feat' as const,
  updatedAt,
  workspaceId,
};

const expectedWorkItem = {
  assignmentState: 'ASSIGNED' as const,
  baseCommitSha: null,
  createdAt,
  createdBy: 'account-1',
  executorId: 'account-1',
  executorType: 'HUMAN' as const,
  humanOwnerId: 'account-1',
  id: workItemId,
  repositoryBlockedAt: null,
  repositoryBlockedReasonCode: null,
  repositoryId,
  repositoryState: 'WAITING_REPOSITORY' as const,
  requiredCapabilities: ['requirement.create'],
  requirementId,
  revision: 1,
  state: 'DRAFT' as const,
  taskBranch: null,
  updatedAt,
};

const result = <T>(data: T) => ({
  data,
  response: new Response(null, { status: 200 }),
});

beforeEach(() => {
  apiMock.GET.mockReset();
  apiMock.POST.mockReset();
});

describe('Requirement Feature service seam', () => {
  it('列表使用精确 Workspace、cursor 与 limit，并只返回概览字段', async () => {
    apiMock.GET.mockResolvedValue(
      result({ items: [requirementDto], nextCursor: 'cursor-2' }),
    );

    await expect(
      listRequirements({ cursor: 'cursor-1', limit: 25, workspaceId }),
    ).resolves.toEqual({
      items: [
        {
          id: requirementId,
          state: 'CREATED',
          title: '建立任务分支',
          type: 'feat',
          updatedAt,
          workspaceId,
        },
      ],
      nextCursor: 'cursor-2',
    });
    expect(apiMock.GET).toHaveBeenCalledWith('/api/v1/requirements', {
      params: {
        query: { cursor: 'cursor-1', limit: 25, workspaceId },
      },
    });
  });

  it('详情使用精确 Requirement path ID 并映射安全的 WorkItem 事实', async () => {
    apiMock.GET.mockResolvedValue(
      result({
        requirement: requirementDto,
        workItems: [
          {
            ...workItemDto,
            connectionRef: 'must-not-escape',
            effectLedgerId: 'must-not-escape',
          },
        ],
      }),
    );

    const details = await getRequirement(requirementId);

    expect(details).toEqual({
      requirement: expectedRequirement,
      workItems: [expectedWorkItem],
    });
    expect(details.workItems[0]).not.toHaveProperty('connectionRef');
    expect(details.workItems[0]).not.toHaveProperty('effectLedgerId');
    expect(apiMock.GET).toHaveBeenCalledWith(
      '/api/v1/requirements/{requirementId}',
      { params: { path: { requirementId } } },
    );
  });

  it('授权仓库查询使用精确 Workspace path 且剥离 Secret 与 Effect 字段', async () => {
    apiMock.GET.mockResolvedValue(
      result({
        items: [
          {
            connectionRef: 'must-not-escape',
            credentialSecretRef: 'must-not-escape',
            defaultBranch: 'main',
            effectState: 'must-not-escape',
            projectPath: 'group/platform',
            provider: 'gitlab',
            repositoryId,
            webhookSigningSecretRef: 'must-not-escape',
          },
        ],
      }),
    );

    await expect(listAuthorizedRepositories(workspaceId)).resolves.toEqual([
      {
        defaultBranch: 'main',
        projectPath: 'group/platform',
        provider: 'gitlab',
        repositoryId,
      },
    ]);
    expect(apiMock.GET).toHaveBeenCalledWith(
      '/api/v1/workspaces/{workspaceId}/repositories',
      { params: { path: { workspaceId } } },
    );
  });

  it('创建发送 generated body 与调用方提供的稳定 Idempotency-Key', async () => {
    const input = {
      acceptanceCriteria: ['分支必须从 main 的精确 SHA 创建'],
      description: '建立 Requirement 的首个确定性任务分支',
      initialRepositoryId: repositoryId,
      title: '建立任务分支',
      type: 'feat' as const,
      workspaceId,
    };
    apiMock.POST.mockResolvedValue(
      result({ requirement: requirementDto, workItem: workItemDto }),
    );

    await expect(
      createRequirement(input, 'requirement-submit-0001'),
    ).resolves.toEqual({
      requirement: expectedRequirement,
      workItem: expectedWorkItem,
    });
    expect(apiMock.POST).toHaveBeenCalledWith('/api/v1/requirements', {
      body: input,
      params: {
        header: { 'Idempotency-Key': 'requirement-submit-0001' },
      },
    });
  });

  it.each([
    ['list', () => listRequirements({ limit: 20, workspaceId }), 'GET'],
    ['get', () => getRequirement(requirementId), 'GET'],
    ['repositories', () => listAuthorizedRepositories(workspaceId), 'GET'],
    [
      'create',
      () =>
        createRequirement(
          {
            acceptanceCriteria: ['验收条件'],
            description: '需求描述',
            initialRepositoryId: repositoryId,
            title: '需求标题',
            type: 'fix',
            workspaceId,
          },
          'requirement-submit-missing-body',
        ),
      'POST',
    ],
  ] as const)(
    '%s 成功响应缺少 body 时拒绝无效响应',
    async (_, call, method) => {
      apiMock[method].mockResolvedValue({
        data: undefined,
        response: new Response(null, { status: 200 }),
      });

      await expect(call()).rejects.toMatchObject({
        name: 'ApiError',
        problem: { status: 200, title: 'INVALID_API_RESPONSE' },
      });
    },
  );

  it('归一化 Problem 保持同一 ApiError，不泄漏底层 result', async () => {
    const failure = new ApiError({
      detail: '无权访问其他 Workspace',
      requestId: 'request-cross-workspace',
      status: 403,
    });
    apiMock.GET.mockRejectedValue(failure);

    await expect(getRequirement(requirementId)).rejects.toBe(failure);
  });
});
