/**
 * V0.2 Task 7 的 mock-only 临时 DTO。
 * api-v0.2.0 锁定后由 Task 10 的 generated client 类型整体替换。
 */
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

export interface SetOrganizationSuperiorInput {
  reason: string;
  superiorId: string;
}
