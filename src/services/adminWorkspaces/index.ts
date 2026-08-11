import { request } from '@umijs/max';
import { mutationHeaders, normalizeApiError } from '@/services/transport';
import type {
  CreateWorkspaceInput,
  WorkspaceLeaderInput,
  WorkspaceListQuery,
  WorkspaceListResponse,
  WorkspaceMembersResponse,
  WorkspaceReasonInput,
  WorkspaceSummary,
} from './type';

const workspacePath = (workspaceId: string, suffix = '') =>
  `/api/v1/admin/workspaces/${encodeURIComponent(workspaceId)}${suffix}`;

async function workspaceRequest<T>(
  path: string,
  options: {
    data?: CreateWorkspaceInput | WorkspaceLeaderInput | WorkspaceReasonInput;
    method: 'DELETE' | 'POST';
  },
): Promise<T> {
  try {
    return await request<T>(path, {
      ...options,
      headers: mutationHeaders(),
    });
  } catch (error) {
    throw normalizeApiError(error);
  }
}

export async function listWorkspaces(
  query: WorkspaceListQuery,
): Promise<WorkspaceListResponse> {
  try {
    return await request<WorkspaceListResponse>('/api/v1/admin/workspaces', {
      method: 'GET',
      params: query,
    });
  } catch (error) {
    throw normalizeApiError(error);
  }
}

export async function createWorkspace(
  input: CreateWorkspaceInput,
): Promise<WorkspaceSummary> {
  return workspaceRequest('/api/v1/admin/workspaces', {
    data: input,
    method: 'POST',
  });
}

export async function inviteWorkspaceLeader(
  workspaceId: string,
  input: WorkspaceLeaderInput,
): Promise<WorkspaceSummary> {
  return workspaceRequest(workspacePath(workspaceId, '/leaders'), {
    data: input,
    method: 'POST',
  });
}

export async function removeWorkspaceLeader(
  workspaceId: string,
  accountId: string,
  input: WorkspaceReasonInput,
): Promise<WorkspaceSummary> {
  return workspaceRequest(
    workspacePath(workspaceId, `/leaders/${encodeURIComponent(accountId)}`),
    { data: input, method: 'DELETE' },
  );
}

export async function transferWorkspaceOwner(
  workspaceId: string,
  input: WorkspaceLeaderInput,
): Promise<WorkspaceSummary> {
  return workspaceRequest(workspacePath(workspaceId, '/transfer-owner'), {
    data: input,
    method: 'POST',
  });
}

export async function listWorkspaceMembers(
  workspaceId: string,
): Promise<WorkspaceMembersResponse> {
  try {
    return await request<WorkspaceMembersResponse>(
      workspacePath(workspaceId, '/members'),
      { method: 'GET' },
    );
  } catch (error) {
    throw normalizeApiError(error);
  }
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
