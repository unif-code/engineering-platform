/**
 * V0.2 Task 6 的 mock-only 临时 DTO。
 * api-v0.2.0 锁定后由 Task 10 的 generated client 类型整体替换。
 */
export type AccountStatus =
  | 'PENDING_INIT'
  | 'ENABLED'
  | 'DISABLED'
  | 'RESTRICTED';

export interface AccountSummary {
  id: string;
  employeeNo: string;
  displayName: string;
  profession: string | null;
  status: AccountStatus;
}

export type AccountSortField =
  | 'employeeNo'
  | 'displayName'
  | 'profession'
  | 'status';

export interface AccountListQuery {
  page: number;
  pageSize: number;
  employeeNo?: string;
  displayName?: string;
  profession?: string;
  status?: AccountStatus;
  sortBy?: AccountSortField;
  sortOrder?: 'asc' | 'desc';
}

export interface AccountListResponse {
  items: AccountSummary[];
  total: number;
}

export interface CreateAccountInput {
  employeeNo: string;
  displayName: string;
  profession?: string;
  reason: string;
}

export interface AccountReasonInput {
  reason: string;
}

export interface AccountCredentialReceipt {
  account: AccountSummary;
  temporaryPassword: string;
}
