import type { components } from '@/services/generated';

export type GrantScopeType = components['schemas']['ScopeType'];
export type GrantStatus = components['schemas']['GrantStatus'];
export type GrantSource = string;

export interface GrantPrincipalRef {
  displayName: string;
  employeeNo: string;
  id: string;
}

export interface GrantScopeSummary {
  id: string | null;
  label: string;
  type: GrantScopeType;
}

export interface GrantSummary {
  capability: string;
  id: string;
  principal: GrantPrincipalRef;
  scope: GrantScopeSummary;
  source: GrantSource;
  status: GrantStatus;
  validFrom: string | null;
  validTo: string | null;
  version: number;
}

export interface GrantListQuery {
  capability?: string;
  page: number;
  pageSize: number;
  principalId?: string;
}

export interface GrantListResponse {
  items: GrantSummary[];
  total: number;
}

export interface CreateGrantInput {
  capability: string;
  principalId: string;
  reason: string;
  scope: {
    id?: string;
    type: GrantScopeType;
  };
}

export type RevokeGrantInput = components['schemas']['GrantRevokeRequestDto'];
