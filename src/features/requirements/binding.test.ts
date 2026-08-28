import { describe, expect, it } from 'vitest';
import {
  resolveRepositoryBinding,
  shouldPollRequirementBindings,
  validateRequirementBindings,
} from './binding';
import type { RequirementDetails, WorkItem } from './type';

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
    requirementId: 'requirement-1',
    revision: 1,
    state: 'DRAFT',
    taskBranch: null,
    updatedAt: '2026-08-28T08:01:00Z',
    ...overrides,
  };
}

function details(item: WorkItem): RequirementDetails {
  return {
    requirement: {
      acceptanceCriteria: ['任务分支必须从精确 SHA 创建'],
      createdAt: '2026-08-28T08:00:00Z',
      createdBy: 'account-1',
      description: '建立确定性任务分支',
      id: 'requirement-1',
      initialRepositoryId: 'repository-1',
      recordState: 'ACTIVE',
      revision: 1,
      state: 'CREATED',
      title: '建立任务分支',
      type: 'feat',
      updatedAt: '2026-08-28T08:01:00Z',
      workspaceId: 'workspace-1',
    },
    workItems: [item],
  };
}

describe('Requirement Branch Binding state machine', () => {
  it('WAITING_REPOSITORY 映射为 PENDING 并继续轮询', () => {
    const item = workItem();

    expect(resolveRepositoryBinding(item)).toEqual({
      kind: 'PENDING',
      label: '等待仓库绑定',
      shouldPoll: true,
    });
    expect(shouldPollRequirementBindings(details(item))).toBe(true);
  });

  it('BOUND 只有同时存在完整 base SHA 与 task branch 才是 READY', () => {
    const item = workItem({
      baseCommitSha: '0123456789abcdef0123456789abcdef01234567',
      repositoryState: 'BOUND',
      taskBranch: 'task/req-requirement-1',
    });

    expect(resolveRepositoryBinding(item)).toEqual({
      baseCommitSha: '0123456789abcdef0123456789abcdef01234567',
      kind: 'READY',
      label: '任务分支已验证',
      shouldPoll: false,
      taskBranch: 'task/req-requirement-1',
    });
    expect(shouldPollRequirementBindings(details(item))).toBe(false);
  });

  it.each([
    { baseCommitSha: null, taskBranch: 'task/req-requirement-1' },
    {
      baseCommitSha: '0123456789abcdef0123456789abcdef01234567',
      taskBranch: null,
    },
    { baseCommitSha: '', taskBranch: 'task/req-requirement-1' },
  ])('BOUND 缺少精确事实时拒绝无效响应：%o', (binding) => {
    expect(() =>
      resolveRepositoryBinding(
        workItem({ repositoryState: 'BOUND', ...binding }),
      ),
    ).toThrowError(
      expect.objectContaining({
        name: 'ApiError',
        problem: expect.objectContaining({ title: 'INVALID_API_RESPONSE' }),
      }),
    );
  });

  it('BLOCKED + RECONCILIATION_PENDING 映射为结果未知并继续对账', () => {
    const item = workItem({
      repositoryBlockedReasonCode: 'RECONCILIATION_PENDING',
      repositoryState: 'BLOCKED',
    });

    expect(resolveRepositoryBinding(item)).toEqual({
      kind: 'RECONCILIATION',
      label: '结果未知，正在对账',
      shouldPoll: true,
    });
    expect(shouldPollRequirementBindings(details(item))).toBe(true);
  });

  it('其他 BLOCKED 原因使用安全白名单文案并停止轮询', () => {
    const item = workItem({
      repositoryBlockedReasonCode: 'ACCESS_DENIED',
      repositoryState: 'BLOCKED',
    });

    expect(resolveRepositoryBinding(item)).toEqual({
      kind: 'BLOCKED',
      label: '仓库访问被拒绝',
      reasonCode: 'ACCESS_DENIED',
      shouldPoll: false,
    });
    expect(shouldPollRequirementBindings(details(item))).toBe(false);
  });

  it('未知未来 BLOCKED reason 只返回通用文案，不透传原始 Provider detail', () => {
    const item = workItem({
      repositoryBlockedReasonCode:
        'FUTURE_PROVIDER_DETAIL' as WorkItem['repositoryBlockedReasonCode'],
      repositoryState: 'BLOCKED',
    });

    expect(resolveRepositoryBinding(item)).toEqual({
      kind: 'BLOCKED',
      label: '仓库绑定已阻塞，请联系平台管理员',
      reasonCode: 'UNKNOWN',
      shouldPoll: false,
    });
  });

  it('详情验证在任何 WorkItem 无效时整体拒绝，不留下部分 READY', () => {
    const invalidDetails = details(
      workItem({ repositoryState: 'BOUND', taskBranch: 'task/partial' }),
    );

    expect(() => validateRequirementBindings(invalidDetails)).toThrowError(
      expect.objectContaining({
        problem: expect.objectContaining({ title: 'INVALID_API_RESPONSE' }),
      }),
    );
  });
});
