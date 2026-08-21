import { ROUTE_REGISTRY, type RouteKey } from '@/features/navigation';
import type { MenuRow } from './type';

function createMenuRow(
  key: RouteKey,
  name: string,
  order: number,
  capability: string,
  isNew = false,
): MenuRow {
  const registration = ROUTE_REGISTRY[key];
  if (registration.group === null) {
    throw new Error(`Route ${key} 不是菜单分组路由`);
  }

  return Object.freeze({
    capability,
    group: registration.group,
    icon: registration.icon,
    isNew,
    key,
    name,
    order,
    path: registration.path,
    visible: true,
  });
}

export const MENU_ROWS = Object.freeze([
  createMenuRow('home', '工作台', 1, '任意登录用户'),
  createMenuRow('tasks', '任务', 2, '任一业务能力'),
  createMenuRow('workspaces', '工作区', 3, '任一业务能力'),
  createMenuRow('messages', '消息中心', 5, '任意登录用户'),
  createMenuRow('team-board', '团队看板', 6, 'board.team 团队看板'),
  createMenuRow('audit', '审计看板', 7, 'audit.view 审计看板'),
  createMenuRow('admin.workspaces', '工作区管理', 8, 'admin.ws 工作区管理'),
  createMenuRow('admin.organization', '组织管理', 9, 'admin.* 管理能力', true),
  createMenuRow('admin.skills', '技能管理', 10, 'admin.skill 技能管理'),
  createMenuRow('admin.models', '模型管理', 11, 'admin.model 模型管理'),
  createMenuRow('admin.roles', '角色管理', 12, 'admin.role 角色管理'),
  createMenuRow('admin.users', '用户管理', 13, 'admin.user 用户管理'),
  createMenuRow('admin.grants', 'Grant 管理', 14, 'admin.* 管理能力', true),
  createMenuRow('admin.policies', 'Policy 发布', 15, 'admin.* 管理能力', true),
  createMenuRow('admin.menus', '菜单管理', 16, 'admin.menu 菜单管理'),
] as const satisfies readonly MenuRow[]);

export const MENU_GROUP_OPTIONS = [
  { label: '全部分组', value: 'all' },
  { label: '用户端', value: 'user' },
  { label: '管理端', value: 'admin' },
] as const;

export const MENU_FORM_GROUP_OPTIONS = MENU_GROUP_OPTIONS.slice(1);

export const MENU_CAPABILITY_OPTIONS = [
  { label: '任意登录用户', value: '任意登录用户' },
  { label: '业务能力 (biz)', value: '任一业务能力' },
  { label: 'board.team 团队看板', value: 'board.team 团队看板' },
  { label: 'audit.view 审计看板', value: 'audit.view 审计看板' },
  { label: 'admin.* 管理能力', value: 'admin.* 管理能力' },
] as const;

export const MENU_VISIBILITY_OPTIONS = [
  { label: '全部显示状态', value: 'all' },
  { label: '已显示', value: 'visible' },
  { label: '已隐藏', value: 'hidden' },
] as const;

export const MENU_GROUP_META = {
  user: { label: '用户端', tone: 'brand' },
  admin: { label: '管理端', tone: 'neutral' },
} as const;
