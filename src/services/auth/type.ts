import type { components } from '@/services/generated';

type Schemas = components['schemas'];

export interface Principal {
  accountId: string | null;
  employeeId: string;
  name: string;
}

export interface WorkspaceSummary {
  id: string;
  name: string;
  ownerId: string;
}

export interface ScopedCapability {
  capability: string;
  scopeId: string | null;
  scopeType: Schemas['ScopeType'];
}

/** 保留应用层权限字符串接口；底层 scoped capability 在 service seam 中完成投影。 */
export interface CurrentUser extends Principal {
  capabilities: string[];
  scopedCapabilities: ScopedCapability[];
  workspaces: WorkspaceSummary[];
}

export type LoginInput = Schemas['LoginRequestDto'];
export type LoginResult =
  | Schemas['TotpRequiredDto']
  | Schemas['BootstrapRequiredDto'];
export type TotpInput = Schemas['TotpRequestDto'];
export type TotpResult = Schemas['AuthenticatedDto'];
export type BootstrapPasswordInput = Schemas['BootstrapPasswordRequestDto'];
export type BootstrapTotpConfirmInput =
  Schemas['BootstrapTotpConfirmRequestDto'];
export type BootstrapPasswordResult =
  | Schemas['PasswordSetDto']
  | Schemas['PasswordUpdatedDto'];
export type BootstrapResult =
  | BootstrapPasswordResult
  | Schemas['AuthenticatedDto'];
export type BootstrapTotpEnrollment = Schemas['TotpEnrollmentDto'];
