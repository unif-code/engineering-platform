// Mock-only 数据缝：V0.2 Task 10 锁定 api-v0.2.0 后，
// 仅替换本 Feature 导出的 domain service 底层为 generated client。

export type {
  AccountCredentialReceipt,
  AccountListQuery,
  AccountListResponse,
  AccountReasonInput,
  AccountSortField,
  AccountStatus,
  AccountSummary,
  CreateAccountInput,
} from '@/services/adminAccounts';
export {
  createAccount,
  disableAccount,
  enableAccount,
  listAccounts,
  resetAccountPassword,
  resetAccountTotp,
} from '@/services/adminAccounts';
export type {
  OrganizationKind,
  OrganizationNode,
  OrganizationTreeResponse,
  SetOrganizationSuperiorInput,
} from '@/services/adminOrganization';
export {
  getOrganizationTree,
  setOrganizationSuperior,
} from '@/services/adminOrganization';
export type {
  CreateWorkspaceInput,
  WorkspaceAccountRef,
  WorkspaceLeaderInput,
  WorkspaceListQuery,
  WorkspaceListResponse,
  WorkspaceMember,
  WorkspaceMemberSource,
  WorkspaceMembersResponse,
  WorkspaceReasonInput,
  WorkspaceStatus,
  WorkspaceSummary,
} from '@/services/adminWorkspaces';
export {
  createWorkspace,
  inviteWorkspaceLeader,
  listWorkspaceMembers,
  listWorkspaces,
  removeWorkspaceLeader,
  transferWorkspaceOwner,
} from '@/services/adminWorkspaces';
export { formatGovernanceError } from './error';
