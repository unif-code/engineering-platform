import type { ChartDatum } from '@/types/presentation';
import type { ModelEvaluationRow, ModelRow, ModelUsageMetric } from './type';

export const MODEL_ROWS = Object.freeze([
  Object.freeze({
    id: 'model-gpt-4-1',
    name: 'GPT-4.1',
    provider: 'OpenAI',
    contextWindow: 1_048_576,
    status: 'active',
    purpose: '复杂推理与代码生成',
    updatedAt: '2026-08-10T09:30:00+08:00',
  }),
  Object.freeze({
    id: 'model-claude-sonnet-4',
    name: 'Claude Sonnet 4',
    provider: 'Anthropic',
    contextWindow: 200_000,
    status: 'active',
    purpose: '需求分析与长文档理解',
    updatedAt: '2026-08-09T17:45:00+08:00',
  }),
  Object.freeze({
    id: 'model-qwen3-coder',
    name: 'Qwen3-Coder',
    provider: 'Alibaba Cloud',
    contextWindow: 262_144,
    status: 'evaluation',
    purpose: '代码实现与仓库分析',
    updatedAt: '2026-08-08T14:20:00+08:00',
  }),
  Object.freeze({
    id: 'model-deepseek-r1',
    name: 'DeepSeek-R1',
    provider: 'DeepSeek',
    contextWindow: 128_000,
    status: 'disabled',
    purpose: '推理任务的备选路由',
    updatedAt: '2026-08-07T11:10:00+08:00',
  }),
] as const satisfies readonly ModelRow[]);

export const MODEL_STATUS_OPTIONS = [
  { label: '全部状态', value: 'all' },
  { label: '活跃', value: 'active' },
  { label: '评测中', value: 'evaluation' },
  { label: '已停用', value: 'disabled' },
] as const;

export const MODEL_FORM_STATUS_OPTIONS = MODEL_STATUS_OPTIONS.slice(1);

export const MODEL_STATUS_META = {
  active: { label: '活跃', tone: 'success' },
  evaluation: { label: '评测中', tone: 'warning' },
  disabled: { label: '已停用', tone: 'neutral' },
} as const;

export const MODEL_PROVIDER_OPTIONS = [
  { label: 'OpenAI', value: 'OpenAI' },
  { label: 'Anthropic', value: 'Anthropic' },
  { label: 'Alibaba Cloud', value: 'Alibaba Cloud' },
  { label: 'DeepSeek', value: 'DeepSeek' },
] as const;

export const MODEL_USAGE_METRICS = [
  {
    key: 'daily-calls',
    title: '今日调用',
    value: '12,846',
    description: '较昨日增加 8.4%',
    tone: 'brand',
  },
  {
    key: 'success-rate',
    title: '成功率',
    value: '99.2%',
    description: '高于 99% 服务目标',
    tone: 'success',
  },
  {
    key: 'latency',
    title: '平均延迟',
    value: '1.8s',
    description: 'P95 为 3.6 秒',
    tone: 'info',
  },
  {
    key: 'daily-cost',
    title: '今日成本',
    value: '¥386.42',
    description: '预算消耗 64%',
    tone: 'warning',
  },
] as const satisfies readonly ModelUsageMetric[];

export const MODEL_USAGE_TREND = [
  { key: 'mon', label: '周一', value: 9_420, valueLabel: '9,420 次' },
  { key: 'tue', label: '周二', value: 10_180, valueLabel: '10,180 次' },
  { key: 'wed', label: '周三', value: 10_760, valueLabel: '10,760 次' },
  { key: 'thu', label: '周四', value: 11_240, valueLabel: '11,240 次' },
  { key: 'fri', label: '周五', value: 11_980, valueLabel: '11,980 次' },
  { key: 'sat', label: '周六', value: 12_210, valueLabel: '12,210 次' },
  {
    key: 'sun',
    label: '周日',
    value: 12_846,
    valueLabel: '12,846 次',
    tone: 'success',
  },
] as const satisfies readonly ChartDatum[];

export const MODEL_PROVIDER_DISTRIBUTION = [
  { key: 'openai', label: 'OpenAI', value: 38, tone: 'brand' },
  { key: 'anthropic', label: 'Anthropic', value: 31, tone: 'info' },
  {
    key: 'alibaba-cloud',
    label: 'Alibaba Cloud',
    value: 21,
    tone: 'success',
  },
  { key: 'deepseek', label: 'DeepSeek', value: 10, tone: 'warning' },
] as const satisfies readonly ChartDatum[];

export const MODEL_EVALUATION_ROWS = Object.freeze([
  Object.freeze({
    id: 'evaluation-gpt-4-1-reasoning',
    modelName: 'GPT-4.1',
    benchmark: 'Requirement Reasoning',
    score: 89.2,
    status: 'passed',
    evaluatedAt: '2026-08-10T08:40:00+08:00',
  }),
  Object.freeze({
    id: 'evaluation-claude-sonnet-4-swe',
    modelName: 'Claude Sonnet 4',
    benchmark: 'SWE-bench Verified',
    score: 72.4,
    status: 'passed',
    evaluatedAt: '2026-08-09T16:30:00+08:00',
  }),
  Object.freeze({
    id: 'evaluation-qwen3-coder-internal',
    modelName: 'Qwen3-Coder',
    benchmark: 'Internal Code Eval',
    score: 81.6,
    status: 'review',
    evaluatedAt: '2026-08-08T13:50:00+08:00',
  }),
] as const satisfies readonly ModelEvaluationRow[]);

export const MODEL_EVALUATION_STATUS_META = {
  passed: { label: '已通过', tone: 'success' },
  review: { label: '待确认', tone: 'warning' },
} as const;
