import type { ProTableProps } from '@ant-design/pro-components';
import { ARCHIVED_TASK_ROWS, TASK_ROWS } from './constant';
import type { TaskQueryParams, TaskRow } from './type';

type TaskRequest = NonNullable<
  ProTableProps<TaskRow, TaskQueryParams>['request']
>;
type TaskSort = Parameters<TaskRequest>[1];
type TaskFilter = Parameters<TaskRequest>[2];

export function selectTaskRows(
  params: TaskQueryParams,
  sort: TaskSort = {},
  filter: TaskFilter = {},
): TaskRow[] {
  const source = params.mode === 'archived' ? ARCHIVED_TASK_ROWS : TASK_ROWS;
  const keyword = params.keyword?.trim().toLocaleLowerCase();
  const statusFromParams =
    params.status && params.status !== 'all' ? [params.status] : undefined;
  const statuses = statusFromParams ?? filter.status?.map(String);

  const filtered = source.filter((row) => {
    const matchesKeyword =
      !keyword ||
      [
        row.id,
        row.title,
        row.team,
        row.workspace,
        row.repository,
        row.owner,
        row.agent,
      ].some((value) => value.toLocaleLowerCase().includes(keyword));
    const matchesStatus = !statuses?.length || statuses.includes(row.status);

    return matchesKeyword && matchesStatus;
  });

  if (sort.updatedAt === 'ascend' || sort.updatedAt === 'descend') {
    const direction = sort.updatedAt === 'ascend' ? 1 : -1;
    filtered.sort(
      (left, right) =>
        left.updatedAt.localeCompare(right.updatedAt) * direction,
    );
  }

  return filtered;
}

export const queryTaskRows: TaskRequest = async (params, sort, filter) => {
  const filtered = selectTaskRows(params, sort, filter);
  const current = Math.max(params.current ?? 1, 1);
  const pageSize = Math.max(params.pageSize ?? 10, 1);
  const offset = (current - 1) * pageSize;

  return {
    data: filtered.slice(offset, offset + pageSize),
    success: true,
    total: filtered.length,
  };
};
