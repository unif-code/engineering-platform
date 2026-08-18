import type { UserAction, UserStatus } from './type';

export const USER_PRESENTATION_BY_ID = Object.freeze({
  'account-1': {
    lastLogin: '08-06 09:02',
    roles: ['产品'],
    superior: '吴桐 · 产品Leader · 营销',
    team: '营销',
  },
  'account-2': {
    lastLogin: '08-06 08:41',
    roles: ['产品Leader'],
    superior: '赵敏 · 经理',
    team: '营销',
  },
  'account-3': {
    lastLogin: '08-06 09:31',
    roles: ['开发Leader'],
    superior: '赵敏 · 经理',
    team: '营销',
  },
  'account-4': {
    lastLogin: '08-06 10:02',
    roles: ['前端开发'],
    superior: '李强 · 开发Leader · 营销',
    team: '营销',
  },
  'account-5': {
    lastLogin: '08-05 19:22',
    roles: ['后端开发'],
    superior: '李强 · 开发Leader · 营销',
    team: '营销',
  },
  'account-6': {
    lastLogin: '08-01 11:20',
    roles: ['前端开发'],
    superior: '李强 · 开发Leader · 营销',
    team: '营销',
  },
  'account-7': {
    lastLogin: '08-06 08:12',
    roles: ['经理'],
    superior: '无',
    team: '营销',
  },
  'account-8': {
    lastLogin: '08-06 09:40',
    roles: ['开发Leader'],
    superior: '无',
    team: '交易',
  },
  'account-9': {
    lastLogin: '08-06 10:44',
    roles: ['前端开发', '后端开发'],
    superior: '刘洋 · 开发Leader · 交易',
    team: '交易',
  },
  'account-10': {
    lastLogin: '08-05 16:03',
    roles: ['产品'],
    superior: '无',
    team: '交易',
  },
  'account-11': {
    lastLogin: '08-06 07:55',
    roles: ['经理'],
    superior: '无',
    team: '中台',
  },
  'account-12': {
    lastLogin: '08-04 18:30',
    roles: ['后端开发'],
    superior: '高翔 · 开发Leader · 中台',
    team: '中台',
  },
  'account-13': {
    lastLogin: '08-06 08:00',
    roles: ['管理员'],
    superior: '无',
    team: '平台',
  },
  'account-14': {
    lastLogin: '08-06 07:30',
    roles: ['超级管理员'],
    superior: '无',
    team: '平台',
  },
} as const);

export const toUserRow = <T extends { id: string }>(account: T) => ({
  ...account,
  ...USER_PRESENTATION_BY_ID[
    account.id as keyof typeof USER_PRESENTATION_BY_ID
  ],
});

export const USER_STATUS_OPTIONS = [
  { label: '全部状态', value: 'all' },
  { label: '待初始化', value: 'PENDING_INIT' },
  { label: '已启用', value: 'ENABLED' },
  { label: '已停用', value: 'DISABLED' },
  { label: '受限', value: 'RESTRICTED' },
] as const;

export const USER_PROFESSION_OPTIONS = [
  { label: '全部专业分类', value: 'all' },
  { label: '研发', value: '研发' },
  { label: '测试', value: '测试' },
  { label: '产品', value: '产品' },
  { label: '运维', value: '运维' },
] as const;

export const USER_FORM_PROFESSION_OPTIONS = USER_PROFESSION_OPTIONS.slice(1);

export const USER_TEAM_OPTIONS = ['营销', '交易', '中台', '平台'].map(
  (value) => ({ label: value, value }),
);

export const USER_CREATE_ROLE_OPTIONS = [
  '前端开发',
  '后端开发',
  '产品',
  '产品Leader',
  '开发Leader',
  '经理',
  '管理员',
].map((value) => ({ label: value, value }));

export const USER_SUPERIOR_OPTIONS = [
  '无',
  '李强 · 开发Leader · 营销',
  '吴桐 · 产品Leader · 营销',
  '刘洋 · 开发Leader · 交易',
  '高翔 · 开发Leader · 中台',
  '赵敏 · 经理',
].map((value) => ({ label: value, value }));

export const USER_STATUS_META: Record<
  UserStatus,
  { label: string; tone: 'danger' | 'info' | 'success' | 'warning' }
> = {
  PENDING_INIT: { label: '待初始化', tone: 'info' },
  ENABLED: { label: '已启用', tone: 'success' },
  DISABLED: { label: '已停用', tone: 'danger' },
  RESTRICTED: { label: '受限', tone: 'warning' },
};

export const USER_ACTION_META: Record<
  UserAction,
  { confirmText: string; successText: string; title: string }
> = {
  enable: {
    confirmText: '确认启用',
    successText: '账号已启用',
    title: '确认启用账号',
  },
  disable: {
    confirmText: '确认停用',
    successText: '账号已停用',
    title: '确认停用账号',
  },
  resetPassword: {
    confirmText: '确认重置密码',
    successText: '密码已重置',
    title: '确认重置密码',
  },
  resetTotp: {
    confirmText: '确认重置 TOTP',
    successText: 'TOTP 已重置',
    title: '确认重置 TOTP',
  },
};
