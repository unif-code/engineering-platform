import type { PolicyValue, PolicyValueType } from '@/features/administration';

export const POLICY_NAMESPACE = 'identity';

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
