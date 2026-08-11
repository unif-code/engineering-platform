import { request } from '@umijs/max';
import { mutationHeaders, normalizeApiError } from '@/services/transport';
import type {
  AccountCredentialReceipt,
  AccountListQuery,
  AccountListResponse,
  AccountReasonInput,
  CreateAccountInput,
} from './type';

const accountPath = (accountId: string, action: string) =>
  `/api/v1/admin/accounts/${encodeURIComponent(accountId)}/${action}`;

async function accountMutation<T>(
  path: string,
  data: CreateAccountInput | AccountReasonInput,
): Promise<T> {
  try {
    return await request<T>(path, {
      data,
      headers: mutationHeaders(),
      method: 'POST',
    });
  } catch (error) {
    throw normalizeApiError(error);
  }
}

export async function listAccounts(
  params: AccountListQuery,
): Promise<AccountListResponse> {
  try {
    return await request<AccountListResponse>('/api/v1/admin/accounts', {
      method: 'GET',
      params,
    });
  } catch (error) {
    throw normalizeApiError(error);
  }
}

export async function createAccount(
  input: CreateAccountInput,
): Promise<AccountCredentialReceipt> {
  return accountMutation('/api/v1/admin/accounts', input);
}

export async function resetAccountPassword(
  accountId: string,
  input: AccountReasonInput,
): Promise<AccountCredentialReceipt> {
  return accountMutation(accountPath(accountId, 'reset-password'), input);
}

export async function enableAccount(
  accountId: string,
  input: AccountReasonInput,
): Promise<void> {
  return accountMutation(accountPath(accountId, 'enable'), input);
}

export async function disableAccount(
  accountId: string,
  input: AccountReasonInput,
): Promise<void> {
  return accountMutation(accountPath(accountId, 'disable'), input);
}

export async function resetAccountTotp(
  accountId: string,
  input: AccountReasonInput,
): Promise<void> {
  return accountMutation(accountPath(accountId, 'totp-reset'), input);
}

export type {
  AccountCredentialReceipt,
  AccountListQuery,
  AccountListResponse,
  AccountReasonInput,
  AccountSortField,
  AccountStatus,
  AccountSummary,
  CreateAccountInput,
} from './type';
