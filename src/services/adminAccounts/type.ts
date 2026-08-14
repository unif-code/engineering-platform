import type { components } from '@/services/generated';

type Schemas = components['schemas'];

export type AccountStatus = Schemas['AccountStatus'];
export type AccountSummary = Schemas['AccountSummaryResponseDto'];
export type CreateAccountInput = Schemas['CreateAccountRequestDto'];
export type AccountReasonInput = Schemas['AccountReasonRequestDto'];
export type AccountCredentialReceipt = Schemas['AccountCredentialReceiptDto'];

export type AccountSortField =
  | 'employeeNo'
  | 'displayName'
  | 'profession'
  | 'status';

/** ProTable 的应用层查询；V0.2 服务端目前只接收 cursor/limit。 */
export interface AccountListQuery {
  cursor?: string;
  page: number;
  pageSize: number;
  employeeNo?: string;
  displayName?: string;
  profession?: string;
  status?: AccountStatus;
  sortBy?: AccountSortField;
  sortOrder?: 'asc' | 'desc';
}

export type AccountListResponse = Schemas['AccountListResponseDto'] & {
  total: number;
};
