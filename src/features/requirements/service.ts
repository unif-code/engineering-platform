import { api, type components } from '@/services/generated';
import { mutationHeaders, requireApiData } from '@/services/transport';
import type {
  AuthorizedRepository,
  CreateRequirementInput,
  CreateRequirementResult,
  Requirement,
  RequirementDetails,
  RequirementListPage,
  RequirementListQuery,
  RequirementSummary,
  WorkItem,
} from './type';

type Schemas = components['schemas'];
type RequirementDto = Schemas['RequirementResponseDto'];
type WorkItemDto = Schemas['WorkItemResponseDto'];
type RepositoryDto = Schemas['AuthorizedRepositoryResponseDto'];

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
    description: value.description,
    initialRepositoryId: value.initialRepositoryId,
    recordState: value.recordState,
    revision: value.revision,
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
): Promise<RequirementDetails> {
  const details = requireApiData(
    await api.GET('/api/v1/requirements/{requirementId}', {
      params: { path: { requirementId } },
    }),
  );
  return {
    requirement: projectRequirement(details.requirement),
    workItems: details.workItems.map(projectWorkItem),
  };
}

export async function listAuthorizedRepositories(
  workspaceId: string,
): Promise<AuthorizedRepository[]> {
  const repositories = requireApiData(
    await api.GET('/api/v1/workspaces/{workspaceId}/repositories', {
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
