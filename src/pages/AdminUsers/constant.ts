import type { UserRow } from './type';

export const USER_ROWS = Object.freeze([
  Object.freeze({
    employeeId: '10000001',
    name: '示例用户甲',
    email: 'user.a@example.test',
    roles: Object.freeze(['Platform Admin']),
    status: 'active',
    lastActiveAt: '2026-08-10T09:30:00+08:00',
  }),
  Object.freeze({
    employeeId: '10000002',
    name: '示例用户乙',
    email: 'user.b@example.test',
    roles: Object.freeze(['Workspace Admin', 'Reviewer']),
    status: 'active',
    lastActiveAt: '2026-08-09T16:20:00+08:00',
  }),
  Object.freeze({
    employeeId: '10000003',
    name: '示例用户丙',
    email: 'user.c@example.test',
    roles: Object.freeze(['Developer']),
    status: 'disabled',
    lastActiveAt: '2026-08-06T11:45:00+08:00',
  }),
  Object.freeze({
    employeeId: '10000004',
    name: '示例用户丁',
    email: 'user.d@example.test',
    roles: Object.freeze(['Reviewer']),
    status: 'active',
    lastActiveAt: '2026-08-08T14:10:00+08:00',
  }),
] as const satisfies readonly UserRow[]);

export const USER_STATUS_OPTIONS = [
  { label: '全部状态', value: 'all' },
  { label: '活跃', value: 'active' },
  { label: '已禁用', value: 'disabled' },
] as const;

export const USER_FORM_STATUS_OPTIONS = USER_STATUS_OPTIONS.slice(1);

export const USER_ROLE_OPTIONS = [
  { label: '全部角色', value: 'all' },
  { label: 'Platform Admin', value: 'Platform Admin' },
  { label: 'Workspace Admin', value: 'Workspace Admin' },
  { label: 'Developer', value: 'Developer' },
  { label: 'Reviewer', value: 'Reviewer' },
] as const;

export const USER_FORM_ROLE_OPTIONS = USER_ROLE_OPTIONS.slice(1);

export const USER_STATUS_META = {
  active: { label: '活跃', tone: 'success' },
  disabled: { label: '已禁用', tone: 'warning' },
} as const;
