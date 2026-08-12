import type { OrganizationNode } from '@/features/administration';

export type OrganizationAccountStatus = 'ACTIVE' | 'DISABLED';

export interface OrganizationRoleMix {
  backend: number;
  frontend: number;
  product: number;
  testing: number;
}

export interface OrganizationDepartmentSummary {
  key: string;
  lead: string;
  memberCount: number;
  name: string;
  roleMix: OrganizationRoleMix;
  subgroups: readonly string[];
  workspaceCount: number;
}

export interface DepartmentFormValues {
  leadId: string;
  name: string;
  parentKey: string;
  subgroups: string;
}

export interface SuperiorFormValues {
  reason: string;
  superiorId: string;
}

export interface SuperiorTarget {
  label: string;
  value: string;
}

export interface OrganizationTreeNode
  extends Omit<OrganizationNode, 'children'> {
  children: OrganizationTreeNode[];
  departmentKey: string;
  lastLoginAt: string;
  roles: readonly string[];
  status: OrganizationAccountStatus;
}
