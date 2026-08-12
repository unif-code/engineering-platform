import type { TeamBoardFixture, TeamOption } from './type';

export const TEAM_OPTIONS = [
  { label: '营销', value: '营销' },
  { label: '交易', value: '交易' },
  { label: '中台', value: '中台' },
] satisfies TeamOption[];

export const TEAM_FIXTURES = [
  {
    name: '营销',
    metrics: [
      {
        key: 'work-in-progress',
        title: '进行中',
        value: 14,
        description: '覆盖需求对齐至验收阶段',
        tone: 'brand',
      },
      {
        key: 'weekly-completed',
        title: '本周完成',
        value: 9,
        description: '最近 7 天已交付任务',
        tone: 'success',
      },
      {
        key: 'blockers',
        title: '阻塞',
        value: 2,
        description: '需要跨角色协同处理',
        tone: 'warning',
      },
      {
        key: 'agent-participation',
        title: 'Agent 参与率',
        value: '78%',
        description: '成员任务中的 Agent 覆盖率',
        tone: 'info',
      },
    ],
    throughput: [6, 8, 7, 9, 11, 10, 9, 12].map((value, index) => ({
      key: `week-${index + 1}`,
      label: `W${index + 1}`,
      value,
    })),
    distribution: [
      { key: 'alignment', label: '需求对齐', value: 3 },
      { key: 'approval', label: '待审批', value: 2 },
      { key: 'development', label: '开发中', value: 5 },
      { key: 'review', label: '评审中', value: 3 },
      { key: 'acceptance', label: '验收', value: 1 },
    ],
    members: [
      {
        key: 'chen-xiao',
        name: '陈晓',
        activeTasks: 5,
        agentParticipation: 82,
        overloaded: true,
      },
      {
        key: 'zheng-nan',
        name: '郑楠',
        activeTasks: 4,
        agentParticipation: 75,
      },
      {
        key: 'xu-lei',
        name: '徐蕾',
        activeTasks: 3,
        agentParticipation: 64,
      },
      {
        key: 'gao-yang',
        name: '高扬',
        activeTasks: 2,
        agentParticipation: 51,
      },
    ],
    mergeCycle: [3.2, 2.8, 2.5, 2.6, 2.2, 2, 1.9, 1.8].map((value, index) => ({
      key: `week-${index + 1}`,
      label: `W${index + 1}`,
      value,
      valueLabel: `${value}d`,
    })),
    mergeCycleAverage: '1.8 天',
    blockers: [
      {
        key: 'MK-1025',
        title: '需求对齐超 3 天',
        description: 'MK-1025 · 产品未响应澄清问题',
        status: '待处理',
        tone: 'warning',
      },
      {
        key: 'MK-1018',
        title: '评审意见超 2 天未处理',
        description: 'MK-1018',
        status: '待处理',
        tone: 'warning',
      },
    ],
  },
  {
    name: '交易',
    metrics: [
      {
        key: 'work-in-progress',
        title: '进行中',
        value: 11,
        description: '覆盖需求对齐至验收阶段',
        tone: 'brand',
      },
      {
        key: 'weekly-completed',
        title: '本周完成',
        value: 7,
        description: '最近 7 天已交付任务',
        tone: 'success',
      },
      {
        key: 'blockers',
        title: '阻塞',
        value: 1,
        description: '等待产品补充交互说明',
        tone: 'warning',
      },
      {
        key: 'agent-participation',
        title: 'Agent 参与率',
        value: '71%',
        description: '成员任务中的 Agent 覆盖率',
        tone: 'info',
      },
    ],
    throughput: [5, 6, 8, 7, 9, 8, 10, 9].map((value, index) => ({
      key: `week-${index + 1}`,
      label: `W${index + 1}`,
      value,
    })),
    distribution: [
      { key: 'alignment', label: '需求对齐', value: 2 },
      { key: 'approval', label: '待审批', value: 1 },
      { key: 'development', label: '开发中', value: 4 },
      { key: 'review', label: '评审中', value: 2 },
      { key: 'acceptance', label: '验收', value: 2 },
    ],
    members: [
      {
        key: 'he-shan',
        name: '何山',
        activeTasks: 4,
        agentParticipation: 77,
      },
      {
        key: 'song-jia',
        name: '宋佳',
        activeTasks: 3,
        agentParticipation: 66,
      },
      {
        key: 'ding-yi',
        name: '丁一',
        activeTasks: 3,
        agentParticipation: 58,
      },
    ],
    mergeCycle: [2.9, 2.7, 2.8, 2.4, 2.3, 2.1, 2.2, 2].map((value, index) => ({
      key: `week-${index + 1}`,
      label: `W${index + 1}`,
      value,
      valueLabel: `${value}d`,
    })),
    mergeCycleAverage: '2.0 天',
    blockers: [
      {
        key: 'TR-2201',
        title: 'Agent 等待补充 K 线交互说明',
        description: 'TR-2201',
        status: '待补充',
        tone: 'warning',
      },
    ],
  },
  {
    name: '中台',
    metrics: [
      {
        key: 'work-in-progress',
        title: '进行中',
        value: 8,
        description: '覆盖需求对齐至验收阶段',
        tone: 'brand',
      },
      {
        key: 'weekly-completed',
        title: '本周完成',
        value: 5,
        description: '最近 7 天已交付任务',
        tone: 'success',
      },
      {
        key: 'blockers',
        title: '阻塞',
        value: 0,
        description: '当前无阻塞任务',
        tone: 'success',
      },
      {
        key: 'agent-participation',
        title: 'Agent 参与率',
        value: '64%',
        description: '成员任务中的 Agent 覆盖率',
        tone: 'info',
      },
    ],
    throughput: [4, 5, 4, 6, 5, 7, 6, 7].map((value, index) => ({
      key: `week-${index + 1}`,
      label: `W${index + 1}`,
      value,
    })),
    distribution: [
      { key: 'alignment', label: '需求对齐', value: 1 },
      { key: 'approval', label: '待审批', value: 2 },
      { key: 'development', label: '开发中', value: 3 },
      { key: 'review', label: '评审中', value: 1 },
      { key: 'acceptance', label: '验收', value: 1 },
    ],
    members: [
      {
        key: 'kang-ning',
        name: '康宁',
        activeTasks: 3,
        agentParticipation: 70,
      },
      {
        key: 'bai-lu',
        name: '白露',
        activeTasks: 3,
        agentParticipation: 61,
      },
      {
        key: 'ji-hui',
        name: '纪辉',
        activeTasks: 2,
        agentParticipation: 55,
      },
    ],
    mergeCycle: [3.5, 3.2, 3, 2.9, 2.8, 2.6, 2.5, 2.4].map((value, index) => ({
      key: `week-${index + 1}`,
      label: `W${index + 1}`,
      value,
      valueLabel: `${value}d`,
    })),
    mergeCycleAverage: '2.4 天',
    blockers: [],
  },
] as const satisfies readonly TeamBoardFixture[];
