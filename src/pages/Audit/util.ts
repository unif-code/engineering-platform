import type { ProTableProps } from '@ant-design/pro-components';
import { listAuditEvents } from '@/features/administration';
import { AUDIT_PAGE_SIZE } from './constant';
import type { AuditQueryParams, AuditRow } from './type';

type AuditRequest = NonNullable<
  ProTableProps<AuditRow, AuditQueryParams>['request']
>;
type AuditSort = Parameters<AuditRequest>[1];
type AuditFilter = Parameters<AuditRequest>[2];

const RANGE_DAYS: Record<
  Exclude<NonNullable<AuditQueryParams['range']>, 'all'>,
  number
> = { today: 1, '7d': 7, '30d': 30 };

function auditRangeBounds(
  range: Exclude<NonNullable<AuditQueryParams['range']>, 'all'>,
  now = new Date(),
) {
  const from = new Date(now);
  from.setHours(0, 0, 0, 0);
  from.setDate(from.getDate() - (RANGE_DAYS[range] - 1));
  const to = new Date(now);
  to.setHours(23, 59, 59, 999);

  return { from: from.toISOString(), to: to.toISOString() };
}

function toAuditEventsQuery(params: AuditQueryParams) {
  const actor = params.actor?.trim();
  const bounds =
    params.range && params.range !== 'all'
      ? auditRangeBounds(params.range)
      : undefined;
  const pageSize = params.pageSize ?? AUDIT_PAGE_SIZE;
  const limit =
    Number.isSafeInteger(pageSize) && pageSize > 0 ? pageSize : AUDIT_PAGE_SIZE;

  return {
    ...(actor ? { actor } : {}),
    ...(params.cursor ? { cursor: params.cursor } : {}),
    ...(bounds ?? {}),
    limit,
    ...(params.targetType && params.targetType !== 'all'
      ? { targetType: params.targetType }
      : {}),
  };
}

export function selectAuditRows(
  rows: readonly AuditRow[],
  params: AuditQueryParams,
  sort: AuditSort = {},
  filter: AuditFilter = {},
): AuditRow[] {
  const actions =
    params.action && params.action !== 'all'
      ? [params.action]
      : filter.action?.map(String);
  const risks =
    params.risk && params.risk !== 'all'
      ? [params.risk]
      : filter.risk?.map(String);

  const filtered = rows.filter((row) => {
    const matchesAction = !actions?.length || actions.includes(row.action);
    const matchesRisk = !risks?.length || risks.includes(row.risk);

    return matchesAction && matchesRisk;
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

export function mergeAuditRows(
  current: readonly AuditRow[],
  incoming: readonly AuditRow[],
): AuditRow[] {
  const ids = new Set(current.map(({ id }) => id));
  return [
    ...current,
    ...incoming.filter(({ id }) => {
      if (ids.has(id)) {
        return false;
      }
      ids.add(id);
      return true;
    }),
  ];
}

export function mergeAndSelectAuditRows(
  current: readonly AuditRow[],
  incoming: readonly AuditRow[],
  params: AuditQueryParams,
  sort: AuditSort = {},
  filter: AuditFilter = {},
) {
  return selectAuditRows(
    mergeAuditRows(current, incoming),
    params,
    sort,
    filter,
  );
}

export const queryAuditRows = async (
  params: AuditQueryParams,
  sort: AuditSort = {},
  filter: AuditFilter = {},
) => {
  const response = await listAuditEvents(toAuditEventsQuery(params));

  return {
    data: selectAuditRows(response.items, params, sort, filter),
    nextCursor: response.nextCursor,
    success: true,
  };
};
