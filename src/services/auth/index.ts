import { request } from '@umijs/max';
import {
  mutationHeaders,
  normalizeApiError,
  resolveApiEnvelope,
} from '@/services/transport';
import type { ApiEnvelope } from '@/types/api';
import type {
  CurrentUser,
  LoginInput,
  LoginResult,
  TotpInput,
  TotpResult,
} from './type';

async function requestAuth<T>(
  path: '/api/v1/auth/login' | '/api/v1/auth/totp',
  data: LoginInput | TotpInput,
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
  return resolveApiEnvelope(
    request<ApiEnvelope<CurrentUser>>('/api/v1/me', { method: 'GET' }),
  );
}

export async function startLogin(input: LoginInput): Promise<LoginResult> {
  return requestAuth('/api/v1/auth/login', input);
}

export async function verifyTotp(input: TotpInput): Promise<TotpResult> {
  return requestAuth('/api/v1/auth/totp', input);
}

export type {
  CurrentUser,
  LoginInput,
  LoginResult,
  TotpInput,
  TotpResult,
} from './type';
