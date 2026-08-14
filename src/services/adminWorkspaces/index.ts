import { api, type components } from '@/services/generated';
import {
  entityTag,
  mutationHeaders,
  requireApiData,
} from '@/services/transport';
import type {
  CreateWorkspaceInput,
  WorkspaceLeaderInput,
  WorkspaceListQuery,
  WorkspaceListResponse,
  WorkspaceMember,
  WorkspaceMemberSource,
  WorkspaceMembersResponse,
  WorkspaceReasonInput,
  WorkspaceSummary,
} from './type';

const accountRef = (id: string) => ({
  displayName: id,
  employeeNo: id,
  id,
});

const toWorkspaceSummary = (
  item: components['schemas']['WorkspaceResponseDto'],
): WorkspaceSummary => ({
  id: item.id,
  leaders: [],
  memberCount: 0,
  name: item.name,
  owner: accountRef(item.ownerId),
  status: item.archivedAt ? 'ARCHIVED' : 'ACTIVE',
  version: item.version,
});

export async function listWorkspaces(
  query: WorkspaceListQuery,
): Promise<WorkspaceListResponse> {
  const response = requireApiData(await api.GET('/api/v1/admin/workspaces'));
  const keyword = query.keyword?.trim().toLocaleLowerCase();
  const items = response.items
    .map(toWorkspaceSummary)
    .filter(
      (item) =>
        (!keyword || item.name.toLocaleLowerCase().includes(keyword)) &&
        (!query.status || item.status === query.status),
    );
  return { items, total: items.length };
}

export async function createWorkspace(
  input: CreateWorkspaceInput,
): Promise<WorkspaceSummary> {
  return toWorkspaceSummary(
    requireApiData(
      await api.POST('/api/v1/admin/workspaces', {
        body: input,
        params: { header: mutationHeaders() },
      }),
    ),
  );
}

export async function inviteWorkspaceLeader(
  workspaceId: string,
  input: WorkspaceLeaderInput,
  version: number,
): Promise<WorkspaceSummary> {
  return toWorkspaceSummary(
    requireApiData(
      await api.POST('/api/v1/admin/workspaces/{id}/leaders', {
        body: input,
        params: {
          header: mutationHeaders({ etag: entityTag(version) }),
          path: { id: workspaceId },
        },
      }),
    ),
  );
}

export async function removeWorkspaceLeader(
  workspaceId: string,
  accountId: string,
  input: WorkspaceReasonInput,
  version: number,
): Promise<WorkspaceSummary> {
  return toWorkspaceSummary(
    requireApiData(
      await api.DELETE('/api/v1/admin/workspaces/{id}/leaders/{accountId}', {
        body: input,
        params: {
          header: mutationHeaders({ etag: entityTag(version) }),
          path: { accountId, id: workspaceId },
        },
      }),
    ),
  );
}

export async function transferWorkspaceOwner(
  workspaceId: string,
  input: WorkspaceLeaderInput,
  version: number,
): Promise<WorkspaceSummary> {
  return toWorkspaceSummary(
    requireApiData(
      await api.POST('/api/v1/admin/workspaces/{id}/transfer-owner', {
        body: { newOwnerId: input.accountId, reason: input.reason },
        params: {
          header: mutationHeaders({ etag: entityTag(version) }),
          path: { id: workspaceId },
        },
      }),
    ),
  );
}

export async function listWorkspaceMembers(
  workspaceId: string,
): Promise<WorkspaceMembersResponse> {
  const response = requireApiData(
    await api.GET('/api/v1/admin/workspaces/{id}/members', {
      params: { path: { id: workspaceId } },
    }),
  );
  return {
    items: response.items.map(
      (item): WorkspaceMember => ({
        accountId: item.accountId,
        displayName: item.accountId,
        employeeNo: item.accountId,
        source: item.source as WorkspaceMemberSource,
      }),
    ),
  };
}

export type {
  CreateWorkspaceInput,
  WorkspaceAccountRef,
  WorkspaceLeaderInput,
  WorkspaceListQuery,
  WorkspaceListResponse,
  WorkspaceMember,
  WorkspaceMemberSource,
  WorkspaceMembersResponse,
  WorkspaceReasonInput,
  WorkspaceStatus,
  WorkspaceSummary,
} from './type';
