import type { components } from '@/services/generated';

export type WorkspaceStatus = 'ACTIVE' | 'ARCHIVED';
export type WorkspaceMemberSource = 'OWNER' | 'LEADER' | 'DIRECT_REPORT';

export interface WorkspaceAccountRef {
  displayName: string;
  employeeNo: string;
  id: string;
}

export interface WorkspaceSummary {
  id: string;
  leaders: WorkspaceAccountRef[];
  memberCount?: number;
  name: string;
  owner: WorkspaceAccountRef;
  status: WorkspaceStatus;
  version: number;
}

export interface WorkspaceListQuery {
  keyword?: string;
  page: number;
  pageSize: number;
  status?: WorkspaceStatus;
}

export interface WorkspaceListResponse {
  items: WorkspaceSummary[];
  total: number;
}

export type CreateWorkspaceInput =
  components['schemas']['CreateWorkspaceRequestDto'];

export interface WorkspaceLeaderInput {
  accountId: string;
  reason: string;
}

export type WorkspaceReasonInput =
  components['schemas']['RemoveLeaderRequestDto'];

export interface WorkspaceMember {
  accountId: string;
  displayName: string;
  employeeNo: string;
  source: WorkspaceMemberSource;
}

export interface WorkspaceMembersResponse {
  items: WorkspaceMember[];
}
