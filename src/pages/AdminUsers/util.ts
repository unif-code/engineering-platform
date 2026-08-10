import type { ProTableProps } from '@ant-design/pro-components';
import { USER_ROWS } from './constant';
import type { UserQueryParams, UserRow } from './type';

type UserRequest = NonNullable<
  ProTableProps<UserRow, UserQueryParams>['request']
>;
type UserSort = Parameters<UserRequest>[1];
type UserFilter = Parameters<UserRequest>[2];
type UserSortableField =
  | 'employeeId'
  | 'name'
  | 'email'
  | 'status'
  | 'lastActiveAt';

const USER_SORTABLE_FIELDS: readonly UserSortableField[] = [
  'employeeId',
  'name',
  'email',
  'status',
  'lastActiveAt',
];

function isUserSortableField(value: string): value is UserSortableField {
  return USER_SORTABLE_FIELDS.includes(value as UserSortableField);
}

export function selectUserRows(
  params: UserQueryParams,
  sort: UserSort = {},
  filter: UserFilter = {},
): UserRow[] {
  const keyword = params.keyword?.trim().toLocaleLowerCase();
  const statuses =
    params.status === 'all'
      ? undefined
      : params.status
        ? [params.status]
        : filter.status?.map(String);
  const roleFilter = filter.role ?? filter.roles;
  const roles =
    params.role === 'all'
      ? undefined
      : params.role
        ? [params.role]
        : roleFilter?.map(String);

  const rows = USER_ROWS.filter((row) => {
    const matchesKeyword =
      !keyword ||
      [row.employeeId, row.name, row.email, ...row.roles].some((value) =>
        value.toLocaleLowerCase().includes(keyword),
      );
    const matchesStatus = !statuses?.length || statuses.includes(row.status);
    const matchesRole =
      !roles?.length || roles.some((role) => row.roles.includes(role));

    return matchesKeyword && matchesStatus && matchesRole;
  });

  const sortEntry = Object.entries(sort).find(
    ([, order]) => order === 'ascend' || order === 'descend',
  );

  if (!sortEntry || !isUserSortableField(sortEntry[0])) {
    return rows;
  }

  const [field, order] = sortEntry;
  const direction = order === 'descend' ? -1 : 1;

  return [...rows].sort(
    (left, right) =>
      left[field].localeCompare(right[field], 'zh-CN', { numeric: true }) *
      direction,
  );
}

export const queryUserRows: NonNullable<
  ProTableProps<UserRow, UserQueryParams>['request']
> = async (params, sort, filter) => {
  const rows = selectUserRows(params, sort, filter);
  const current = Math.max(params.current ?? 1, 1);
  const pageSize = Math.max(params.pageSize ?? 10, 1);
  const offset = (current - 1) * pageSize;

  return {
    data: rows.slice(offset, offset + pageSize),
    success: true,
    total: rows.length,
  };
};
