import { api, type components } from '@/services/generated';
import {
  entityTag,
  mutationHeaders,
  requireApiData,
} from '@/services/transport';
import type {
  AddWorkItemResult,
  AssignWorkItemInput,
  AssignWorkItemResult,
  AuthorizedRepository,
  BaselineConfirmationResult,
  BaselineDecisionResult,
  CreateRequirementInput,
  CreateRequirementResult,
  CreateSddArtifactInput,
  CreateSddArtifactResult,
  DecideBaselineInput,
  Decision,
  GateAssignment,
  GateInstance,
  GateReassignmentResult,
  ReassignBaselineGateInput,
  RegisterSddBaselineInput,
  RegisterSddBaselineResult,
  Requirement,
  RequirementDetails,
  RequirementListPage,
  RequirementListQuery,
  RequirementSummary,
  SddArtifactVersion,
  SddBaseline,
  WorkItem,
  WorkItemAssignment,
} from './type';

type Schemas = components['schemas'];
type RequirementDto = Schemas['RequirementResponseDto'];
type WorkItemDto = Schemas['WorkItemResponseDto'];
type RepositoryDto = Schemas['AuthorizedRepositoryResponseDto'];
type WorkItemAssignmentDto = Schemas['WorkItemAssignmentResponseDto'];
type SddArtifactVersionDto = Schemas['SddArtifactVersionResponseDto'];
type SddBaselineDto = Schemas['SddBaselineResponseDto'];
type GateInstanceDto = Schemas['GateInstanceResponseDto'];
type GateAssignmentDto = Schemas['GateAssignmentResponseDto'];
type DecisionDto = Schemas['DecisionResponseDto'];

function projectRequirementSummary(value: RequirementDto): RequirementSummary {
  return {
    id: value.id,
    state: value.state,
    title: value.title,
    type: value.type,
    updatedAt: value.updatedAt,
    workspaceId: value.workspaceId,
  };
}

function projectRequirement(value: RequirementDto): Requirement {
  return {
    ...projectRequirementSummary(value),
    acceptanceCriteria: value.acceptanceCriteria,
    createdAt: value.createdAt,
    createdBy: value.createdBy,
    currentSddBaselineId: value.currentSddBaselineId,
    description: value.description,
    initialRepositoryId: value.initialRepositoryId,
    recordState: value.recordState,
    requiredWorkItemSetHash: value.requiredWorkItemSetHash,
    requiredWorkItemSetVersion: value.requiredWorkItemSetVersion,
    requirementVersion: value.requirementVersion,
    revision: value.revision,
    routeSnapshot: value.routeSnapshot,
    routeSnapshotHash: value.routeSnapshotHash,
    routeSnapshotVersion: value.routeSnapshotVersion,
  };
}

function projectWorkItem(value: WorkItemDto): WorkItem {
  return {
    assignmentState: value.assignmentState,
    baseCommitSha: value.baseCommitSha,
    createdAt: value.createdAt,
    createdBy: value.createdBy,
    executorId: value.executorId,
    executorType: value.executorType,
    humanOwnerId: value.humanOwnerId,
    id: value.id,
    repositoryBlockedAt: value.repositoryBlockedAt,
    repositoryBlockedReasonCode: value.repositoryBlockedReasonCode,
    repositoryId: value.repositoryId,
    repositoryState: value.repositoryState,
    requiredCapabilities: value.requiredCapabilities,
    requirementId: value.requirementId,
    revision: value.revision,
    state: value.state,
    taskBranch: value.taskBranch,
    updatedAt: value.updatedAt,
  };
}

function projectRepository(value: RepositoryDto): AuthorizedRepository {
  return {
    defaultBranch: value.defaultBranch,
    projectPath: value.projectPath,
    provider: value.provider,
    repositoryId: value.repositoryId,
  };
}

function projectWorkItemAssignment(
  value: WorkItemAssignmentDto,
): WorkItemAssignment {
  return {
    assignedAt: value.assignedAt,
    assignedBy: value.assignedBy,
    assigneeId: value.assigneeId,
    id: value.id,
    reason: value.reason,
    revision: value.revision,
    supersededAt: value.supersededAt,
    workItemId: value.workItemId,
  };
}

function projectSddArtifactVersion(
  value: SddArtifactVersionDto,
): SddArtifactVersion {
  return {
    artifactId: value.artifactId,
    content: value.content,
    createdAt: value.createdAt,
    createdBy: value.createdBy,
    mediaType: value.mediaType,
    requirementId: value.requirementId,
    sha256: value.sha256,
    state: value.state,
    trust: value.trust,
    version: value.version,
  };
}

function projectSddBaseline(value: SddBaselineDto): SddBaseline {
  return {
    artifactHash: value.artifactHash,
    artifactId: value.artifactId,
    artifactVersion: value.artifactVersion,
    createdAt: value.createdAt,
    createdBy: value.createdBy,
    id: value.id,
    requirementId: value.requirementId,
    requirementVersion: value.requirementVersion,
    routeSnapshotHash: value.routeSnapshotHash,
    routeSnapshotVersion: value.routeSnapshotVersion,
  };
}

function projectGateInstance(value: GateInstanceDto): GateInstance {
  return {
    artifactHash: value.artifactHash,
    artifactId: value.artifactId,
    artifactVersion: value.artifactVersion,
    createdAt: value.createdAt,
    decidedAt: value.decidedAt,
    gateType: value.gateType,
    id: value.id,
    policyCode: value.policyCode,
    policySnapshotHash: value.policySnapshotHash,
    policyVersion: value.policyVersion,
    requirementId: value.requirementId,
    requirementVersion: value.requirementVersion,
    revision: value.revision,
    routeSnapshotHash: value.routeSnapshotHash,
    routeSnapshotVersion: value.routeSnapshotVersion,
    sddBaselineId: value.sddBaselineId,
    state: value.state,
  };
}

function projectGateAssignment(value: GateAssignmentDto): GateAssignment {
  return {
    assignedAt: value.assignedAt,
    currentReviewerId: value.currentReviewerId,
    defaultReviewerId: value.defaultReviewerId,
    gateInstanceId: value.gateInstanceId,
    id: value.id,
    revision: value.revision,
    supersededAt: value.supersededAt,
  };
}

function projectDecision(value: DecisionDto): Decision {
  return {
    decidedAt: value.decidedAt,
    gateAssignmentId: value.gateAssignmentId,
    gateInstanceId: value.gateInstanceId,
    id: value.id,
    outcome: value.outcome,
    reason: value.reason,
    reviewerId: value.reviewerId,
    subjectRevision: value.subjectRevision,
  };
}

export async function listRequirements(
  query: RequirementListQuery,
): Promise<RequirementListPage> {
  const page = requireApiData(
    await api.GET('/api/v1/requirements', {
      params: { query },
    }),
  );
  return {
    items: page.items.map(projectRequirementSummary),
    nextCursor: page.nextCursor,
  };
}

export async function getRequirement(
  requirementId: string,
  signal?: AbortSignal,
): Promise<RequirementDetails> {
  const result = await api.GET('/api/v1/requirements/{requirementId}', {
    ...(signal === undefined ? {} : { signal }),
    params: { path: { requirementId } },
  });
  const details = requireApiData(result);
  return {
    currentDecision:
      details.currentDecision === null
        ? null
        : projectDecision(details.currentDecision),
    currentGate:
      details.currentGate === null
        ? null
        : projectGateInstance(details.currentGate),
    currentGateAssignment:
      details.currentGateAssignment === null
        ? null
        : projectGateAssignment(details.currentGateAssignment),
    currentSddBaseline:
      details.currentSddBaseline === null
        ? null
        : projectSddBaseline(details.currentSddBaseline),
    requestId: result.response.headers.get('x-request-id'),
    requirement: projectRequirement(details.requirement),
    workItemAssignments: details.workItemAssignments.map(
      projectWorkItemAssignment,
    ),
    workItems: details.workItems.map(projectWorkItem),
  };
}

export async function listAuthorizedRepositories(
  workspaceId: string,
  signal?: AbortSignal,
): Promise<AuthorizedRepository[]> {
  const repositories = requireApiData(
    await api.GET('/api/v1/workspaces/{workspaceId}/repositories', {
      ...(signal === undefined ? {} : { signal }),
      params: { path: { workspaceId } },
    }),
  );
  return repositories.items.map(projectRepository);
}

export async function createRequirement(
  input: CreateRequirementInput,
  idempotencyKey: string,
): Promise<CreateRequirementResult> {
  const created = requireApiData(
    await api.POST('/api/v1/requirements', {
      body: input,
      params: {
        header: mutationHeaders({ idempotencyKey }),
      },
    }),
  );
  return {
    requirement: projectRequirement(created.requirement),
    workItem: projectWorkItem(created.workItem),
  };
}

export async function addWorkItem(
  requirementId: string,
  repositoryId: string,
  requirementRevision: number,
  idempotencyKey: string,
): Promise<AddWorkItemResult> {
  const created = requireApiData(
    await api.POST('/api/v1/requirements/{requirementId}/work-items', {
      body: { repositoryId },
      params: {
        header: mutationHeaders({
          etag: entityTag(requirementRevision),
          idempotencyKey,
        }),
        path: { requirementId },
      },
    }),
  );
  return {
    assignment:
      created.assignment === null
        ? null
        : projectWorkItemAssignment(created.assignment),
    requirement: projectRequirement(created.requirement),
    workItem: projectWorkItem(created.workItem),
  };
}

export async function assignWorkItem(
  requirementId: string,
  workItemId: string,
  input: AssignWorkItemInput,
  workItemRevision: number,
  idempotencyKey: string,
): Promise<AssignWorkItemResult> {
  const assigned = requireApiData(
    await api.POST(
      '/api/v1/requirements/{requirementId}/work-items/{workItemId}:assign',
      {
        body: input,
        params: {
          header: mutationHeaders({
            etag: entityTag(workItemRevision),
            idempotencyKey,
          }),
          path: { requirementId, workItemId },
        },
      },
    ),
  );
  return {
    assignment: projectWorkItemAssignment(assigned.assignment),
    workItem: projectWorkItem(assigned.workItem),
  };
}

export async function createSddArtifact(
  requirementId: string,
  input: CreateSddArtifactInput,
  requirementRevision: number,
  idempotencyKey: string,
): Promise<CreateSddArtifactResult> {
  const created = requireApiData(
    await api.POST('/api/v1/requirements/{requirementId}/sdd-artifacts', {
      body: input,
      params: {
        header: mutationHeaders({
          etag: entityTag(requirementRevision),
          idempotencyKey,
        }),
        path: { requirementId },
      },
    }),
  );
  return {
    artifact: projectSddArtifactVersion(created.artifact),
    requirement: projectRequirement(created.requirement),
  };
}

export async function getSddArtifactVersion(
  requirementId: string,
  artifactId: string,
  artifactVersion: number,
  signal?: AbortSignal,
): Promise<SddArtifactVersion> {
  return projectSddArtifactVersion(
    requireApiData(
      await api.GET(
        '/api/v1/requirements/{requirementId}/sdd-artifacts/{artifactId}/versions/{artifactVersion}',
        {
          ...(signal === undefined ? {} : { signal }),
          params: {
            path: { artifactId, artifactVersion, requirementId },
          },
        },
      ),
    ),
  );
}

export async function registerSddBaseline(
  requirementId: string,
  input: RegisterSddBaselineInput,
  requirementRevision: number,
  idempotencyKey: string,
): Promise<RegisterSddBaselineResult> {
  const registered = requireApiData(
    await api.POST('/api/v1/requirements/{requirementId}/sdd-baselines', {
      body: input,
      params: {
        header: mutationHeaders({
          etag: entityTag(requirementRevision),
          idempotencyKey,
        }),
        path: { requirementId },
      },
    }),
  );
  return {
    baseline: projectSddBaseline(registered.baseline),
    requirement: projectRequirement(registered.requirement),
  };
}

export async function submitBaselineConfirmation(
  requirementId: string,
  sddBaselineId: string,
  requirementRevision: number,
  idempotencyKey: string,
): Promise<BaselineConfirmationResult> {
  const submitted = requireApiData(
    await api.POST(
      '/api/v1/requirements/{requirementId}/baseline-confirmations',
      {
        body: { sddBaselineId },
        params: {
          header: mutationHeaders({
            etag: entityTag(requirementRevision),
            idempotencyKey,
          }),
          path: { requirementId },
        },
      },
    ),
  );
  return {
    assignment: projectGateAssignment(submitted.assignment),
    gate: projectGateInstance(submitted.gate),
    requirement: projectRequirement(submitted.requirement),
  };
}

export async function reassignBaselineGate(
  requirementId: string,
  gateId: string,
  input: ReassignBaselineGateInput,
  gateRevision: number,
  idempotencyKey: string,
): Promise<GateReassignmentResult> {
  const reassigned = requireApiData(
    await api.POST(
      '/api/v1/requirements/{requirementId}/baseline-gates/{gateId}:reassign',
      {
        body: input,
        params: {
          header: mutationHeaders({
            etag: entityTag(gateRevision),
            idempotencyKey,
          }),
          path: { gateId, requirementId },
        },
      },
    ),
  );
  return {
    assignment: projectGateAssignment(reassigned.assignment),
    gate: projectGateInstance(reassigned.gate),
  };
}

export async function decideBaseline(
  requirementId: string,
  input: DecideBaselineInput,
  requirementRevision: number,
  idempotencyKey: string,
): Promise<BaselineDecisionResult> {
  const decided = requireApiData(
    await api.POST('/api/v1/requirements/{requirementId}/baseline-decisions', {
      body: input,
      params: {
        header: mutationHeaders({
          etag: entityTag(requirementRevision),
          idempotencyKey,
        }),
        path: { requirementId },
      },
    }),
  );
  return {
    decision: projectDecision(decided.decision),
    gate: projectGateInstance(decided.gate),
    requirement: projectRequirement(decided.requirement),
  };
}
