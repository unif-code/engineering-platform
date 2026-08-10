export interface WorkspaceRow {
  id: string;
  name: string;
  owner: string;
  memberCount: number;
  repositoryCount: number;
  status: 'active' | 'restricted';
  updatedAt: string;
}

export type WorkspaceStatus = WorkspaceRow['status'];

export interface WorkspaceQueryParams {
  current?: number;
  pageSize?: number;
  keyword?: string;
  status?: WorkspaceStatus | 'all';
}

export interface WorkspaceFormValues {
  name: string;
  owner: string;
  defaultTeam: string;
  description: string;
}
