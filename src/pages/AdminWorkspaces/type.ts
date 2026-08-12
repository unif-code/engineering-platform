import type {
  WorkspaceAccountRef,
  WorkspaceMember,
  WorkspaceStatus,
  WorkspaceSummary,
} from '@/features/administration';

export interface WorkspaceRow extends WorkspaceSummary {
  repositoryCount?: number;
  team?: string;
}

export interface WorkspaceQueryParams {
  current?: number;
  keyword?: string;
  pageSize?: number;
  status?: WorkspaceStatus | 'all';
}

export interface WorkspaceFormValues {
  name: string;
  ownerId: string;
  team: string;
}

export type WorkspaceAction = 'invite' | 'remove' | 'transfer';

export interface WorkspaceActionFormValues {
  accountId?: string;
  reason: string;
}

export interface WorkspaceActionState {
  action: WorkspaceAction;
  leader?: WorkspaceAccountRef;
}

export type WorkspaceMemberRow = WorkspaceMember;
