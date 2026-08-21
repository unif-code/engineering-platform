import type { ProDescriptionsProps } from '@ant-design/pro-components';
import { Typography } from 'antd';
import { createElement } from 'react';
import { SemanticTag } from '@/components/SemanticTag';
import type { SemanticTone } from '@/types/presentation';
import { AuditRequestId } from './AuditRequestId';
import type { AuditQueryParams, AuditRow } from './type';

export const AUDIT_PAGE_SIZE = 3;

export const AUDIT_SOURCE_IP_BY_ID: Readonly<Record<string, string>> = {
  'AUD-2026-0802-009': '10.8.12.3',
  'AUD-2026-0805-008': '10.8.12.40',
  'AUD-2026-0807-007': '10.8.12.18',
  'AUD-2026-0808-006': '10.8.12.7',
  'AUD-2026-0809-002': '10.1.1.9',
  'AUD-2026-0810-001': '10.1.1.9',
  'AUD-2026-0810-003': '10.9.3.22',
  'AUD-2026-0810-004': '10.8.12.31',
  'AUD-2026-0810-005': '10.8.9.77',
};

export const toAuditRow = <T extends { id: string }>(event: T) => ({
  ...event,
  sourceIp: AUDIT_SOURCE_IP_BY_ID[event.id] ?? '—',
});

export const AUDIT_METRICS = [
  {
    description: '当前审计接口未提供聚合统计',
    title: '近 7 日操作',
    tone: 'neutral' as const,
    value: '—',
  },
  {
    description: '当前审计接口未提供聚合统计',
    title: '高危操作',
    tone: 'danger' as const,
    value: '—',
  },
  {
    description: '当前审计接口未提供聚合统计',
    title: '拦截事件',
    tone: 'warning' as const,
    value: '—',
  },
  {
    description: '当前审计接口未提供聚合统计',
    title: '覆盖率',
    tone: 'success' as const,
    value: '—',
  },
] as const;

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
  { label: '能力激活 · Capability Activate', value: 'Capability Activate' },
  { label: '制品验收 · Artifact Accept', value: 'Artifact Accept' },
  { label: '模型晋级 · Promotion', value: 'Promotion' },
  { label: '配置发布 · Config Publish', value: 'Config Publish' },
] satisfies ReadonlyArray<{
  label: string;
  value: NonNullable<AuditQueryParams['action']>;
}>;

export const AUDIT_RISK_OPTIONS = [
  { label: '全部风险', value: 'all' },
  { label: '低', value: 'low' },
  { label: '中', value: 'medium' },
  { label: '高', value: 'high' },
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
  { dataIndex: 'sourceIp', title: '来源 IP', valueType: 'text' },
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
