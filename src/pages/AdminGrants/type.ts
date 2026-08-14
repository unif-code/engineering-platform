import type {
  CreateGrantInput,
  GrantScopeType,
  GrantSummary,
} from '@/features/administration';

export type GrantPrincipalType = 'ACCOUNT' | 'ROLE' | 'SERVICE_ACCOUNT';
export type GrantValidity = 'LONG_TERM' | 'TEMPORARY_30' | 'TEMPORARY_90';
export type GrantFormScopeType = GrantScopeType | 'DEPARTMENT';
export type GrantRisk = 'HIGH' | 'NORMAL';
export type GrantViewSource = 'DIRECT' | 'INHERITED';

export interface GrantRow extends Omit<GrantSummary, 'principal' | 'source'> {
  grantedBy: string;
  principal: GrantSummary['principal'] & { type: GrantPrincipalType };
  risk: GrantRisk;
  source: GrantViewSource;
}
export type GrantViewFilter = 'all' | 'high-risk' | 'temporary';

export interface GrantQueryParams {
  current?: number;
  filter?: GrantViewFilter;
  pageSize?: number;
}

export interface GrantFormValues {
  capability: string;
  principalId: string;
  principalType: GrantPrincipalType;
  reason: string;
  scopeId: string;
  validity: GrantValidity;
}

export interface GrantPrincipalOption {
  label: string;
  type: GrantPrincipalType;
  value: string;
}

export interface GrantScopeOption {
  label: string;
  type: GrantFormScopeType;
  value: string;
}

export type GrantSubmitInput = CreateGrantInput;

export interface RevokeGrantFormValues {
  reason: string;
}
