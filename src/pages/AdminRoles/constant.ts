import type { CapabilityGroup, RoleFixture } from './type';

export const CAPABILITY_GROUPS = Object.freeze([
  Object.freeze({
    key: 'business',
    title: '业务能力',
    capabilities: Object.freeze([
      Object.freeze({ id: 'task.create', label: '创建任务' }),
      Object.freeze({ id: 'task.approve', label: '审批任务' }),
      Object.freeze({ id: 'task.review', label: '审核任务' }),
      Object.freeze({ id: 'task.assign', label: '分配任务' }),
      Object.freeze({ id: 'task.develop', label: '开发任务' }),
      Object.freeze({ id: 'mr.merge', label: '合并代码 (MR)' }),
      Object.freeze({ id: 'ws.config', label: '工作区配置' }),
    ]),
  }),
  Object.freeze({
    key: 'view',
    title: '观测能力',
    capabilities: Object.freeze([
      Object.freeze({ id: 'board.team', label: '团队看板' }),
      Object.freeze({ id: 'audit.view', label: '审计看板' }),
    ]),
  }),
  Object.freeze({
    key: 'admin',
    title: '管理端能力',
    capabilities: Object.freeze([
      Object.freeze({ id: 'admin.ws', label: '工作区管理' }),
      Object.freeze({ id: 'admin.skill', label: '技能管理' }),
      Object.freeze({ id: 'admin.model', label: '模型管理' }),
      Object.freeze({ id: 'admin.role', label: '角色管理' }),
      Object.freeze({ id: 'admin.user', label: '用户管理' }),
      Object.freeze({ id: 'admin.menu', label: '菜单管理' }),
      Object.freeze({ id: 'admin.org', label: '组织管理' }),
      Object.freeze({ id: 'admin.grant', label: 'Grant 管理' }),
      Object.freeze({ id: 'admin.policy', label: 'Policy 发布' }),
    ]),
  }),
] as const satisfies readonly CapabilityGroup[]);

export const ALL_CAPABILITY_IDS = Object.freeze(
  CAPABILITY_GROUPS.flatMap((group) =>
    group.capabilities.map((capability) => capability.id),
  ),
);

export const ROLE_FIXTURES = Object.freeze([
  Object.freeze({
    id: 'product',
    name: '产品',
    capabilities: Object.freeze(['task.create']),
    memberCount: 2,
  }),
  Object.freeze({
    id: 'product-leader',
    name: '产品Leader',
    capabilities: Object.freeze(['task.create', 'task.approve', 'board.team']),
    memberCount: 1,
  }),
  Object.freeze({
    id: 'frontend-developer',
    name: '前端开发',
    capabilities: Object.freeze(['task.develop']),
    memberCount: 3,
  }),
  Object.freeze({
    id: 'backend-developer',
    name: '后端开发',
    capabilities: Object.freeze(['task.develop']),
    memberCount: 3,
  }),
  Object.freeze({
    id: 'development-leader',
    name: '开发Leader',
    capabilities: Object.freeze([
      'task.review',
      'task.assign',
      'task.develop',
      'mr.merge',
      'ws.config',
      'board.team',
    ]),
    memberCount: 2,
  }),
  Object.freeze({
    id: 'manager',
    name: '经理',
    capabilities: Object.freeze([
      'task.create',
      'task.approve',
      'task.review',
      'task.assign',
      'task.develop',
      'mr.merge',
      'ws.config',
      'board.team',
      'audit.view',
    ]),
    memberCount: 2,
  }),
  Object.freeze({
    id: 'administrator',
    name: '管理员',
    capabilities: Object.freeze([
      'audit.view',
      'admin.ws',
      'admin.skill',
      'admin.model',
      'admin.role',
      'admin.user',
      'admin.menu',
      'admin.org',
      'admin.grant',
      'admin.policy',
    ]),
    memberCount: 1,
  }),
  Object.freeze({
    id: 'super-administrator',
    name: '超级管理员',
    capabilities: ALL_CAPABILITY_IDS,
    memberCount: 1,
    locked: true,
  }),
] as const satisfies readonly RoleFixture[]);

export const INITIAL_CAPABILITY_OPTIONS = Object.freeze([
  Object.freeze({ label: '开发任务', value: 'task.develop' }),
  Object.freeze({ label: '创建任务', value: 'task.create' }),
  Object.freeze({ label: '审批任务', value: 'task.approve' }),
  Object.freeze({ label: '审核任务', value: 'task.review' }),
  Object.freeze({ label: '分配任务', value: 'task.assign' }),
  Object.freeze({ label: '合并代码 (MR)', value: 'mr.merge' }),
  Object.freeze({ label: '团队看板', value: 'board.team' }),
]);
