import type { components } from '@/services/generated';

type Schemas = components['schemas'];
type RequirementDto = Schemas['RequirementResponseDto'];
type WorkItemDto = Schemas['WorkItemResponseDto'];
type RepositoryDto = Schemas['AuthorizedRepositoryResponseDto'];
type GateInstanceDto = Schemas['GateInstanceResponseDto'];

export type RequirementType = RequirementDto['type'];
export type RequirementState = RequirementDto['state'];
export type RequirementRecordState = RequirementDto['recordState'];
export type WorkItemState = WorkItemDto['state'];
export type AssignmentState = WorkItemDto['assignmentState'];
export type ExecutorType = WorkItemDto['executorType'];
export type RepositoryState = WorkItemDto['repositoryState'];
export type RepositoryBlockedReason =
  WorkItemDto['repositoryBlockedReasonCode'];
export type DecisionOutcome = Schemas['DecisionOutcome'];
export type GateState = Schemas['GateState'];

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
  currentSddBaselineId: string | null;
  description: string;
  initialRepositoryId: string;
  recordState: RequirementRecordState;
  requiredWorkItemSetHash: string;
  requiredWorkItemSetVersion: number;
  requirementVersion: number;
  revision: number;
  routeSnapshot: RequirementDto['routeSnapshot'];
  routeSnapshotHash: string;
  routeSnapshotVersion: number;
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
  currentDecision: Decision | null;
  currentGate: GateInstance | null;
  currentGateAssignment: GateAssignment | null;
  currentSddBaseline: SddBaseline | null;
  requestId: string | null;
  requirement: Requirement;
  workItemAssignments: WorkItemAssignment[];
  workItems: WorkItem[];
}

export interface WorkItemAssignment {
  assignedAt: string;
  assignedBy: string;
  assigneeId: string;
  id: string;
  reason: string;
  revision: number;
  supersededAt: string | null;
  workItemId: string;
}

export interface SddArtifactVersion {
  artifactId: string;
  content: string;
  createdAt: string;
  createdBy: string;
  mediaType: string;
  requirementId: string;
  sha256: string;
  state: string;
  trust: string;
  version: number;
}

export interface SddBaseline {
  artifactHash: string;
  artifactId: string;
  artifactVersion: string;
  createdAt: string;
  createdBy: string;
  id: string;
  requirementId: string;
  requirementVersion: number;
  routeSnapshotHash: string;
  routeSnapshotVersion: number;
}

export interface GateInstance {
  artifactHash: string;
  artifactId: string;
  artifactVersion: string;
  createdAt: string;
  decidedAt: string | null;
  gateType: GateInstanceDto['gateType'];
  id: string;
  policyCode: string;
  policySnapshotHash: string;
  policyVersion: number;
  requirementId: string;
  requirementVersion: number;
  revision: number;
  routeSnapshotHash: string;
  routeSnapshotVersion: number;
  sddBaselineId: string;
  state: GateState;
}

export interface GateAssignment {
  assignedAt: string;
  currentReviewerId: string;
  defaultReviewerId: string;
  gateInstanceId: string;
  id: string;
  revision: number;
  supersededAt: string | null;
}

export interface Decision {
  decidedAt: string;
  gateAssignmentId: string;
  gateInstanceId: string;
  id: string;
  outcome: DecisionOutcome;
  reason: string;
  reviewerId: string;
  subjectRevision: number;
}

export type AddWorkItemInput = Schemas['AddWorkItemRequestDto'];
export type AssignWorkItemInput = Schemas['AssignWorkItemRequestDto'];
export type CreateSddArtifactInput = Schemas['CreateSddArtifactRequestDto'];
export type RegisterSddBaselineInput = Schemas['RegisterSddBaselineRequestDto'];
export type ReassignBaselineGateInput =
  Schemas['ReassignBaselineGateRequestDto'];
export type DecideBaselineInput = Schemas['DecideBaselineRequestDto'];

export interface AddWorkItemResult {
  assignment: WorkItemAssignment | null;
  requirement: Requirement;
  workItem: WorkItem;
}

export interface AssignWorkItemResult {
  assignment: WorkItemAssignment;
  workItem: WorkItem;
}

export interface CreateSddArtifactResult {
  artifact: SddArtifactVersion;
  requirement: Requirement;
}

export interface RegisterSddBaselineResult {
  baseline: SddBaseline;
  requirement: Requirement;
}

export interface BaselineConfirmationResult {
  assignment: GateAssignment;
  gate: GateInstance;
  requirement: Requirement;
}

export interface GateReassignmentResult {
  assignment: GateAssignment;
  gate: GateInstance;
}

export interface BaselineDecisionResult {
  decision: Decision;
  gate: GateInstance;
  requirement: Requirement;
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
