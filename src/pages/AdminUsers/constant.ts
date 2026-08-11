import type { UserAction, UserStatus } from './type';

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
