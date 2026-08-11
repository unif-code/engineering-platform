import type { OrganizationNode } from '@/features/administration';

export interface SuperiorFormValues {
  reason: string;
  superiorId: string;
}

export interface SuperiorTarget {
  label: string;
  value: string;
}

export type OrganizationTreeNode = OrganizationNode;
