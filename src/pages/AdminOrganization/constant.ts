import type { OrganizationKind } from '@/features/administration';

export const ORGANIZATION_KIND_META = {
  LEADER: { label: 'Leader', tone: 'info' },
  MANAGER: { label: '经理', tone: 'purple' },
  MEMBER: { label: '员工', tone: 'neutral' },
} as const satisfies Record<
  OrganizationKind,
  { label: string; tone: 'info' | 'neutral' | 'purple' }
>;
