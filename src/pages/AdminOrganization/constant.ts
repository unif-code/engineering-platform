import type {
  OrganizationAccountStatus,
  OrganizationDepartmentSummary,
  OrganizationRoleMix,
} from './type';

export const ORGANIZATION_DEPARTMENTS = Object.freeze([
  Object.freeze({
    key: 'marketing',
    lead: '吴桐',
    memberCount: 14,
    name: '营销技术部',
    roleMix: Object.freeze({ backend: 4, frontend: 5, product: 3, testing: 2 }),
    subgroups: Object.freeze(['活动前端', '会员中台', '增长实验']),
    workspaceCount: 2,
  }),
  Object.freeze({
    key: 'trading',
    lead: '秦岚',
    memberCount: 11,
    name: '交易技术部',
    roleMix: Object.freeze({ backend: 4, frontend: 4, product: 2, testing: 1 }),
    subgroups: Object.freeze(['行情终端', '撮合引擎']),
    workspaceCount: 2,
  }),
  Object.freeze({
    key: 'platform',
    lead: '罗成',
    memberCount: 9,
    name: '中台技术部',
    roleMix: Object.freeze({ backend: 3, frontend: 3, product: 2, testing: 1 }),
    subgroups: Object.freeze(['网关', '权限中心']),
    workspaceCount: 1,
  }),
  Object.freeze({
    key: 'operations',
    lead: '康宁',
    memberCount: 5,
    name: '平台运营组',
    roleMix: Object.freeze({ backend: 2, frontend: 1, product: 1, testing: 1 }),
    subgroups: Object.freeze(['平台治理']),
    workspaceCount: 1,
  }),
] as const satisfies readonly OrganizationDepartmentSummary[]);

export const ORGANIZATION_ROOT_DEPARTMENTS: Readonly<Record<string, string>> = {
  'manager-kang': 'operations',
  'manager-luo': 'platform',
  'manager-qin': 'trading',
  'manager-zhao': 'marketing',
};

export const ORGANIZATION_MEMBER_META: Readonly<
  Record<
    string,
    {
      lastLoginAt: string;
      roles: readonly string[];
      status: OrganizationAccountStatus;
    }
  >
> = {
  'leader-gao': {
    lastLoginAt: '08-06 09:18',
    roles: ['开发Leader'],
    status: 'ACTIVE',
  },
  'leader-li': {
    lastLoginAt: '08-06 09:31',
    roles: ['开发Leader'],
    status: 'ACTIVE',
  },
  'leader-liu': {
    lastLoginAt: '08-06 09:40',
    roles: ['开发Leader'],
    status: 'ACTIVE',
  },
  'leader-sun': {
    lastLoginAt: '08-06 08:00',
    roles: ['管理员'],
    status: 'ACTIVE',
  },
  'leader-wu': {
    lastLoginAt: '08-06 08:41',
    roles: ['产品Leader'],
    status: 'ACTIVE',
  },
  'manager-kang': {
    lastLoginAt: '08-04 18:30',
    roles: ['后端开发'],
    status: 'ACTIVE',
  },
  'manager-luo': {
    lastLoginAt: '08-06 07:55',
    roles: ['经理'],
    status: 'ACTIVE',
  },
  'manager-qin': {
    lastLoginAt: '08-05 16:03',
    roles: ['产品'],
    status: 'ACTIVE',
  },
  'manager-zhao': {
    lastLoginAt: '08-06 08:12',
    roles: ['经理'],
    status: 'ACTIVE',
  },
  'member-chen': {
    lastLoginAt: '08-06 10:02',
    roles: ['前端开发'],
    status: 'ACTIVE',
  },
  'member-he': {
    lastLoginAt: '08-06 10:44',
    roles: ['前端开发', '后端开发'],
    status: 'ACTIVE',
  },
  'member-wang': {
    lastLoginAt: '08-06 09:02',
    roles: ['产品'],
    status: 'ACTIVE',
  },
  'member-xu': {
    lastLoginAt: '08-01 11:20',
    roles: ['前端开发'],
    status: 'DISABLED',
  },
  'member-zheng': {
    lastLoginAt: '08-05 19:22',
    roles: ['后端开发'],
    status: 'ACTIVE',
  },
  'member-zhou': {
    lastLoginAt: '08-06 07:30',
    roles: ['超级管理员'],
    status: 'ACTIVE',
  },
};

export const ORGANIZATION_LEAD_OPTIONS = [
  { label: '李强 · 开发Leader', value: 'leader-li' },
  { label: '刘洋 · 开发Leader', value: 'leader-liu' },
  { label: '高翔 · 开发Leader', value: 'leader-gao' },
  { label: '吴桐 · 产品Leader', value: 'leader-wu' },
  { label: '赵敏 · 经理', value: 'manager-zhao' },
] as const;

export const ORGANIZATION_PARENT_OPTIONS = [
  { label: '无（一级部门）', value: 'root' },
  ...ORGANIZATION_DEPARTMENTS.slice(0, 3).map(({ key, name }) => ({
    label: name,
    value: key,
  })),
] as const;

export const ORGANIZATION_ROLE_MIX = Object.freeze([
  Object.freeze({ key: 'product', label: '产品' }),
  Object.freeze({ key: 'frontend', label: '前端' }),
  Object.freeze({ key: 'backend', label: '后端' }),
  Object.freeze({ key: 'testing', label: '测试' }),
] as const satisfies ReadonlyArray<{
  key: keyof OrganizationRoleMix;
  label: string;
}>);
