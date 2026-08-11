/**
 * V0.2 Task 7 的 mock-only 临时 DTO。
 * api-v0.2.0 锁定后由 Task 10 的 generated client 类型整体替换。
 */
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
  memberCount: number;
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

export interface CreateWorkspaceInput {
  name: string;
  ownerId: string;
  reason: string;
}

export interface WorkspaceLeaderInput {
  accountId: string;
  reason: string;
}

export interface WorkspaceReasonInput {
  reason: string;
}

export interface WorkspaceMember {
  accountId: string;
  displayName: string;
  employeeNo: string;
  source: WorkspaceMemberSource;
}

export interface WorkspaceMembersResponse {
  items: WorkspaceMember[];
}
