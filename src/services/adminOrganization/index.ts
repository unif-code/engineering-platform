import { request } from '@umijs/max';
import { mutationHeaders, normalizeApiError } from '@/services/transport';
import type {
  OrganizationTreeResponse,
  SetOrganizationSuperiorInput,
} from './type';

export async function getOrganizationTree(): Promise<OrganizationTreeResponse> {
  try {
    return await request<OrganizationTreeResponse>(
      '/api/v1/admin/organization/tree',
      { method: 'GET' },
    );
  } catch (error) {
    throw normalizeApiError(error);
  }
}

export async function setOrganizationSuperior(
  accountId: string,
  input: SetOrganizationSuperiorInput,
): Promise<void> {
  try {
    await request<void>(
      `/api/v1/admin/accounts/${encodeURIComponent(accountId)}/superior`,
      {
        data: input,
        headers: mutationHeaders(),
        method: 'PUT',
      },
    );
  } catch (error) {
    throw normalizeApiError(error);
  }
}

export type {
  OrganizationKind,
  OrganizationNode,
  OrganizationTreeResponse,
  SetOrganizationSuperiorInput,
} from './type';
