import { request } from '@umijs/max';
import { mutationHeaders, normalizeApiError } from '@/services/transport';
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

type AuthMutationPath =
  | '/api/v1/auth/bootstrap/password'
  | '/api/v1/auth/bootstrap/totp/confirm'
  | '/api/v1/auth/bootstrap/totp/enroll'
  | '/api/v1/auth/login'
  | '/api/v1/auth/totp';

type AuthMutationInput =
  | BootstrapPasswordInput
  | BootstrapTokenInput
  | BootstrapTotpConfirmInput
  | LoginInput
  | TotpInput;

async function requestAuth<T>(
  path: AuthMutationPath,
  data: AuthMutationInput,
): Promise<T> {
  try {
    return await request<T>(path, {
      method: 'POST',
      data,
      headers: mutationHeaders(),
    });
  } catch (error) {
    throw normalizeApiError(error);
  }
}

export async function getCurrentUser(): Promise<CurrentUser> {
  try {
    return await request<CurrentUser>('/api/v1/me', { method: 'GET' });
  } catch (error) {
    throw normalizeApiError(error);
  }
}

export async function logout(): Promise<void> {
  try {
    await request<void>('/api/v1/auth/logout', {
      headers: mutationHeaders(),
      method: 'POST',
    });
  } catch (error) {
    throw normalizeApiError(error);
  }
}

export async function startLogin(input: LoginInput): Promise<LoginResult> {
  return requestAuth('/api/v1/auth/login', input);
}

export async function verifyTotp(input: TotpInput): Promise<TotpResult> {
  return requestAuth('/api/v1/auth/totp', input);
}

export async function setBootstrapPassword(
  input: BootstrapPasswordInput,
): Promise<BootstrapResult> {
  return requestAuth('/api/v1/auth/bootstrap/password', input);
}

export async function enrollBootstrapTotp(
  input: BootstrapTokenInput,
): Promise<BootstrapTotpEnrollment> {
  return requestAuth('/api/v1/auth/bootstrap/totp/enroll', input);
}

export async function confirmBootstrapTotp(
  input: BootstrapTotpConfirmInput,
): Promise<BootstrapResult> {
  return requestAuth('/api/v1/auth/bootstrap/totp/confirm', input);
}

export type {
  BootstrapPasswordInput,
  BootstrapResult,
  BootstrapTokenInput,
  BootstrapTotpConfirmInput,
  BootstrapTotpEnrollment,
  CurrentUser,
  LoginInput,
  LoginResult,
  Principal,
  TotpInput,
  TotpResult,
} from './type';
