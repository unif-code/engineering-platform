import type { ChartDatum } from '@/types/presentation';
import type {
  ModelEvaluationJob,
  ModelEvaluationRow,
  ModelRow,
  ModelUsageMetric,
} from './type';

export const MODEL_ROWS = Object.freeze([
  Object.freeze({
    id: 'deepseek-v4',
    name: 'DeepSeek V4',
    deployment: 'deepseek-v4',
    use: 'Chat + Execution',
    access: '百炼 compatible-mode',
    context: '256K',
    rateLimit: 600,
    status: 'active',
    capabilityTags: 'chat, coding-backend',
    routeWeight: 60,
  }),
  Object.freeze({
    id: 'qwen3-8-max',
    name: 'Qwen3.8 Max',
    deployment: 'qwen3.8-max',
    use: 'Execution · coding',
    access: '百炼 compatible-mode',
    context: '1M',
    rateLimit: 400,
    status: 'active',
    capabilityTags: 'coding-frontend, coding-backend',
    routeWeight: 80,
  }),
  Object.freeze({
    id: 'kimi3',
    name: 'Kimi3',
    deployment: 'kimi3',
    use: 'Chat',
    access: '百炼 compatible-mode',
    context: '512K',
    rateLimit: 300,
    status: 'active',
    capabilityTags: 'chat, long-context',
    routeWeight: 40,
  }),
  Object.freeze({
    id: 'claude-opus-5',
    name: 'Claude Opus 5',
    deployment: 'claude-opus-5',
    use: 'Execution · review',
    access: 'Adapter 直连',
    context: '400K',
    rateLimit: 120,
    status: 'active',
    capabilityTags: 'review-code, long-context',
    routeWeight: 30,
  }),
  Object.freeze({
    id: 'gpt-5-6',
    name: 'GPT-5.6',
    deployment: 'gpt-5.6',
    use: 'Execution · frontend',
    access: 'Adapter 直连',
    context: '512K',
    rateLimit: 200,
    status: 'inactive',
    capabilityTags: 'coding-frontend',
    routeWeight: 20,
  }),
] as const satisfies readonly ModelRow[]);

export const MODEL_STATUS_META = {
  active: { label: '启用', tone: 'success' },
  inactive: { label: '禁用', tone: 'neutral' },
} as const;

export const MODEL_USE_OPTIONS = [
  { label: 'Chat', value: 'Chat' },
  { label: 'Execution · coding', value: 'Execution · coding' },
  { label: 'Execution · review', value: 'Execution · review' },
  { label: 'Chat + Execution', value: 'Chat + Execution' },
] as const;

export const MODEL_ACCESS_OPTIONS = [
  { label: '百炼 compatible-mode', value: '百炼 compatible-mode' },
  { label: 'Adapter 直连', value: 'Adapter 直连' },
] as const;

export const MODEL_FORM_STATUS_OPTIONS = [
  { label: '灰度', value: 'evaluation' },
  { label: '启用', value: 'active' },
  { label: '停用', value: 'inactive' },
] as const;

export const MODEL_USAGE_METRICS = [
  {
    key: 'daily-calls',
    title: '今日调用',
    value: '42,318',
    description: '+12.4% vs 昨日',
    tone: 'brand',
  },
  {
    key: 'tokens',
    title: 'Token 消耗',
    value: '8.6B',
    description: '输入 6.1B · 输出 2.5B',
    tone: 'info',
  },
  {
    key: 'cost',
    title: '成本估算',
    value: '¥21,450',
    description: '本月累计 ¥38.2万',
    tone: 'warning',
  },
  {
    key: 'success-rate',
    title: '成功率',
    value: '99.2%',
    description: '失败 341 次',
    tone: 'success',
  },
  {
    key: 'latency',
    title: 'P95 延迟',
    value: '3.8s',
    description: 'P50 1.2s',
    tone: 'info',
  },
  {
    key: 'chat-agent',
    title: 'Chat / Agent',
    value: '38 / 62',
    description: 'Agent 26,237 次',
    tone: 'brand',
  },
] as const satisfies readonly ModelUsageMetric[];

export const MODEL_USAGE_TREND = [
  { key: '07-24', label: '7-24', value: 52 },
  { key: '07-25', label: '7-25', value: 61 },
  { key: '07-26', label: '7-26', value: 58 },
  { key: '07-27', label: '7-27', value: 64 },
  { key: '07-28', label: '7-28', value: 70 },
  { key: '07-29', label: '7-29', value: 66 },
  { key: '07-30', label: '7-30', value: 74 },
  { key: '07-31', label: '7-31', value: 71 },
  { key: '08-01', label: '8-1', value: 78 },
  { key: '08-02', label: '8-2', value: 82 },
  { key: '08-03', label: '8-3', value: 76 },
  { key: '08-04', label: '8-4', value: 88 },
  { key: '08-05', label: '8-5', value: 92 },
  { key: '08-06', label: '8-6', value: 100, tone: 'brand' },
] as const satisfies readonly ChartDatum[];

export const MODEL_CHANNEL_DISTRIBUTION = [
  { key: 'chat', label: 'Chat', value: 38, valueLabel: '16,081 次' },
  { key: 'agent', label: 'Agent', value: 62, valueLabel: '26,237 次' },
] as const satisfies readonly ChartDatum[];

export const MODEL_DEPLOYMENT_DISTRIBUTION = [
  { key: 'qwen', label: 'qwen3.8-max', value: 34 },
  { key: 'deepseek', label: 'deepseek-v4', value: 28 },
  { key: 'claude', label: 'claude-opus-5', value: 16 },
  { key: 'gpt', label: 'gpt-5.6', value: 14 },
  { key: 'kimi', label: 'kimi3', value: 8 },
] as const satisfies readonly ChartDatum[];

export const MODEL_TEAM_DISTRIBUTION = [
  { key: 'marketing', label: '营销', value: 38 },
  { key: 'trading', label: '交易', value: 33 },
  { key: 'platform', label: '中台', value: 21 },
  { key: 'other', label: '其他', value: 8 },
] as const satisfies readonly ChartDatum[];

export const MODEL_EVALUATION_JOBS = Object.freeze([
  Object.freeze({
    key: 'promptfoo',
    name: 'promptfoo 回归',
    version: '版本锁定 v0.118',
    use: '模型 / Prompt 变更后的断言回归',
    mode: '受控 Job · 经 ModelEvaluationPort → ModelGatewayPort',
    latest: '最近：PF-0806-02 · qwen3.8-max · 128 断言 126 通过',
  }),
  Object.freeze({
    key: 'evalscope',
    name: 'EvalScope 基准',
    version: '版本锁定 v1.4',
    use: '模型选型与性能基准（吞吐 / 延迟 / 质量）',
    mode: '按需 Job · 不常驻 · 不持有 Provider 凭据',
    latest: '最近：ES-0801-01 · glm-5 vs qwen3.8-max 对比',
  }),
] as const satisfies readonly ModelEvaluationJob[]);

export const MODEL_EVALUATION_ROWS = Object.freeze([
  Object.freeze({
    id: 'EV-3312',
    type: 'promptfoo 回归',
    deployment: 'qwen3.8-max',
    snapshot: 'prompts@v2.8 · 128 断言 · 阈值 98%',
    conclusion: '126/128 通过 · owner 判定：通过',
    status: 'passed',
    evaluatedAt: '08-06 09:40',
  }),
  Object.freeze({
    id: 'EV-3298',
    type: 'EvalScope 基准',
    deployment: 'glm-5（候选）',
    snapshot: 'C-Eval + 内部集 · QPS 40',
    conclusion: '质量 -2.1% · 延迟 -18% · 待决策',
    status: 'review',
    evaluatedAt: '08-01 15:22',
  }),
  Object.freeze({
    id: 'EV-3287',
    type: 'promptfoo 回归',
    deployment: 'deepseek-v4',
    snapshot: 'prompts@v2.7 · 128 断言 · 阈值 98%',
    conclusion: '128/128 通过 · owner 判定：通过',
    status: 'passed',
    evaluatedAt: '07-29 11:08',
  }),
] as const satisfies readonly ModelEvaluationRow[]);
