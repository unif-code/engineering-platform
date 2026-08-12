import type { ProTableProps } from '@ant-design/pro-components';
import {
  listWorkspaces,
  type OrganizationNode,
  type WorkspaceAccountRef,
  type WorkspaceListQuery,
  type WorkspaceStatus,
} from '@/features/administration';
import { toWorkspaceRow } from './constant';
import type { WorkspaceQueryParams, WorkspaceRow } from './type';

type WorkspaceRequest = NonNullable<
  ProTableProps<WorkspaceRow, WorkspaceQueryParams>['request']
>;

const WORKSPACE_STATUSES: readonly WorkspaceStatus[] = ['ACTIVE', 'ARCHIVED'];
const DEVELOPMENT_LEADER_IDS = new Set([
  'leader-gao',
  'leader-li',
  'leader-liu',
]);

const positiveInteger = (value: number | undefined, fallback: number) =>
  value !== undefined && Number.isSafeInteger(value) && value > 0
    ? value
    : fallback;

const trimmed = (value: string | undefined) => {
  const result = value?.trim();
  return result ? result : undefined;
};

const isWorkspaceStatus = (
  value: string | undefined,
): value is WorkspaceStatus =>
  WORKSPACE_STATUSES.includes(value as WorkspaceStatus);

export function toWorkspaceListQuery(
  params: WorkspaceQueryParams,
): WorkspaceListQuery {
  const keyword = trimmed(params.keyword);
  const status = isWorkspaceStatus(params.status) ? params.status : undefined;
  return {
    page: positiveInteger(params.current, 1),
    pageSize: positiveInteger(params.pageSize, 10),
    ...(keyword ? { keyword } : {}),
    ...(status ? { status } : {}),
  };
}

export const queryWorkspaceRows: WorkspaceRequest = async (params) => {
  const page = await listWorkspaces(toWorkspaceListQuery(params));
  return {
    data: page.items.map(toWorkspaceRow),
    success: true,
    total: page.total,
  };
};

export function flattenLeaders(
  nodes: readonly OrganizationNode[],
): WorkspaceAccountRef[] {
  return nodes.flatMap((node) => [
    ...(node.kind === 'LEADER' && DEVELOPMENT_LEADER_IDS.has(node.id)
      ? [
          {
            displayName: node.displayName,
            employeeNo: node.employeeNo,
            id: node.id,
          },
        ]
      : []),
    ...flattenLeaders(node.children),
  ]);
}
