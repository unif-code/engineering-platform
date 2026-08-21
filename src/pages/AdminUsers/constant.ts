import type { UserAction, UserStatus } from './type';

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
