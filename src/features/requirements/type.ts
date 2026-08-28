import type { components } from '@/services/generated';

type Schemas = components['schemas'];
type RequirementDto = Schemas['RequirementResponseDto'];
type WorkItemDto = Schemas['WorkItemResponseDto'];
type RepositoryDto = Schemas['AuthorizedRepositoryResponseDto'];

export type RequirementType = RequirementDto['type'];
export type RequirementState = RequirementDto['state'];
export type RequirementRecordState = RequirementDto['recordState'];
export type WorkItemState = WorkItemDto['state'];
export type AssignmentState = WorkItemDto['assignmentState'];
export type ExecutorType = WorkItemDto['executorType'];
export type RepositoryState = WorkItemDto['repositoryState'];
export type RepositoryBlockedReason =
  WorkItemDto['repositoryBlockedReasonCode'];

export interface RequirementSummary {
  id: string;
  state: RequirementState;
  title: string;
  type: RequirementType;
  updatedAt: string;
  workspaceId: string;
}

export interface Requirement extends RequirementSummary {
  acceptanceCriteria: string[];
  createdAt: string;
  createdBy: string;
  description: string;
  initialRepositoryId: string;
  recordState: RequirementRecordState;
  revision: number;
}

export interface WorkItem {
  assignmentState: AssignmentState;
  baseCommitSha: string | null;
  createdAt: string;
  createdBy: string;
  executorId: string | null;
  executorType: ExecutorType;
  humanOwnerId: string | null;
  id: string;
  repositoryBlockedAt: string | null;
  repositoryBlockedReasonCode: RepositoryBlockedReason;
  repositoryId: string;
  repositoryState: RepositoryState;
  requiredCapabilities: string[];
  requirementId: string;
  revision: number;
  state: WorkItemState;
  taskBranch: string | null;
  updatedAt: string;
}

export interface RequirementDetails {
  requestId: string | null;
  requirement: Requirement;
  workItems: WorkItem[];
}

export interface RequirementListQuery {
  cursor?: string;
  limit?: number;
  workspaceId: string;
}

export interface RequirementListPage {
  items: RequirementSummary[];
  nextCursor: string | null;
}

export interface CreateRequirementInput {
  acceptanceCriteria: string[];
  description: string;
  initialRepositoryId: string;
  title: string;
  type: RequirementType;
  workspaceId: string;
}

export interface CreateRequirementResult {
  requirement: Requirement;
  workItem: WorkItem;
}

export interface AuthorizedRepository {
  defaultBranch: RepositoryDto['defaultBranch'];
  projectPath: RepositoryDto['projectPath'];
  provider: RepositoryDto['provider'];
  repositoryId: RepositoryDto['repositoryId'];
}
