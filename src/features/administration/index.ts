// Mock-only 数据缝：V0.2 Task 10 锁定 api-v0.2.0 后，
// 仅替换 '@/services/adminAccounts' 底层为 generated client。

export type {
  AccountCredentialReceipt,
  AccountListQuery,
  AccountListResponse,
  AccountReasonInput,
  AccountSortField,
  AccountStatus,
  AccountSummary,
  CreateAccountInput,
} from '@/services/adminAccounts';
export {
  createAccount,
  disableAccount,
  enableAccount,
  listAccounts,
  resetAccountPassword,
  resetAccountTotp,
} from '@/services/adminAccounts';
