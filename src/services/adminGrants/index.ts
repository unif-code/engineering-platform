import { api, type components } from '@/services/generated';
import {
  entityTag,
  mutationHeaders,
  requireApiData,
} from '@/services/transport';
import type {
  CreateGrantInput,
  GrantListQuery,
  GrantListResponse,
  GrantSummary,
  RevokeGrantInput,
} from './type';

const toGrantSummary = (
  grant: components['schemas']['GrantResponseDto'],
): GrantSummary => ({
  capability: grant.capability,
  id: grant.id,
  principal: {
    displayName: grant.principalId,
    employeeNo: grant.principalId,
    id: grant.principalId,
  },
  scope: {
    id: grant.scopeId,
    label: grant.scopeId ?? '全平台',
    type: grant.scopeType,
  },
  source: grant.source,
  status: grant.status,
  validFrom: grant.validFrom,
  validTo: grant.validTo,
  version: grant.version,
});

export async function listGrants(
  query: GrantListQuery,
): Promise<GrantListResponse> {
  const response = requireApiData(await api.GET('/api/v1/admin/grants'));
  const items = response.items
    .map(toGrantSummary)
    .filter(
      (grant) =>
        (!query.capability || grant.capability === query.capability) &&
        (!query.principalId || grant.principal.id === query.principalId),
    );
  return { items, total: items.length };
}

export async function createGrant(
  input: CreateGrantInput,
): Promise<GrantSummary> {
  const body: components['schemas']['GrantCreateRequestDto'] = {
    capability: input.capability,
    principalId: input.principalId,
    reason: input.reason,
    scopeId: input.scope.id,
    scopeType: input.scope.type,
    source: 'MANUAL',
  };
  return toGrantSummary(
    requireApiData(
      await api.POST('/api/v1/admin/grants', {
        body,
        params: { header: mutationHeaders() },
      }),
    ),
  );
}

export async function revokeGrant(
  grantId: string,
  input: RevokeGrantInput,
  version: number,
): Promise<GrantSummary> {
  return toGrantSummary(
    requireApiData(
      await api.DELETE('/api/v1/admin/grants/{id}', {
        body: input,
        params: {
          header: mutationHeaders({ etag: entityTag(version) }),
          path: { id: grantId },
        },
      }),
    ),
  );
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
