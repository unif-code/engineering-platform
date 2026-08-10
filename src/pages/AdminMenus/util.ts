import type { ProTableProps } from '@ant-design/pro-components';
import { MENU_ROWS } from './constant';
import type { MenuQueryParams, MenuRow } from './type';

type MenuRequest = NonNullable<
  ProTableProps<MenuRow, MenuQueryParams>['request']
>;
type MenuSort = Parameters<MenuRequest>[1];
type MenuFilter = Parameters<MenuRequest>[2];

const GROUP_RANK: Record<MenuRow['group'], number> = {
  user: 0,
  admin: 1,
};

function matchesVisibility(
  row: MenuRow,
  visibility: string | number | undefined,
): boolean {
  if (visibility === 'visible' || visibility === 'true' || visibility === 1) {
    return row.visible;
  }
  if (visibility === 'hidden' || visibility === 'false' || visibility === 0) {
    return !row.visible;
  }
  return true;
}

export function selectMenuRows(
  params: MenuQueryParams,
  sort: MenuSort = {},
  filter: MenuFilter = {},
): MenuRow[] {
  const groups =
    params.group === 'all'
      ? undefined
      : params.group
        ? [params.group]
        : filter.group?.map(String);
  const visibility =
    params.visible === 'all'
      ? undefined
      : (params.visible ?? filter.visible?.map(String)[0]);
  const direction = sort.order === 'descend' ? -1 : 1;

  return MENU_ROWS.filter((row) => {
    const matchesGroup = !groups?.length || groups.includes(row.group);

    return matchesGroup && matchesVisibility(row, visibility);
  }).sort((left, right) => {
    const groupDifference = GROUP_RANK[left.group] - GROUP_RANK[right.group];
    if (groupDifference !== 0) {
      return groupDifference;
    }

    const orderDifference = (left.order - right.order) * direction;
    return orderDifference || left.key.localeCompare(right.key);
  });
}

export const queryMenuRows: NonNullable<
  ProTableProps<MenuRow, MenuQueryParams>['request']
> = async (params, sort, filter) => {
  const rows = selectMenuRows(params, sort, filter);
  const current = Math.max(params.current ?? 1, 1);
  const pageSize = Math.max(params.pageSize ?? 20, 1);
  const offset = (current - 1) * pageSize;

  return {
    data: rows.slice(offset, offset + pageSize),
    success: true,
    total: rows.length,
  };
};
