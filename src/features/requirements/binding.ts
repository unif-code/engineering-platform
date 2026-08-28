import { ApiError } from '@/services/transport';
import type {
  RepositoryBlockedReason,
  RequirementDetails,
  WorkItem,
} from './type';

export const REQUIREMENT_POLL_INTERVAL_MS = 3_000;

export type RepositoryBindingView =
  | {
      kind: 'PENDING';
      label: string;
      shouldPoll: true;
    }
  | {
      baseCommitSha: string;
      kind: 'READY';
      label: string;
      shouldPoll: false;
      taskBranch: string;
    }
  | {
      kind: 'RECONCILIATION';
      label: string;
      shouldPoll: true;
    }
  | {
      kind: 'BLOCKED';
      label: string;
      reasonCode: RepositoryBlockedReason | 'UNKNOWN';
      shouldPoll: false;
    };

const BLOCKED_REASON_LABELS: Partial<
  Record<Exclude<RepositoryBlockedReason, null>, string>
> = {
  ACCESS_DENIED: '仓库访问被拒绝',
  BINDING_CONFLICT: '仓库绑定存在冲突',
  CONNECTOR_UNAVAILABLE: '源代码连接器暂时不可用',
  OWNER_INELIGIBLE: '负责人当前不具备执行资格',
  OWNER_UNASSIGNED: 'WorkItem 尚未分配负责人',
  POLICY_DENIED: '策略不允许创建任务分支',
  REPOSITORY_NOT_AUTHORIZED: '仓库未获当前 Workspace 授权',
  REPOSITORY_NOT_FOUND: '未找到授权仓库',
};

function invalidBinding(workItem: WorkItem): never {
  throw new ApiError({
    detail: `WorkItem ${workItem.id} 的 BOUND 状态缺少精确 base commit 或 task branch`,
    status: 200,
    title: 'INVALID_API_RESPONSE',
  });
}

export function resolveRepositoryBinding(
  workItem: WorkItem,
): RepositoryBindingView {
  if (workItem.repositoryState === 'WAITING_REPOSITORY') {
    return {
      kind: 'PENDING',
      label: '等待仓库绑定',
      shouldPoll: true,
    };
  }
  if (workItem.repositoryState === 'BOUND') {
    if (!workItem.baseCommitSha?.trim() || !workItem.taskBranch?.trim()) {
      return invalidBinding(workItem);
    }
    return {
      baseCommitSha: workItem.baseCommitSha,
      kind: 'READY',
      label: '任务分支已验证',
      shouldPoll: false,
      taskBranch: workItem.taskBranch,
    };
  }
  if (workItem.repositoryState === 'BLOCKED') {
    if (workItem.repositoryBlockedReasonCode === 'RECONCILIATION_PENDING') {
      return {
        kind: 'RECONCILIATION',
        label: '结果未知，正在对账',
        shouldPoll: true,
      };
    }
    const reasonCode = workItem.repositoryBlockedReasonCode;
    const label = reasonCode ? BLOCKED_REASON_LABELS[reasonCode] : undefined;
    return {
      kind: 'BLOCKED',
      label: label ?? '仓库绑定已阻塞，请联系平台管理员',
      reasonCode: label && reasonCode ? reasonCode : 'UNKNOWN',
      shouldPoll: false,
    };
  }
  throw new ApiError({
    detail: `WorkItem ${workItem.id} 返回未知 Repository state`,
    status: 200,
    title: 'INVALID_API_RESPONSE',
  });
}

export function validateRequirementBindings(
  details: RequirementDetails,
): RequirementDetails {
  for (const workItem of details.workItems) {
    resolveRepositoryBinding(workItem);
  }
  return details;
}

export function shouldPollRequirementBindings(
  details: RequirementDetails,
): boolean {
  return details.workItems.some(
    (workItem) => resolveRepositoryBinding(workItem).shouldPoll,
  );
}
