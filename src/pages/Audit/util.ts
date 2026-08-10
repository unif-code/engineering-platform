import type { ProTableProps } from '@ant-design/pro-components';
import { AUDIT_ROWS } from './constant';
import type { AuditQueryParams, AuditRow } from './type';

type AuditRequest = NonNullable<
  ProTableProps<AuditRow, AuditQueryParams>['request']
>;
type AuditSort = Parameters<AuditRequest>[1];
type AuditFilter = Parameters<AuditRequest>[2];

const RANGE_START: Record<
  Exclude<NonNullable<AuditQueryParams['range']>, 'all'>,
  string
> = {
  today: '2026-08-10T00:00:00+08:00',
  '7d': '2026-08-04T00:00:00+08:00',
  '30d': '2026-07-12T00:00:00+08:00',
};

export function selectAuditRows(
  params: AuditQueryParams,
  sort: AuditSort = {},
  filter: AuditFilter = {},
): AuditRow[] {
  const keyword = params.keyword?.trim().toLocaleLowerCase();
  const actions =
    params.action && params.action !== 'all'
      ? [params.action]
      : filter.action?.map(String);
  const risks =
    params.risk && params.risk !== 'all'
      ? [params.risk]
      : filter.risk?.map(String);
  const range = params.range ?? 'all';
  const rangeStart = range === 'all' ? undefined : RANGE_START[range];

  const filtered = AUDIT_ROWS.filter((row) => {
    const matchesRange = !rangeStart || row.occurredAt >= rangeStart;
    const matchesAction = !actions?.length || actions.includes(row.action);
    const matchesRisk = !risks?.length || risks.includes(row.risk);
    const matchesKeyword =
      !keyword ||
      [
        row.id,
        row.actor,
        row.action,
        row.target,
        row.correlationId,
        row.result,
      ].some((value) => value.toLocaleLowerCase().includes(keyword));

    return matchesRange && matchesAction && matchesRisk && matchesKeyword;
  });

  if (sort.occurredAt === 'ascend' || sort.occurredAt === 'descend') {
    const direction = sort.occurredAt === 'ascend' ? 1 : -1;
    filtered.sort(
      (left, right) =>
        left.occurredAt.localeCompare(right.occurredAt) * direction,
    );
  }

  return filtered;
}

export const queryAuditRows: NonNullable<
  ProTableProps<AuditRow, AuditQueryParams>['request']
> = async (params, sort, filter) => {
  const filtered = selectAuditRows(params, sort, filter);
  const current = Math.max(params.current ?? 1, 1);
  const pageSize = Math.max(params.pageSize ?? 10, 1);
  const offset = (current - 1) * pageSize;

  return {
    data: filtered.slice(offset, offset + pageSize),
    success: true,
    total: filtered.length,
  };
};
