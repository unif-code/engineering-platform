import type { ProTableProps } from '@ant-design/pro-components';
import {
  type AccountListQuery,
  type AccountSortField,
  listAccounts,
} from '@/features/administration';
import { toUserRow } from './constant';
import type { UserQueryParams, UserRow, UserStatus } from './type';

type UserRequest = NonNullable<
  ProTableProps<UserRow, UserQueryParams>['request']
>;
type UserSort = Parameters<UserRequest>[1];
type UserFilter = Parameters<UserRequest>[2];

const USER_SORTABLE_FIELDS: readonly AccountSortField[] = [
  'employeeNo',
  'displayName',
  'profession',
  'status',
];

const USER_STATUSES: readonly UserStatus[] = [
  'PENDING_INIT',
  'ENABLED',
  'DISABLED',
  'RESTRICTED',
];

const isUserSortableField = (value: string): value is AccountSortField =>
  USER_SORTABLE_FIELDS.includes(value as AccountSortField);

const isUserStatus = (value: string | undefined): value is UserStatus =>
  USER_STATUSES.includes(value as UserStatus);

const trimmed = (value: string | undefined) => {
  const result = value?.trim();
  return result ? result : undefined;
};

const filterValue = (filter: UserFilter, key: string) => {
  const value = filter[key]?.[0];
  return value === undefined || value === null ? undefined : String(value);
};

const positiveInteger = (value: number | undefined, fallback: number) =>
  value !== undefined && Number.isSafeInteger(value) && value > 0
    ? value
    : fallback;

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value);

export function formatAccountError(error: unknown, fallback: string): string {
  if (!isRecord(error)) {
    return error instanceof Error ? error.message : fallback;
  }
  const problem = isRecord(error.problem) ? error.problem : undefined;
  const detail =
    typeof problem?.detail === 'string'
      ? problem.detail
      : error instanceof Error
        ? error.message
        : fallback;
  return typeof error.requestId === 'string'
    ? `${detail}（requestId: ${error.requestId}）`
    : detail;
}

export function toAccountListQuery(
  params: UserQueryParams,
  sort: UserSort = {},
  filter: UserFilter = {},
): AccountListQuery {
  const page = positiveInteger(params.current, 1);
  const pageSize = positiveInteger(params.pageSize, 10);
  const employeeNo = trimmed(params.employeeNo);
  const displayName = trimmed(params.displayName);
  const professionCandidate =
    params.profession === 'all'
      ? undefined
      : (trimmed(params.profession) ?? filterValue(filter, 'profession'));
  const profession =
    professionCandidate === 'all' ? undefined : professionCandidate;
  const statusCandidate =
    params.status === 'all'
      ? undefined
      : (params.status ?? filterValue(filter, 'status'));
  const status = isUserStatus(statusCandidate) ? statusCandidate : undefined;
  const sortEntry = Object.entries(sort).find(
    ([field, order]) =>
      isUserSortableField(field) && (order === 'ascend' || order === 'descend'),
  );

  return {
    page,
    pageSize,
    ...(employeeNo ? { employeeNo } : {}),
    ...(displayName ? { displayName } : {}),
    ...(profession ? { profession } : {}),
    ...(status ? { status } : {}),
    ...(sortEntry
      ? {
          sortBy: sortEntry[0] as AccountSortField,
          sortOrder:
            sortEntry[1] === 'descend' ? ('desc' as const) : ('asc' as const),
        }
      : {}),
  };
}

export const queryUserRows: UserRequest = async (params, sort, filter) => {
  const page = await listAccounts(toAccountListQuery(params, sort, filter));
  return {
    data: page.items.map(toUserRow),
    success: true,
    total: page.total,
  };
};
