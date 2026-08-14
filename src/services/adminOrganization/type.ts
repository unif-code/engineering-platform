import type { components } from '@/services/generated';

export type OrganizationKind = 'MANAGER' | 'LEADER' | 'MEMBER';

export interface OrganizationNode {
  children: OrganizationNode[];
  displayName: string;
  employeeNo: string;
  id: string;
  kind: OrganizationKind;
  superiorId: string | null;
}

export interface OrganizationTreeResponse {
  items: OrganizationNode[];
}

export type SetOrganizationSuperiorInput =
  components['schemas']['SetSuperiorRequestDto'];
