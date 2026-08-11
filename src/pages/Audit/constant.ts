import type { ProDescriptionsProps } from '@ant-design/pro-components';
import { Typography } from 'antd';
import { createElement } from 'react';
import type { MiniBarDatum } from '@/components/MiniBarChart';
import { SemanticTag } from '@/components/SemanticTag';
import type { SemanticTone } from '@/types/presentation';
import { AuditRequestId } from './AuditRequestId';
import type { AuditQueryParams, AuditRow } from './type';

export const AUDIT_PAGE_SIZE = 3;

export const AUDIT_METRICS = [
  {
    description: '当前审计样本',
    title: '审计事件',
    tone: 'neutral' as const,
    value: 9,
  },
  {
    description: '最近一个审计日',
    title: '今日事件',
    tone: 'brand' as const,
    value: 4,
  },
  {
    description: '需要优先复核',
    title: '高风险事件',
    tone: 'danger' as const,
    value: 4,
  },
  {
    description: '未形成业务效果',
    title: '已拒绝',
    tone: 'warning' as const,
    value: 2,
  },
] as const;

export const AUDIT_RESULT_COUNTS: Record<AuditRow['result'], number> = {
  rejected: 2,
  success: 7,
};

export const AUDIT_RANGE_OPTIONS = [
  { label: '全部时间', value: 'all' },
  { label: '今天', value: 'today' },
  { label: '近 7 天', value: '7d' },
  { label: '近 30 天', value: '30d' },
] satisfies ReadonlyArray<{
  label: string;
  value: NonNullable<AuditQueryParams['range']>;
}>;

export const AUDIT_ACTION_OPTIONS = [
  { label: '全部动作', value: 'all' },
  { label: 'Capability Activate', value: 'Capability Activate' },
  { label: 'Artifact Accept', value: 'Artifact Accept' },
  { label: 'Promotion', value: 'Promotion' },
  { label: 'Config Publish', value: 'Config Publish' },
] satisfies ReadonlyArray<{
  label: string;
  value: NonNullable<AuditQueryParams['action']>;
}>;

export const AUDIT_RISK_OPTIONS = [
  { label: '全部风险', value: 'all' },
  { label: '低风险', value: 'low' },
  { label: '中风险', value: 'medium' },
  { label: '高风险', value: 'high' },
] satisfies ReadonlyArray<{
  label: string;
  value: NonNullable<AuditQueryParams['risk']>;
}>;

export const AUDIT_TARGET_TYPE_OPTIONS = [
  { label: '全部目标', value: 'all' },
  { label: '配置', value: 'CONFIGURATION' },
  { label: '制品', value: 'ARTIFACT' },
  { label: 'Capability', value: 'CAPABILITY' },
  { label: 'Grant', value: 'GRANT' },
  { label: 'Workspace', value: 'WORKSPACE' },
] satisfies ReadonlyArray<{
  label: string;
  value: NonNullable<AuditQueryParams['targetType']>;
}>;

export const AUDIT_TREND: readonly MiniBarDatum[] = [
  { key: '08-04', label: '08-04', value: 0, valueLabel: '0' },
  { key: '08-05', label: '08-05', value: 1, valueLabel: '1' },
  { key: '08-06', label: '08-06', value: 0, valueLabel: '0' },
  { key: '08-07', label: '08-07', value: 1, valueLabel: '1' },
  { key: '08-08', label: '08-08', value: 1, valueLabel: '1' },
  { key: '08-09', label: '08-09', value: 1, valueLabel: '1' },
  {
    key: '08-10',
    label: '08-10',
    value: 4,
    valueLabel: '4',
    tone: 'success',
  },
];

export const AUDIT_ACTION_DISTRIBUTION: readonly MiniBarDatum[] = [
  { key: 'config', label: '配置', value: 4, valueLabel: '4' },
  { key: 'artifact', label: '制品', value: 2, valueLabel: '2' },
  { key: 'promotion', label: '晋级', value: 2, valueLabel: '2' },
  { key: 'capability', label: '能力', value: 1, valueLabel: '1' },
];

export const AUDIT_RISK_META: Record<
  AuditRow['risk'],
  { label: string; tone: SemanticTone }
> = {
  low: { label: '低风险', tone: 'success' },
  medium: { label: '中风险', tone: 'warning' },
  high: { label: '高风险', tone: 'danger' },
};

export const AUDIT_RESULT_META: Record<
  AuditRow['result'],
  { label: string; tone: SemanticTone }
> = {
  success: { label: '成功', tone: 'success' },
  rejected: { label: '已拒绝', tone: 'danger' },
};

export const AUDIT_DETAIL_COLUMNS: NonNullable<
  ProDescriptionsProps<AuditRow>['columns']
> = [
  { dataIndex: 'id', title: '事件 ID', valueType: 'text' },
  { dataIndex: 'occurredAt', title: '发生时间', valueType: 'dateTime' },
  { dataIndex: 'actor', title: '操作人', valueType: 'text' },
  { dataIndex: 'action', title: '动作', valueType: 'text' },
  { dataIndex: 'target', title: '目标', valueType: 'text' },
  { dataIndex: 'targetType', title: '目标类型', valueType: 'text' },
  { dataIndex: 'targetId', title: '目标 ID', valueType: 'text' },
  {
    dataIndex: 'risk',
    render: (_, row) => createElement(SemanticTag, AUDIT_RISK_META[row.risk]),
    title: '风险等级',
  },
  {
    dataIndex: 'result',
    render: (_, row) =>
      createElement(SemanticTag, AUDIT_RESULT_META[row.result]),
    title: '结果',
  },
  {
    dataIndex: 'correlationId',
    render: (_, row) =>
      createElement(Typography.Text, { code: true }, row.correlationId),
    title: 'Correlation ID',
  },
  { dataIndex: 'summary', title: '完整摘要', valueType: 'text' },
  { dataIndex: 'reason', title: '原因', valueType: 'text' },
  {
    dataIndex: 'requestId',
    render: (_, row) =>
      createElement(AuditRequestId, { requestId: row.requestId }),
    title: 'Request ID',
  },
];
