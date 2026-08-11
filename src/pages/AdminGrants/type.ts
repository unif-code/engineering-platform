import type {
  CreateGrantInput,
  GrantScopeType,
  GrantSummary,
} from '@/features/administration';

export type GrantRow = GrantSummary;

export interface GrantQueryParams {
  capability?: string | 'all';
  current?: number;
  pageSize?: number;
  principalId?: string | 'all';
}

export interface GrantFormValues {
  capability: string;
  principalId: string;
  reason: string;
  scopeType: GrantScopeType;
  workspaceId?: string;
}

export type GrantSubmitInput = CreateGrantInput;

export interface RevokeGrantFormValues {
  reason: string;
}
