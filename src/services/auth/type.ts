import type { components } from '@/services/generated';

type Schemas = components['schemas'];

export type Principal = Pick<Schemas['PrincipalDto'], 'employeeId' | 'name'>;

/** 保留应用层权限字符串接口；底层 scoped capability 在 service seam 中完成投影。 */
export interface CurrentUser extends Principal {
  capabilities: string[];
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
