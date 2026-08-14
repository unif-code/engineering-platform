import { api } from '@/services/generated';
import { mutationHeaders, requireApiData } from '@/services/transport';
import type {
  AccountCredentialReceipt,
  AccountListQuery,
  AccountListResponse,
  AccountReasonInput,
  CreateAccountInput,
} from './type';

export async function listAccounts(
  query: AccountListQuery,
): Promise<AccountListResponse> {
  const page = requireApiData(
    await api.GET('/api/v1/admin/accounts', {
      params: {
        query: { cursor: query.cursor, limit: query.pageSize },
      },
    }),
  );
  const employeeNo = query.employeeNo?.trim().toLocaleLowerCase();
  const displayName = query.displayName?.trim().toLocaleLowerCase();
  const profession = query.profession?.trim().toLocaleLowerCase();
  const direction = query.sortOrder === 'desc' ? -1 : 1;
  const items = page.items
    .filter(
      (account) =>
        (!employeeNo ||
          account.employeeNo.toLocaleLowerCase().includes(employeeNo)) &&
        (!displayName ||
          account.displayName.toLocaleLowerCase().includes(displayName)) &&
        (!profession ||
          account.profession?.toLocaleLowerCase().includes(profession)) &&
        (!query.status || account.status === query.status),
    )
    .sort((left, right) => {
      const field = query.sortBy;
      if (field === undefined) {
        return 0;
      }
      return (
        String(left[field] ?? '').localeCompare(String(right[field] ?? '')) *
        direction
      );
    });
  return {
    ...page,
    items,
    total:
      (query.page - 1) * query.pageSize +
      items.length +
      (page.nextCursor ? 1 : 0),
  };
}

export async function createAccount(
  input: CreateAccountInput,
): Promise<AccountCredentialReceipt> {
  return requireApiData(
    await api.POST('/api/v1/admin/accounts', {
      body: input,
      params: { header: mutationHeaders() },
    }),
  );
}

export async function resetAccountPassword(
  accountId: string,
  input: AccountReasonInput,
  etag: string,
): Promise<AccountCredentialReceipt> {
  return requireApiData(
    await api.POST('/api/v1/admin/accounts/{id}/reset-password', {
      body: input,
      params: {
        header: mutationHeaders({ etag }),
        path: { id: accountId },
      },
    }),
  );
}

async function updateAccountState(
  accountId: string,
  input: AccountReasonInput,
  etag: string,
  action: 'disable' | 'enable' | 'totp-reset',
): Promise<void> {
  const options = {
    body: input,
    params: {
      header: mutationHeaders({ etag }),
      path: { id: accountId },
    },
  };
  if (action === 'enable') {
    await api.POST('/api/v1/admin/accounts/{id}/enable', options);
  } else if (action === 'disable') {
    await api.POST('/api/v1/admin/accounts/{id}/disable', options);
  } else {
    await api.POST('/api/v1/admin/accounts/{id}/totp-reset', options);
  }
}

export async function enableAccount(
  accountId: string,
  input: AccountReasonInput,
  etag: string,
): Promise<void> {
  return updateAccountState(accountId, input, etag, 'enable');
}

export async function disableAccount(
  accountId: string,
  input: AccountReasonInput,
  etag: string,
): Promise<void> {
  return updateAccountState(accountId, input, etag, 'disable');
}

export async function resetAccountTotp(
  accountId: string,
  input: AccountReasonInput,
  etag: string,
): Promise<void> {
  return updateAccountState(accountId, input, etag, 'totp-reset');
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
