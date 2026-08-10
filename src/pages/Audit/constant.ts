import type { ProDescriptionsProps } from '@ant-design/pro-components';
import { Typography } from 'antd';
import { createElement } from 'react';
import type { MiniBarDatum } from '@/components/MiniBarChart';
import { SemanticTag } from '@/components/SemanticTag';
import type { SemanticTone } from '@/types/presentation';
import type { AuditQueryParams, AuditRow } from './type';

function freezeRows(rows: AuditRow[]): readonly AuditRow[] {
  return Object.freeze(rows.map((row) => Object.freeze(row)));
}

export const AUDIT_ROWS: readonly AuditRow[] = freezeRows([
  {
    id: 'AUD-2026-0810-001',
    occurredAt: '2026-08-10T18:40:00+08:00',
    actor: '孙杰',
    action: 'Config Publish',
    target: '生产策略 / access-policy-v8',
    risk: 'high',
    correlationId: 'corr-audit-0810-001',
    result: 'success',
  },
  {
    id: 'AUD-2026-0810-003',
    occurredAt: '2026-08-10T16:30:00+08:00',
    actor: '刘洋',
    action: 'Promotion',
    target: '策略服务 / release-2026.08',
    risk: 'high',
    correlationId: 'corr-audit-0810-003',
    result: 'success',
  },
  {
    id: 'AUD-2026-0810-004',
    occurredAt: '2026-08-10T15:20:00+08:00',
    actor: '周遥',
    action: 'Config Publish',
    target: '开发策略 / theme-v3',
    risk: 'low',
    correlationId: 'corr-audit-0810-004',
    result: 'success',
  },
  {
    id: 'AUD-2026-0810-005',
    occurredAt: '2026-08-10T14:10:00+08:00',
    actor: '方舟',
    action: 'Config Publish',
    target: '模型路由 / coding-primary',
    risk: 'high',
    correlationId: 'corr-audit-0810-005',
    result: 'rejected',
  },
  {
    id: 'AUD-2026-0809-002',
    occurredAt: '2026-08-09T17:15:00+08:00',
    actor: '孙杰',
    action: 'Config Publish',
    target: '生产策略 / feature-toggle-v7',
    risk: 'high',
    correlationId: 'corr-audit-0809-002',
    result: 'success',
  },
  {
    id: 'AUD-2026-0808-006',
    occurredAt: '2026-08-08T12:05:00+08:00',
    actor: '郑楠',
    action: 'Artifact Accept',
    target: 'artifact / requirement-spec-v12',
    risk: 'medium',
    correlationId: 'corr-audit-0808-006',
    result: 'success',
  },
  {
    id: 'AUD-2026-0807-007',
    occurredAt: '2026-08-07T11:25:00+08:00',
    actor: '李强',
    action: 'Capability Activate',
    target: 'capability / sandbox-runtime',
    risk: 'medium',
    correlationId: 'corr-audit-0807-007',
    result: 'rejected',
  },
  {
    id: 'AUD-2026-0805-008',
    occurredAt: '2026-08-05T10:10:00+08:00',
    actor: '王悦',
    action: 'Promotion',
    target: 'workspace / product-release',
    risk: 'low',
    correlationId: 'corr-audit-0805-008',
    result: 'success',
  },
  {
    id: 'AUD-2026-0802-009',
    occurredAt: '2026-08-02T09:35:00+08:00',
    actor: '陈默',
    action: 'Artifact Accept',
    target: 'artifact / security-evidence-v4',
    risk: 'low',
    correlationId: 'corr-audit-0802-009',
    result: 'success',
  },
]);

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
];
