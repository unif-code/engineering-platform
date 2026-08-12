import type { GrantStatus, GrantSummary } from '@/features/administration';
import type { GrantPrincipalType, GrantRisk, GrantRow } from './type';

export const GRANT_CAPABILITY_OPTIONS = [
  { label: '开发任务', value: 'task.develop' },
  { label: '创建任务', value: 'task.create' },
  { label: '审批任务', value: 'task.approve' },
  { label: '审核任务', value: 'task.review' },
  { label: '分配任务', value: 'task.assign' },
  { label: '合并代码 (MR)', value: 'mr.merge' },
  { label: '工作区配置', value: 'ws.config' },
  { label: '团队看板', value: 'board.team' },
  { label: '审计看板', value: 'audit.view' },
  { label: '用户管理', value: 'admin.user' },
  { label: '菜单管理', value: 'admin.menu' },
  { label: '组织管理', value: 'admin.org' },
  { label: 'Grant 管理', value: 'admin.grant' },
  { label: 'Policy 发布', value: 'admin.policy' },
] as const;

export const GRANT_CAPABILITY_LABELS = Object.fromEntries(
  GRANT_CAPABILITY_OPTIONS.map(({ label, value }) => [value, label]),
) as Readonly<Record<string, string>>;

export const GRANT_FILTER_OPTIONS = [
  { label: '全部', value: 'all' },
  { label: '高危能力', value: 'high-risk' },
  { label: '临时授权', value: 'temporary' },
  { label: '继承', value: 'inherited' },
] as const;

export const GRANT_PRINCIPAL_META = {
  ACCOUNT: { label: '用户', tone: 'brand' },
  ROLE: { label: '角色', tone: 'purple' },
  SERVICE_ACCOUNT: { label: '服务账号', tone: 'info' },
} as const satisfies Record<
  GrantPrincipalType,
  { label: string; tone: 'brand' | 'info' | 'purple' }
>;

export const GRANT_PRINCIPAL_TYPE_OPTIONS = [
  { label: '用户', value: 'ACCOUNT' },
  { label: '角色', value: 'ROLE' },
  { label: '服务账号', value: 'SERVICE_ACCOUNT' },
] as const;

export const GRANT_VALIDITY_OPTIONS = [
  { label: '长期', value: 'LONG_TERM' },
  { label: '30 天临时', value: 'TEMPORARY_30' },
  { label: '90 天临时', value: 'TEMPORARY_90' },
] as const;

export const GRANT_STATUS_META = {
  ACTIVE: { label: '生效中', tone: 'success' },
  REVOKED: { label: '已撤销', tone: 'neutral' },
} as const satisfies Record<
  GrantStatus,
  { label: string; tone: 'neutral' | 'success' }
>;

const GRANT_PRESENTATION_BY_ID: Readonly<
  Record<
    string,
    {
      grantedBy: string;
      principalType: GrantPrincipalType;
      risk: GrantRisk;
    }
  >
> = {
  'grant-account-manager': {
    grantedBy: '康宁',
    principalType: 'ACCOUNT',
    risk: 'HIGH',
  },
  'grant-audit-platform': {
    grantedBy: '系统',
    principalType: 'ACCOUNT',
    risk: 'NORMAL',
  },
  'grant-audit-reader': {
    grantedBy: '康宁',
    principalType: 'ACCOUNT',
    risk: 'NORMAL',
  },
  'grant-merge-marketing-temporary': {
    grantedBy: '吴桐',
    principalType: 'ACCOUNT',
    risk: 'HIGH',
  },
  'grant-merge-trading': {
    grantedBy: '康宁',
    principalType: 'ACCOUNT',
    risk: 'HIGH',
  },
  'grant-service-agent-runner': {
    grantedBy: '系统',
    principalType: 'SERVICE_ACCOUNT',
    risk: 'NORMAL',
  },
  'grant-task-approve-trading': {
    grantedBy: '康宁',
    principalType: 'ACCOUNT',
    risk: 'NORMAL',
  },
  'grant-task-create-marketing': {
    grantedBy: '康宁',
    principalType: 'ACCOUNT',
    risk: 'NORMAL',
  },
};

export const INHERITED_GRANT_ROWS = Object.freeze([
  Object.freeze({
    capability: 'task.assign',
    grantedBy: '系统',
    id: 'grant-role-development-leader',
    principal: Object.freeze({
      displayName: '开发Leader',
      employeeNo: 'role-development-leader',
      id: 'role-development-leader',
      type: 'ROLE',
    }),
    risk: 'NORMAL',
    scope: Object.freeze({ id: null, label: '全平台', type: 'PLATFORM' }),
    source: 'INHERITED',
    status: 'ACTIVE',
    validFrom: '2026-05-20T08:00:00.000Z',
    validTo: null,
    version: 1,
  }),
  Object.freeze({
    capability: 'admin.policy',
    grantedBy: '系统',
    id: 'grant-role-administrator',
    principal: Object.freeze({
      displayName: '管理员',
      employeeNo: 'role-administrator',
      id: 'role-administrator',
      type: 'ROLE',
    }),
    risk: 'HIGH',
    scope: Object.freeze({ id: null, label: '全平台', type: 'PLATFORM' }),
    source: 'INHERITED',
    status: 'ACTIVE',
    validFrom: '2026-05-20T08:00:00.000Z',
    validTo: null,
    version: 1,
  }),
] as const satisfies readonly GrantRow[]);

export function toGrantRow(grant: GrantSummary): GrantRow {
  const metadata = GRANT_PRESENTATION_BY_ID[grant.id] ?? {
    grantedBy: '当前管理员',
    principalType: 'ACCOUNT' as const,
    risk: /^(mr\.merge|admin\.)/.test(grant.capability)
      ? ('HIGH' as const)
      : ('NORMAL' as const),
  };
  return {
    ...grant,
    grantedBy: metadata.grantedBy,
    principal: { ...grant.principal, type: metadata.principalType },
    risk: metadata.risk,
    source: 'DIRECT',
  };
}
