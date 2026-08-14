import { api, type components } from '@/services/generated';
import { mutationHeaders, requireApiData } from '@/services/transport';
import type {
  BootstrapPasswordInput,
  BootstrapPasswordResult,
  BootstrapTotpConfirmInput,
  BootstrapTotpEnrollment,
  CurrentUser,
  LoginInput,
  LoginResult,
  TotpInput,
  TotpResult,
} from './type';

export async function getCurrentUser(): Promise<CurrentUser> {
  const principal = requireApiData(await api.GET('/api/v1/me'));
  return {
    employeeId: principal.employeeId,
    name: principal.name,
    capabilities: (principal.capabilities ?? []).map(
      ({ capability }) => capability,
    ),
  };
}

export async function logout(): Promise<void> {
  requireApiData(
    await api.POST('/api/v1/auth/logout', {
      params: { header: mutationHeaders() },
    }),
  );
}

export async function startLogin(input: LoginInput): Promise<LoginResult> {
  return requireApiData(
    await api.POST('/api/v1/auth/login', {
      body: input,
      params: { header: mutationHeaders() },
    }),
  );
}

export async function verifyTotp(input: TotpInput): Promise<TotpResult> {
  return requireApiData(
    await api.POST('/api/v1/auth/totp', {
      body: input,
      params: { header: mutationHeaders() },
    }),
  );
}

export async function setBootstrapPassword(
  input: BootstrapPasswordInput,
): Promise<BootstrapPasswordResult> {
  return requireApiData(
    await api.POST('/api/v1/auth/bootstrap/password', {
      body: input,
      params: { header: mutationHeaders() },
    }),
  );
}

export async function enrollBootstrapTotp(): Promise<BootstrapTotpEnrollment> {
  return requireApiData(
    await api.POST('/api/v1/auth/bootstrap/totp/enroll', {
      params: { header: mutationHeaders() },
    }),
  );
}

export async function confirmBootstrapTotp(
  input: BootstrapTotpConfirmInput,
): Promise<components['schemas']['AuthenticatedDto']> {
  return requireApiData(
    await api.POST('/api/v1/auth/bootstrap/totp/confirm', {
      body: input,
      params: { header: mutationHeaders() },
    }),
  );
}

export type {
  BootstrapPasswordInput,
  BootstrapPasswordResult,
  BootstrapResult,
  BootstrapTotpConfirmInput,
  BootstrapTotpEnrollment,
  CurrentUser,
  LoginInput,
  LoginResult,
  Principal,
  TotpInput,
  TotpResult,
} from './type';
