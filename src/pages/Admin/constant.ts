import { APP_PATHS } from '@/features/navigation';
import type { AdminEntry, AdminMetric, AdminRisk, SystemStatus } from './type';

export const ADMIN_METRICS = [
  {
    title: '平台用户',
    value: 58,
    description: '本周新增 3 位',
    tone: 'neutral',
  },
  {
    title: '活跃工作区',
    value: 12,
    description: '另有 2 个已归档',
    tone: 'brand',
  },
  {
    title: '已发布技能',
    value: 9,
    description: '其中 8 个启用',
    tone: 'purple',
  },
  {
    title: '今日模型调用',
    value: '42,318',
    description: '成功率 99.2%',
    tone: 'success',
  },
] as const satisfies readonly AdminMetric[];

export const ADMIN_ENTRIES = [
  {
    routeKey: 'admin.workspaces',
    label: '工作区管理',
    description: '维护 Owner、成员范围与仓库接入关系',
    href: APP_PATHS.adminWorkspaces,
  },
  {
    routeKey: 'admin.skills',
    label: '技能管理',
    description: '管理技能目录、版本与适用技术栈',
    href: APP_PATHS.adminSkills,
  },
  {
    routeKey: 'admin.models',
    label: '模型管理',
    description: '查看模型目录、评测与 Execution Route',
    href: APP_PATHS.adminModels,
  },
  {
    routeKey: 'admin.roles',
    label: '角色管理',
    description: '维护角色能力标签与授权边界',
    href: APP_PATHS.adminRoles,
  },
  {
    routeKey: 'admin.users',
    label: '用户管理',
    description: '维护用户、组织归属与账号状态',
    href: APP_PATHS.adminUsers,
  },
  {
    routeKey: 'admin.menus',
    label: '菜单管理',
    description: '配置菜单分组、可见能力与排序',
    href: APP_PATHS.adminMenus,
  },
] as const satisfies readonly AdminEntry[];

export const ADMIN_RISKS = [
  {
    key: 'risk-storage-capacity',
    title: 'Object Storage 容量接近预警线',
    description: '当前使用率 74%，建议在下一维护窗口扩容',
    status: '需关注',
    tone: 'warning',
    href: APP_PATHS.adminWorkspaces,
    actionLabel: '查看存储关联工作区',
  },
  {
    key: 'risk-model-evaluation',
    title: '2 个模型评测结果待确认',
    description: '结果已生成，尚未进入正式 Execution Route',
    status: '待处理',
    tone: 'info',
    href: APP_PATHS.adminModels,
    actionLabel: '查看模型评测',
  },
] as const satisfies readonly AdminRisk[];

export const SYSTEM_STATUSES = [
  {
    key: 'postgresql',
    name: 'PostgreSQL',
    description: '连接池与备份任务稳定',
    percent: 99,
    status: '正常',
    tone: 'success',
  },
  {
    key: 'nats',
    name: 'NATS',
    description: '消息积压处于健康范围',
    percent: 97,
    status: '正常',
    tone: 'success',
  },
  {
    key: 'object-storage',
    name: 'Object Storage',
    description: '容量使用率需要持续观察',
    percent: 74,
    status: '观察中',
    tone: 'warning',
  },
  {
    key: 'secret-store',
    name: 'Secret Store',
    description: '密钥轮换任务已按计划完成',
    percent: 100,
    status: '正常',
    tone: 'success',
  },
] as const satisfies readonly SystemStatus[];
