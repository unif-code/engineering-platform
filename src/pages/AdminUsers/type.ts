import type {
  AccountCredentialReceipt,
  AccountStatus,
  AccountSummary,
  CreateAccountInput,
} from '@/features/administration';

export type UserRow = AccountSummary;
export type UserStatus = AccountStatus;
export type UserFormValues = CreateAccountInput;
export type CredentialReceipt = AccountCredentialReceipt;

export interface UserQueryParams {
  current?: number;
  pageSize?: number;
  employeeNo?: string;
  displayName?: string;
  profession?: string | 'all';
  status?: UserStatus | 'all';
}

export type UserAction = 'enable' | 'disable' | 'resetPassword' | 'resetTotp';

export interface UserActionFormValues {
  reason: string;
}
