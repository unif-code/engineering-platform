import { api, type components } from '@/services/generated';
import {
  ApiError,
  mutationHeaders,
  requireApiData,
} from '@/services/transport';
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
  WorkspaceSummary,
} from './type';

function projectWorkspaceSummary(
  value: Record<string, unknown>,
): WorkspaceSummary {
  const { id, name, ownerId } = value;
  if (
    typeof id !== 'string' ||
    typeof name !== 'string' ||
    typeof ownerId !== 'string'
  ) {
    throw new ApiError({
      detail: '当前 Session 的 Workspace 数据无效',
      status: 502,
      title: 'INVALID_RESPONSE',
    });
  }
  return { id, name, ownerId };
}

export async function getCurrentUser(): Promise<CurrentUser> {
  const principal = requireApiData(await api.GET('/api/v1/me'));
  const scopedCapabilities = (principal.capabilities ?? []).map(
    ({ capability, scopeId, scopeType }) => ({
      capability,
      scopeId: scopeId ?? null,
      scopeType,
    }),
  );
  return {
    accountId: principal.accountId ?? null,
    employeeId: principal.employeeId,
    name: principal.name,
    capabilities: scopedCapabilities.map(({ capability }) => capability),
    scopedCapabilities,
    workspaces: (principal.workspaces ?? []).map(projectWorkspaceSummary),
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
  ScopedCapability,
  TotpInput,
  TotpResult,
  WorkspaceSummary,
} from './type';
