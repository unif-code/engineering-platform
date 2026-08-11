import type { GrantScopeType, GrantStatus } from '@/features/administration';

export const GRANT_CAPABILITY_OPTIONS = [
  { label: '审计读取', value: 'audit.read' },
  { label: '账号治理', value: 'identity.account.manage' },
  { label: '组织治理', value: 'organization.manage' },
  { label: 'Workspace 治理', value: 'workspace.manage' },
  { label: 'Grant 治理', value: 'authorization.grant.manage' },
] as const;

export const GRANT_SCOPE_OPTIONS = [
  { label: 'Platform', value: 'PLATFORM' },
  { label: 'Workspace', value: 'WORKSPACE' },
] as const satisfies ReadonlyArray<{
  label: string;
  value: GrantScopeType;
}>;

export const GRANT_STATUS_META = {
  ACTIVE: { label: '生效中', tone: 'success' },
  REVOKED: { label: '已撤销', tone: 'neutral' },
} as const satisfies Record<
  GrantStatus,
  { label: string; tone: 'neutral' | 'success' }
>;
