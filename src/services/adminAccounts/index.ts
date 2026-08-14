import { api } from '@/services/generated';
import { mutationHeaders, requireApiData } from '@/services/transport';
import type {
  AccountCredentialReceipt,
  AccountListQuery,
  AccountListResponse,
  AccountReasonInput,
  CreateAccountInput,
} from './type';

const ACCOUNT_CURSOR_LIMIT = 100;

export async function listAccounts(
  query: AccountListQuery,
): Promise<AccountListResponse> {
  // V0.2 尚未提供筛选与排序参数；必须先遍历完整 cursor 集合，才能保持现有列表语义。
  const accounts: AccountListResponse['items'] = [];
  const seenCursors = new Set<string>();
  let cursor = query.cursor;
  while (true) {
    if (cursor !== undefined) {
      if (seenCursors.has(cursor)) {
        throw new Error('账号列表返回了重复 cursor，已停止继续分页');
      }
      seenCursors.add(cursor);
    }
    const page = requireApiData(
      await api.GET('/api/v1/admin/accounts', {
        params: {
          query: { cursor, limit: ACCOUNT_CURSOR_LIMIT },
        },
      }),
    );
    accounts.push(...page.items);
    cursor = page.nextCursor ?? undefined;
    if (cursor === undefined) {
      break;
    }
  }
  const employeeNo = query.employeeNo?.trim().toLocaleLowerCase();
  const displayName = query.displayName?.trim().toLocaleLowerCase();
  const profession = query.profession?.trim().toLocaleLowerCase();
  const direction = query.sortOrder === 'desc' ? -1 : 1;
  const matchingItems = accounts
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
  const offset = (query.page - 1) * query.pageSize;
  return {
    items: matchingItems.slice(offset, offset + query.pageSize),
    total: matchingItems.length,
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
