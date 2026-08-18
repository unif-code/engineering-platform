import type {
  AccountCredentialReceipt,
  AccountStatus,
  AccountSummary,
} from '@/features/administration';

export interface UserRow extends AccountSummary {
  lastLogin?: string;
  roles?: readonly string[];
  superior?: string;
  team?: string;
}

export type UserStatus = AccountStatus;
export interface UserFormValues {
  displayName: string;
  employeeNo: string;
  role: string;
  superior: string;
  team: string;
}
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
