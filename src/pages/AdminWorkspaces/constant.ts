import type { WorkspaceRow } from './type';

export const WORKSPACE_ROWS = Object.freeze([
  Object.freeze({
    id: 'workspace-platform-core',
    name: 'Platform Core',
    owner: '周天',
    memberCount: 18,
    repositoryCount: 6,
    status: 'active',
    updatedAt: '2026-08-10T09:30:00+08:00',
  }),
  Object.freeze({
    id: 'workspace-agent-runtime',
    name: 'Agent Runtime',
    owner: '方舟',
    memberCount: 12,
    repositoryCount: 4,
    status: 'active',
    updatedAt: '2026-08-09T17:45:00+08:00',
  }),
  Object.freeze({
    id: 'workspace-delivery-governance',
    name: 'Delivery Governance',
    owner: '沈一',
    memberCount: 9,
    repositoryCount: 3,
    status: 'restricted',
    updatedAt: '2026-08-08T14:20:00+08:00',
  }),
] as const satisfies readonly WorkspaceRow[]);

export const WORKSPACE_STATUS_OPTIONS = [
  { label: '全部状态', value: 'all' },
  { label: '活跃', value: 'active' },
  { label: '受限', value: 'restricted' },
] as const;

export const WORKSPACE_STATUS_META = {
  active: { label: '活跃', tone: 'success' },
  restricted: { label: '受限', tone: 'warning' },
} as const;

export const DEFAULT_TEAM_OPTIONS = [
  { label: 'Platform', value: 'Platform' },
  { label: 'Agent Runtime', value: 'Agent Runtime' },
  { label: 'Delivery Governance', value: 'Delivery Governance' },
] as const;
