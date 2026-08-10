import type { SemanticTone } from '@/types/presentation';
import type { TaskRow, TaskStage, TaskStatus } from './type';

function freezeRows(rows: TaskRow[]): readonly TaskRow[] {
  return Object.freeze(rows.map((row) => Object.freeze(row)));
}

export const TASK_STAGES: readonly TaskStage[] = [
  'Clarification',
  'Spec',
  'Plan',
  'Implementation',
  'Review',
];

export const TASK_STATUS_META: Record<
  TaskStatus,
  { label: string; tone: SemanticTone }
> = {
  pending: { label: '待处理', tone: 'warning' },
  running: { label: '运行中', tone: 'brand' },
  blocked: { label: '阻塞', tone: 'danger' },
  completed: { label: '已完成', tone: 'success' },
};

export const TASK_STATUS_OPTIONS = [
  { label: '全部状态', value: 'all' },
  { label: '待处理', value: 'pending' },
  { label: '运行中', value: 'running' },
  { label: '阻塞', value: 'blocked' },
  { label: '已完成', value: 'completed' },
] as const;

export const TASK_ROWS: readonly TaskRow[] = freezeRows([
  {
    id: 'REQ-2026-0142',
    title: '统一任务创建链路',
    workspace: '平台工作区',
    stage: 'Implementation',
    status: 'running',
    owner: '陈晓',
    updatedAt: '2026-08-09T16:20:00+08:00',
  },
  {
    id: 'REQ-2026-0138',
    title: '制品仓库迁移演练',
    workspace: '交付工作区',
    stage: 'Review',
    status: 'blocked',
    owner: '郑楠',
    updatedAt: '2026-08-08T14:05:00+08:00',
  },
  {
    id: 'REQ-2026-0129',
    title: '权限模型交付验收',
    workspace: '平台工作区',
    stage: 'Review',
    status: 'completed',
    owner: '李强',
    updatedAt: '2026-08-07T11:30:00+08:00',
  },
  {
    id: 'REQ-2026-0124',
    title: 'Agent 执行计划校准',
    workspace: '智能研发工作区',
    stage: 'Plan',
    status: 'pending',
    owner: '周宁',
    updatedAt: '2026-08-06T18:10:00+08:00',
  },
  {
    id: 'REQ-2026-0119',
    title: '需求澄清模板升级',
    workspace: '产品工作区',
    stage: 'Clarification',
    status: 'running',
    owner: '王悦',
    updatedAt: '2026-08-05T09:45:00+08:00',
  },
  {
    id: 'REQ-2026-0113',
    title: '交付证据规格补全',
    workspace: '治理工作区',
    stage: 'Spec',
    status: 'pending',
    owner: '吴桐',
    updatedAt: '2026-08-04T15:00:00+08:00',
  },
]);

export const ARCHIVED_TASK_ROWS: readonly TaskRow[] = freezeRows([
  {
    id: 'REQ-2026-0098',
    title: '旧版流水线审计收口',
    workspace: '交付工作区',
    stage: 'Review',
    status: 'completed',
    owner: '刘洋',
    updatedAt: '2026-07-28T10:35:00+08:00',
  },
  {
    id: 'REQ-2026-0087',
    title: '历史工作区配置迁移',
    workspace: '平台工作区',
    stage: 'Implementation',
    status: 'completed',
    owner: '高扬',
    updatedAt: '2026-07-19T13:20:00+08:00',
  },
]);

export const WORKSPACE_OPTIONS = [
  { label: '平台工作区', value: 'platform' },
  { label: '交付工作区', value: 'delivery' },
  { label: '智能研发工作区', value: 'agent' },
] as const;

export const REPOSITORY_OPTIONS = [
  { label: 'engineering-platform', value: 'engineering-platform' },
  {
    label: 'engineering-platform-backend',
    value: 'engineering-platform-backend',
  },
  {
    label: 'engineering-platform-gitops',
    value: 'engineering-platform-gitops',
  },
] as const;

export const EMPLOYEE_OPTIONS = [
  { label: '林一 · 前端开发', value: 'E1007' },
  { label: '郑楠 · 后端开发', value: 'E1008' },
  { label: '周宁 · 开发 Leader', value: 'E1009' },
] as const;
