import { beforeEach, describe, expect, it, vi } from 'vitest';

const apiMock = vi.hoisted(() => ({ GET: vi.fn(), POST: vi.fn() }));

vi.mock('@/services/generated', () => ({ api: apiMock }));

import {
  addWorkItem,
  assignWorkItem,
  createSddArtifact,
  decideBaseline,
  getRequirement,
  getSddArtifactVersion,
  reassignBaselineGate,
  registerSddBaseline,
  submitBaselineConfirmation,
} from './service';

const requirementId = '20000000-0000-0000-0000-000000000002';
const workItemId = '30000000-0000-0000-0000-000000000003';
const artifactId = '50000000-0000-0000-0000-000000000005';
const baselineId = '60000000-0000-0000-0000-000000000006';
const gateId = '70000000-0000-0000-0000-000000000007';
const createdAt = '2026-08-31T08:00:00Z';

const requirementDto = {
  acceptanceCriteria: ['完成闭环'],
  createdAt,
  createdBy: 'account-creator',
  currentSddBaselineId: baselineId,
  description: 'V0.4 Requirement',
  id: requirementId,
  initialRepositoryId: 'repository-1',
  recordState: 'ACTIVE' as const,
  requiredWorkItemSetHash: 'work-item-set-hash',
  requiredWorkItemSetVersion: 2,
  requirementVersion: 4,
  revision: 8,
  routeSnapshot: {
    requirementType: 'feat',
    requiredCapabilities: ['code.change'],
    steps: ['brainstorming', 'writing-plans'],
    version: 2,
  },
  routeSnapshotHash: 'route-hash',
  routeSnapshotVersion: 2,
  state: 'PREPARING' as const,
  title: 'V0.4 flow',
  type: 'feat' as const,
  updatedAt: createdAt,
  workspaceId: '10000000-0000-0000-0000-000000000001',
};

const workItemDto = {
  assignmentState: 'ASSIGNED' as const,
  baseCommitSha: null,
  createdAt,
  createdBy: 'account-creator',
  executorId: 'account-owner',
  executorType: 'HUMAN' as const,
  humanOwnerId: 'account-owner',
  id: workItemId,
  repositoryBlockedAt: null,
  repositoryBlockedReasonCode: null,
  repositoryId: 'repository-2',
  repositoryState: 'WAITING_REPOSITORY' as const,
  requiredCapabilities: ['code.change'],
  requirementId,
  revision: 3,
  state: 'DRAFT' as const,
  taskBranch: null,
  updatedAt: createdAt,
};

const workItemAssignmentDto = {
  assignedAt: createdAt,
  assignedBy: 'account-creator',
  assigneeId: 'account-owner',
  id: '80000000-0000-0000-0000-000000000008',
  reason: '负责前端实现',
  revision: 1,
  supersededAt: null,
  workItemId,
};

const artifactDto = {
  artifactId,
  content: '# SDD\n\nV0.4',
  createdAt,
  createdBy: 'account-creator',
  mediaType: 'text/markdown',
  requirementId,
  sha256: 'artifact-hash',
  state: 'AVAILABLE',
  trust: 'TRUSTED',
  version: 2,
};

const baselineDto = {
  artifactHash: 'artifact-hash',
  artifactId,
  artifactVersion: '2',
  createdAt,
  createdBy: 'account-creator',
  id: baselineId,
  requirementId,
  requirementVersion: 4,
  routeSnapshotHash: 'route-hash',
  routeSnapshotVersion: 2,
};

const gateDto = {
  artifactHash: 'artifact-hash',
  artifactId,
  artifactVersion: '2',
  createdAt,
  decidedAt: null,
  gateType: 'REQUIREMENT_BASELINE_CONFIRMATION' as const,
  id: gateId,
  policyCode: 'requirement-baseline-default',
  policySnapshotHash: 'policy-hash',
  policyVersion: 1,
  requirementId,
  requirementVersion: 4,
  revision: 2,
  routeSnapshotHash: 'route-hash',
  routeSnapshotVersion: 2,
  sddBaselineId: baselineId,
  state: 'OPEN' as const,
};

const gateAssignmentDto = {
  assignedAt: createdAt,
  currentReviewerId: 'account-reviewer',
  defaultReviewerId: 'account-creator',
  gateInstanceId: gateId,
  id: '90000000-0000-0000-0000-000000000009',
  revision: 2,
  supersededAt: null,
};

const decisionDto = {
  decidedAt: createdAt,
  gateAssignmentId: gateAssignmentDto.id,
  gateInstanceId: gateId,
  id: 'a0000000-0000-0000-0000-00000000000a',
  outcome: 'APPROVED' as const,
  reason: '基线清晰可执行',
  reviewerId: 'account-reviewer',
  subjectRevision: 2,
};

const result = <T>(data: T) => ({
  data,
  response: new Response(null, { status: 200 }),
});

beforeEach(() => {
  apiMock.GET.mockReset();
  apiMock.POST.mockReset();
});

describe('Requirement V0.4 workflow service seam', () => {
  it('读取并安全投影完整 V0.4 当前事实', async () => {
    const signal = new AbortController().signal;
    apiMock.GET.mockResolvedValue({
      data: {
        currentDecision: decisionDto,
        currentGate: gateDto,
        currentGateAssignment: gateAssignmentDto,
        currentSddBaseline: baselineDto,
        requirement: requirementDto,
        workItemAssignments: [workItemAssignmentDto],
        workItems: [workItemDto],
      },
      response: new Response(null, {
        headers: { 'x-request-id': 'request-v04-details' },
        status: 200,
      }),
    });

    await expect(getRequirement(requirementId, signal)).resolves.toMatchObject({
      currentDecision: { outcome: 'APPROVED' },
      currentGate: { id: gateId, state: 'OPEN' },
      currentGateAssignment: { currentReviewerId: 'account-reviewer' },
      currentSddBaseline: { id: baselineId },
      requestId: 'request-v04-details',
      workItemAssignments: [{ assigneeId: 'account-owner' }],
    });
    expect(apiMock.GET).toHaveBeenCalledWith(
      '/api/v1/requirements/{requirementId}',
      { params: { path: { requirementId } }, signal },
    );
  });

  it('增加 WorkItem 使用 Requirement revision 并投影返回事实', async () => {
    apiMock.POST.mockResolvedValue(
      result({
        assignment: workItemAssignmentDto,
        requirement: requirementDto,
        workItem: workItemDto,
      }),
    );

    await expect(
      addWorkItem(requirementId, 'repository-2', 7, 'work-item-add-0001'),
    ).resolves.toMatchObject({
      assignment: { assigneeId: 'account-owner' },
      requirement: { revision: 8, routeSnapshotHash: 'route-hash' },
      workItem: { id: workItemId, revision: 3 },
    });
    expect(apiMock.POST).toHaveBeenCalledWith(
      '/api/v1/requirements/{requirementId}/work-items',
      {
        body: { repositoryId: 'repository-2' },
        params: {
          header: {
            'Idempotency-Key': 'work-item-add-0001',
            'If-Match': '"v7"',
          },
          path: { requirementId },
        },
      },
    );

    apiMock.POST.mockResolvedValue(
      result({
        assignment: null,
        requirement: requirementDto,
        workItem: workItemDto,
      }),
    );
    await expect(
      addWorkItem(requirementId, 'repository-3', 8, 'work-item-add-0002'),
    ).resolves.toMatchObject({ assignment: null });
  });

  it('分配 WorkItem 使用 WorkItem revision', async () => {
    apiMock.POST.mockResolvedValue(
      result({ assignment: workItemAssignmentDto, workItem: workItemDto }),
    );

    await expect(
      assignWorkItem(
        requirementId,
        workItemId,
        { humanOwnerId: 'account-owner', reason: '负责前端实现' },
        2,
        'work-item-assign-0001',
      ),
    ).resolves.toMatchObject({ assignment: { reason: '负责前端实现' } });
    expect(apiMock.POST).toHaveBeenCalledWith(
      '/api/v1/requirements/{requirementId}/work-items/{workItemId}:assign',
      {
        body: { humanOwnerId: 'account-owner', reason: '负责前端实现' },
        params: {
          header: {
            'Idempotency-Key': 'work-item-assign-0001',
            'If-Match': '"v2"',
          },
          path: { requirementId, workItemId },
        },
      },
    );
  });

  it('创建与读取精确 SDD Artifact Version', async () => {
    apiMock.POST.mockResolvedValue(
      result({ artifact: artifactDto, requirement: requirementDto }),
    );

    await expect(
      createSddArtifact(
        requirementId,
        { artifactId, content: '# SDD\n\nV0.4' },
        7,
        'sdd-artifact-0001',
      ),
    ).resolves.toMatchObject({
      artifact: { artifactId, content: '# SDD\n\nV0.4', version: 2 },
      requirement: { revision: 8 },
    });
    expect(apiMock.POST).toHaveBeenCalledWith(
      '/api/v1/requirements/{requirementId}/sdd-artifacts',
      {
        body: { artifactId, content: '# SDD\n\nV0.4' },
        params: {
          header: {
            'Idempotency-Key': 'sdd-artifact-0001',
            'If-Match': '"v7"',
          },
          path: { requirementId },
        },
      },
    );

    const signal = new AbortController().signal;
    apiMock.GET.mockResolvedValue(result(artifactDto));
    await expect(
      getSddArtifactVersion(requirementId, artifactId, 2, signal),
    ).resolves.toMatchObject({ artifactId, version: 2 });
    expect(apiMock.GET).toHaveBeenCalledWith(
      '/api/v1/requirements/{requirementId}/sdd-artifacts/{artifactId}/versions/{artifactVersion}',
      {
        params: {
          path: { artifactId, artifactVersion: 2, requirementId },
        },
        signal,
      },
    );

    await expect(
      getSddArtifactVersion(requirementId, artifactId, 2),
    ).resolves.toMatchObject({ artifactId, version: 2 });
    expect(apiMock.GET).toHaveBeenLastCalledWith(
      '/api/v1/requirements/{requirementId}/sdd-artifacts/{artifactId}/versions/{artifactVersion}',
      {
        params: {
          path: { artifactId, artifactVersion: 2, requirementId },
        },
      },
    );
  });

  it('登记 Baseline 使用创建 Artifact 后的 Requirement revision', async () => {
    apiMock.POST.mockResolvedValue(
      result({ baseline: baselineDto, requirement: requirementDto }),
    );

    await expect(
      registerSddBaseline(
        requirementId,
        { artifactId, artifactVersion: 2 },
        8,
        'sdd-baseline-0001',
      ),
    ).resolves.toMatchObject({ baseline: { id: baselineId } });
    expect(apiMock.POST).toHaveBeenCalledWith(
      '/api/v1/requirements/{requirementId}/sdd-baselines',
      {
        body: { artifactId, artifactVersion: 2 },
        params: {
          header: {
            'Idempotency-Key': 'sdd-baseline-0001',
            'If-Match': '"v8"',
          },
          path: { requirementId },
        },
      },
    );
  });

  it('提交确认使用 Requirement revision 并返回 Gate Assignment', async () => {
    apiMock.POST.mockResolvedValue(
      result({
        assignment: gateAssignmentDto,
        gate: gateDto,
        requirement: requirementDto,
      }),
    );

    await expect(
      submitBaselineConfirmation(
        requirementId,
        baselineId,
        8,
        'baseline-confirm-0001',
      ),
    ).resolves.toMatchObject({
      assignment: { currentReviewerId: 'account-reviewer' },
      gate: { id: gateId },
    });
    expect(apiMock.POST).toHaveBeenCalledWith(
      '/api/v1/requirements/{requirementId}/baseline-confirmations',
      {
        body: { sddBaselineId: baselineId },
        params: {
          header: {
            'Idempotency-Key': 'baseline-confirm-0001',
            'If-Match': '"v8"',
          },
          path: { requirementId },
        },
      },
    );
  });

  it('改派 Gate 使用 Gate revision', async () => {
    apiMock.POST.mockResolvedValue(
      result({ assignment: gateAssignmentDto, gate: gateDto }),
    );

    await reassignBaselineGate(
      requirementId,
      gateId,
      { reason: '交由领域审核人', reviewerId: 'account-reviewer' },
      1,
      'gate-reassign-0001',
    );
    expect(apiMock.POST).toHaveBeenCalledWith(
      '/api/v1/requirements/{requirementId}/baseline-gates/{gateId}:reassign',
      {
        body: {
          reason: '交由领域审核人',
          reviewerId: 'account-reviewer',
        },
        params: {
          header: {
            'Idempotency-Key': 'gate-reassign-0001',
            'If-Match': '"v1"',
          },
          path: { gateId, requirementId },
        },
      },
    );
  });

  it('Decision 使用 Requirement revision 并保留精确 outcome', async () => {
    apiMock.POST.mockResolvedValue(
      result({
        decision: decisionDto,
        gate: gateDto,
        requirement: requirementDto,
      }),
    );

    await expect(
      decideBaseline(
        requirementId,
        { gateId, outcome: 'APPROVED', reason: '基线清晰可执行' },
        8,
        'baseline-decision-0001',
      ),
    ).resolves.toMatchObject({
      decision: { outcome: 'APPROVED', reviewerId: 'account-reviewer' },
    });
    expect(apiMock.POST).toHaveBeenCalledWith(
      '/api/v1/requirements/{requirementId}/baseline-decisions',
      {
        body: {
          gateId,
          outcome: 'APPROVED',
          reason: '基线清晰可执行',
        },
        params: {
          header: {
            'Idempotency-Key': 'baseline-decision-0001',
            'If-Match': '"v8"',
          },
          path: { requirementId },
        },
      },
    );
  });
});
