// 数据缝：V0.2 Task 10 锁定 api-v0.2.0 OpenAPI Artifact 后，
// 在 '@/services/auth' 的 domain client 底层切入 '@/services/generated'。
// 本 Feature service、页面、hooks 与公开 Feature API 均无需改动。
import {
  getCurrentUser,
  setBootstrapPassword as requestBootstrapPassword,
  confirmBootstrapTotp as requestBootstrapTotpConfirmation,
  enrollBootstrapTotp as requestBootstrapTotpEnrollment,
  logout as requestLogout,
  verifyTotp as requestTotp,
  startLogin,
} from '@/services/auth';
import { ApiError } from '@/services/transport';
import type {
  BootstrapPasswordInput,
  BootstrapResult,
  BootstrapTokenInput,
  BootstrapTotpConfirmInput,
  BootstrapTotpEnrollment,
  CurrentUser,
  LoginInput,
  LoginResult,
  TotpInput,
  TotpResult,
} from './type';

export async function fetchMe(): Promise<CurrentUser | null> {
  try {
    return await getCurrentUser();
  } catch (error) {
    if (error instanceof ApiError && error.problem.status === 401) {
      return null;
    }
    throw error;
  }
}

export async function login(input: LoginInput): Promise<LoginResult> {
  return startLogin(input);
}

export async function logout(): Promise<void> {
  return requestLogout();
}

export async function verifyTotp(input: TotpInput): Promise<TotpResult> {
  return requestTotp(input);
}

export async function setBootstrapPassword(
  input: BootstrapPasswordInput,
): Promise<BootstrapResult> {
  return requestBootstrapPassword(input);
}

export async function enrollBootstrapTotp(
  input: BootstrapTokenInput,
): Promise<BootstrapTotpEnrollment> {
  return requestBootstrapTotpEnrollment(input);
}

export async function confirmBootstrapTotp(
  input: BootstrapTotpConfirmInput,
): Promise<BootstrapResult> {
  return requestBootstrapTotpConfirmation(input);
}
