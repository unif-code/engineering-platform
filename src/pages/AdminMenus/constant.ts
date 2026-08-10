import { ROUTE_REGISTRY, type RouteKey } from '@/features/navigation';
import type { MenuRow } from './type';

function createMenuRow(key: RouteKey, name: string, order: number): MenuRow {
  const registration = ROUTE_REGISTRY[key];
  if (registration.group === null) {
    throw new Error(`Route ${key} 不是菜单分组路由`);
  }

  return Object.freeze({
    group: registration.group,
    key,
    name,
    order,
    path: registration.path,
    visible: true,
  });
}

export const MENU_ROWS = Object.freeze([
  createMenuRow('home', '工作台', 1),
  createMenuRow('tasks', '任务', 2),
  createMenuRow('workspaces', '工作区', 3),
  createMenuRow('messages', '消息中心', 4),
  createMenuRow('team-board', '团队看板', 5),
  createMenuRow('audit', '审计看板', 6),
  createMenuRow('admin', '管理概览', 7),
  createMenuRow('admin.workspaces', '工作区管理', 8),
  createMenuRow('admin.skills', '技能管理', 9),
  createMenuRow('admin.models', '模型管理', 10),
  createMenuRow('admin.roles', '角色管理', 11),
  createMenuRow('admin.users', '用户管理', 12),
  createMenuRow('admin.menus', '菜单管理', 13),
] as const satisfies readonly MenuRow[]);

export const MENU_GROUP_OPTIONS = [
  { label: '全部分组', value: 'all' },
  { label: '用户端', value: 'user' },
  { label: '管理端', value: 'admin' },
] as const;

export const MENU_FORM_GROUP_OPTIONS = MENU_GROUP_OPTIONS.slice(1);

export const MENU_VISIBILITY_OPTIONS = [
  { label: '全部显示状态', value: 'all' },
  { label: '已显示', value: 'visible' },
  { label: '已隐藏', value: 'hidden' },
] as const;

export const MENU_GROUP_META = {
  user: { label: '用户端', tone: 'brand' },
  admin: { label: '管理端', tone: 'neutral' },
} as const;
