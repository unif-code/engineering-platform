import { APP_PATHS } from '@/features/navigation';
import type { WorkbenchListItem, WorkbenchMetric } from './type';

export const WORKBENCH_METRICS = [
  {
    title: '待处理 Gate',
    value: 3,
    description: '2 个 Requirement · 1 个 Release',
  },
  {
    title: '我的进行中任务',
    value: 8,
    description: '其中 2 个接近计划边界',
  },
  {
    title: '运行中 Agent Attempt',
    value: 4,
    description: 'Sandbox 资源健康',
  },
  {
    title: '本周已合并 MR',
    value: 12,
    description: '全部具备 Trace Evidence',
  },
] as const satisfies readonly WorkbenchMetric[];

export const PENDING_APPROVALS = [
  {
    key: 'requirement-1042',
    code: 'REQ-1042',
    title: '工作区成员权限调整',
    description: 'Requirement Gate · 今天 10:24 提交',
    status: '待 Requirement 审批',
    tone: 'warning',
    href: APP_PATHS.tasks,
    actionLabel: '查看 REQ-1042',
  },
  {
    key: 'release-0087',
    code: 'REL-0087',
    title: '研发平台 0.1.0 发布',
    description: 'Release Gate · 昨天 17:40 提交',
    status: '待 Release 审批',
    tone: 'warning',
    href: APP_PATHS.tasks,
    actionLabel: '查看 REL-0087',
  },
] as const satisfies readonly WorkbenchListItem[];

export const MY_TASKS = [
  {
    key: 'task-1024',
    code: 'TASK-1024',
    title: '营销活动页改版',
    description: '负责人 陈晓 · 今天 10:24 更新',
    status: '待验收',
    tone: 'info',
    href: APP_PATHS.tasks,
    actionLabel: '查看 TASK-1024',
  },
  {
    key: 'task-1025',
    code: 'TASK-1025',
    title: '优惠券中心小程序',
    description: '负责人 王悦 · 昨天更新',
    status: '需求对齐',
    tone: 'brand',
    href: APP_PATHS.tasks,
    actionLabel: '查看 TASK-1025',
  },
  {
    key: 'task-1018',
    code: 'TASK-1018',
    title: '分享裂变组件',
    description: '负责人 郑楠 · 昨天更新',
    status: '评审中',
    tone: 'purple',
    href: APP_PATHS.tasks,
    actionLabel: '查看 TASK-1018',
  },
] as const satisfies readonly WorkbenchListItem[];

export const RUNNING_AGENTS = [
  {
    key: 'attempt-4318',
    code: 'ATTEMPT-4318',
    title: '行情终端 K 线优化',
    description: '运行 42 分钟 · Sandbox 健康',
    status: '运行中',
    tone: 'success',
    href: APP_PATHS.tasks,
    actionLabel: '查看 ATTEMPT-4318',
  },
  {
    key: 'attempt-4312',
    code: 'ATTEMPT-4312',
    title: '网关限流配置台',
    description: '运行 18 分钟 · Sandbox 健康',
    status: '运行中',
    tone: 'success',
    href: APP_PATHS.tasks,
    actionLabel: '查看 ATTEMPT-4312',
  },
] as const satisfies readonly WorkbenchListItem[];

export const RECENT_MERGE_REQUESTS = [
  {
    key: 'mr-381',
    code: '!381',
    title: '营销活动页改版',
    description: 'feat/TASK-1024 → main',
    status: '待合并',
    tone: 'info',
    href: APP_PATHS.tasks,
    actionLabel: '查看 MR !381',
  },
  {
    key: 'mr-377',
    code: '!377',
    title: '委托下单流程重构',
    description: '机器人审核与确定性检查均已通过',
    status: '审核通过',
    tone: 'success',
    href: APP_PATHS.tasks,
    actionLabel: '查看 MR !377',
  },
] as const satisfies readonly WorkbenchListItem[];

export const PLATFORM_NOTICES = [
  {
    key: 'notice-skill-2-8',
    title: '前端开发规范（React）发布 v2.8',
    description: '新 Agent Attempt 自动使用，运行中 Binding 不受影响',
    status: '技能发布',
    tone: 'purple',
    href: APP_PATHS.messages,
    actionLabel: '查看技能发布公告',
  },
  {
    key: 'notice-model-rollout',
    title: '模型路由灰度范围调整至 20%',
    description: '变更已通过评测并记录审计证据',
    status: '平台动态',
    tone: 'brand',
    href: APP_PATHS.messages,
    actionLabel: '查看模型路由公告',
  },
] as const satisfies readonly WorkbenchListItem[];
