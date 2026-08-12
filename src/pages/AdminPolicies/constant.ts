import type { PolicyValue, PolicyValueType } from '@/features/administration';

export const POLICY_NAMESPACE = 'identity';

export const POLICY_GROUPS = [
  { label: '会话与登录策略', value: 'session' },
  { label: 'Agent 执行限制', value: 'agent' },
  { label: '模型调用配额', value: 'model' },
  { label: 'Gate 审批规则', value: 'gate' },
  { label: '代码仓库与 MR 策略', value: 'repository' },
  { label: '审计与留存', value: 'audit' },
  { label: '通知与消息', value: 'notification' },
] as const;

export type PolicyGroupKey = (typeof POLICY_GROUPS)[number]['value'];

export function policyGroupForKey(key: string): PolicyGroupKey {
  return key === 'identity.draft_auto_archive_days' ? 'audit' : 'session';
}

export const POLICY_VALUE_TYPE_LABEL: Record<PolicyValueType, string> = {
  ENUM: '枚举',
  INTEGER: '数字',
};

export function formatPolicyValue(
  value: PolicyValue,
  unit?: string | null,
): string {
  return unit ? `${value} ${unit}` : String(value);
}
