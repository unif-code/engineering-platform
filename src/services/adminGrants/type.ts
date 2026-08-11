/**
 * V0.2 Task 8 的 mock-only 临时 DTO。
 * 后端只冻结了 Grant 领域 tuple 与资源路径；api-v0.2.0 锁定后由
 * Task 10 的 generated client 类型整体替换本文件，不能视为正式 OpenAPI 契约。
 */
export type GrantScopeType = 'PLATFORM' | 'WORKSPACE';
export type GrantStatus = 'ACTIVE' | 'REVOKED';
export type GrantSource = 'DIRECT';

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

export interface RevokeGrantInput {
  reason: string;
}
