import { request } from '@umijs/max';
import { resolveApiEnvelope } from '@/services/transport';
import type { ApiEnvelope } from '@/types/api';
import type { CurrentUser, LoginInput } from './type';

export async function getCurrentUser(): Promise<CurrentUser> {
  return resolveApiEnvelope(
    request<ApiEnvelope<CurrentUser>>('/api/v1/me', { method: 'GET' }),
  );
}

export async function authenticate(input: LoginInput): Promise<void> {
  await resolveApiEnvelope(
    request<ApiEnvelope<unknown>>('/api/v1/auth/login', {
      method: 'POST',
      data: input,
    }),
  );
}

export type { CurrentUser, LoginInput } from './type';
