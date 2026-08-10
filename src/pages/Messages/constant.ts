import type {
  MessageCategory,
  MessageCategoryOption,
  MessageRecord,
} from './type';

export const MESSAGE_CATEGORY_OPTIONS = [
  { label: '全部', value: 'all' },
  { label: 'Gate', value: 'gate' },
  { label: 'Agent', value: 'agent' },
  { label: 'MR', value: 'mr' },
  { label: '系统', value: 'system' },
] satisfies MessageCategoryOption[];

export const MESSAGE_CATEGORY_LABELS: Record<MessageCategory, string> = {
  all: '全部',
  gate: 'Gate',
  agent: 'Agent',
  mr: 'MR',
  system: '系统',
};

export const MESSAGE_FIXTURES = [
  {
    id: 'platform-guideline-update',
    category: 'all',
    title: '前端开发规范已更新',
    description: 'React 开发规范 v2.8 已发布，新任务将自动使用最新版本。',
    time: '今天 11:06',
    unread: true,
    tone: 'purple',
  },
  {
    id: 'requirement-gate-pending',
    category: 'gate',
    title: 'Requirement Gate 等待审批',
    description: 'REQ-2026-0142 已进入 Requirement Gate，请及时处理。',
    time: '今天 10:24',
    unread: true,
    tone: 'warning',
  },
  {
    id: 'agent-attempt-finished',
    category: 'agent',
    title: 'Agent Attempt 执行完成',
    description: 'ATTEMPT-4318 已完成，Trace Evidence 可供查看。',
    time: '今天 09:48',
    unread: true,
    tone: 'success',
  },
  {
    id: 'merge-request-merged',
    category: 'mr',
    title: 'MR !381 已合并',
    description: '营销活动页改版已合并至 main，确定性检查全部通过。',
    time: '昨天 17:40',
    unread: false,
    tone: 'info',
  },
  {
    id: 'system-maintenance-window',
    category: 'system',
    title: '平台维护窗口提醒',
    description: '本周六凌晨将进行例行维护，请提前保存进行中的工作。',
    time: '昨天 16:15',
    unread: true,
    tone: 'brand',
  },
] as const satisfies readonly MessageRecord[];
