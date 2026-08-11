import { request } from '@umijs/max';
import { mutationHeaders, normalizeApiError } from '@/services/transport';
import type {
  CreateGrantInput,
  GrantListQuery,
  GrantListResponse,
  GrantSummary,
  RevokeGrantInput,
} from './type';

export async function listGrants(
  query: GrantListQuery,
): Promise<GrantListResponse> {
  try {
    return await request<GrantListResponse>('/api/v1/admin/grants', {
      method: 'GET',
      params: query,
    });
  } catch (error) {
    throw normalizeApiError(error);
  }
}

export async function createGrant(
  input: CreateGrantInput,
): Promise<GrantSummary> {
  try {
    return await request<GrantSummary>('/api/v1/admin/grants', {
      data: input,
      headers: mutationHeaders(),
      method: 'POST',
    });
  } catch (error) {
    throw normalizeApiError(error);
  }
}

export async function revokeGrant(
  grantId: string,
  input: RevokeGrantInput,
): Promise<GrantSummary> {
  try {
    return await request<GrantSummary>(
      `/api/v1/admin/grants/${encodeURIComponent(grantId)}`,
      {
        data: input,
        headers: mutationHeaders(),
        method: 'DELETE',
      },
    );
  } catch (error) {
    throw normalizeApiError(error);
  }
}

export type {
  CreateGrantInput,
  GrantListQuery,
  GrantListResponse,
  GrantPrincipalRef,
  GrantScopeSummary,
  GrantScopeType,
  GrantSource,
  GrantStatus,
  GrantSummary,
  RevokeGrantInput,
} from './type';
