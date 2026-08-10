import type { ProTableProps } from '@ant-design/pro-components';
import { WORKSPACE_ROWS } from './constant';
import type { WorkspaceQueryParams, WorkspaceRow } from './type';

type WorkspaceRequest = NonNullable<
  ProTableProps<WorkspaceRow, WorkspaceQueryParams>['request']
>;
type WorkspaceFilter = Parameters<WorkspaceRequest>[2];

export function selectWorkspaceRows(
  params: WorkspaceQueryParams,
  filter: WorkspaceFilter = {},
): WorkspaceRow[] {
  const keyword = params.keyword?.trim().toLocaleLowerCase();
  const statuses =
    params.status && params.status !== 'all'
      ? [params.status]
      : filter.status?.map(String);

  return WORKSPACE_ROWS.filter((row) => {
    const matchesKeyword =
      !keyword ||
      [row.id, row.name, row.owner].some((value) =>
        value.toLocaleLowerCase().includes(keyword),
      );
    const matchesStatus = !statuses?.length || statuses.includes(row.status);

    return matchesKeyword && matchesStatus;
  });
}

export const queryWorkspaceRows: NonNullable<
  ProTableProps<WorkspaceRow, WorkspaceQueryParams>['request']
> = async (params, _sort, filter) => {
  const filtered = selectWorkspaceRows(params, filter);
  const current = Math.max(params.current ?? 1, 1);
  const pageSize = Math.max(params.pageSize ?? 10, 1);
  const offset = (current - 1) * pageSize;

  return {
    data: filtered.slice(offset, offset + pageSize),
    success: true,
    total: filtered.length,
  };
};
