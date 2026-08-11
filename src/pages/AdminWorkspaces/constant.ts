import type { WorkspaceAction, WorkspaceMemberRow, WorkspaceRow } from './type';

export const WORKSPACE_STATUS_OPTIONS = [
  { label: '全部状态', value: 'all' },
  { label: '活跃', value: 'ACTIVE' },
  { label: '已归档', value: 'ARCHIVED' },
] as const;

export const WORKSPACE_STATUS_META = {
  ACTIVE: { label: '活跃', tone: 'success' },
  ARCHIVED: { label: '已归档', tone: 'neutral' },
} as const satisfies Record<
  WorkspaceRow['status'],
  { label: string; tone: 'neutral' | 'success' }
>;

export const WORKSPACE_MEMBER_SOURCE_META = {
  DIRECT_REPORT: { label: '直属', tone: 'neutral' },
  LEADER: { label: 'Leader', tone: 'info' },
  OWNER: { label: 'Owner', tone: 'purple' },
} as const satisfies Record<
  WorkspaceMemberRow['source'],
  { label: string; tone: 'info' | 'neutral' | 'purple' }
>;

export const WORKSPACE_ACTION_META = {
  invite: {
    confirmText: '确认邀请',
    successText: 'Leader 已邀请',
    title: '邀请 Leader',
  },
  remove: {
    confirmText: '确认移除',
    successText: 'Leader 已移除',
    title: '移除 Leader',
  },
  transfer: {
    confirmText: '确认转让',
    successText: 'Owner 已转让',
    title: '转让 Owner',
  },
} as const satisfies Record<
  WorkspaceAction,
  { confirmText: string; successText: string; title: string }
>;
