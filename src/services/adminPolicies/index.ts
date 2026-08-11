import { request } from '@umijs/max';
import { mutationHeaders, normalizeApiError } from '@/services/transport';
import type {
  CreatePolicyDraftInput,
  PolicyCatalogResponse,
  PolicyDraft,
  PolicyPreview,
  PolicyValidationResult,
  PolicyVersionsResponse,
  PublishedPolicyVersion,
  PublishPolicyInput,
  RollbackPolicyInput,
  UpdatePolicyDraftInput,
} from './type';

const namespacePath = (namespace: string) =>
  `/api/v1/admin/policies/${encodeURIComponent(namespace)}`;

const draftPath = (namespace: string, draftId: string) =>
  `${namespacePath(namespace)}/drafts/${encodeURIComponent(draftId)}`;

export async function listPolicyCatalog(): Promise<PolicyCatalogResponse> {
  try {
    return await request<PolicyCatalogResponse>('/api/v1/admin/policies', {
      method: 'GET',
    });
  } catch (error) {
    throw normalizeApiError(error);
  }
}

export async function createPolicyDraft(
  namespace: string,
  input: CreatePolicyDraftInput,
): Promise<PolicyDraft> {
  try {
    return await request<PolicyDraft>(`${namespacePath(namespace)}/drafts`, {
      data: input,
      headers: mutationHeaders(),
      method: 'POST',
    });
  } catch (error) {
    throw normalizeApiError(error);
  }
}

export async function updatePolicyDraft(
  namespace: string,
  draftId: string,
  input: UpdatePolicyDraftInput,
  etag: string,
): Promise<PolicyDraft> {
  try {
    return await request<PolicyDraft>(draftPath(namespace, draftId), {
      data: input,
      headers: mutationHeaders({ etag }),
      method: 'PATCH',
    });
  } catch (error) {
    throw normalizeApiError(error);
  }
}

export async function validatePolicyDraft(
  namespace: string,
  draftId: string,
): Promise<PolicyValidationResult> {
  try {
    return await request<PolicyValidationResult>(
      `${draftPath(namespace, draftId)}/validate`,
      { headers: mutationHeaders(), method: 'POST' },
    );
  } catch (error) {
    throw normalizeApiError(error);
  }
}

export async function previewPolicyDraft(
  namespace: string,
  draftId: string,
): Promise<PolicyPreview> {
  try {
    return await request<PolicyPreview>(
      `${draftPath(namespace, draftId)}/preview`,
      { method: 'GET' },
    );
  } catch (error) {
    throw normalizeApiError(error);
  }
}

export async function publishPolicyDraft(
  namespace: string,
  draftId: string,
  input: PublishPolicyInput,
): Promise<PublishedPolicyVersion> {
  try {
    return await request<PublishedPolicyVersion>(
      `${draftPath(namespace, draftId)}/publish`,
      {
        data: input,
        headers: mutationHeaders(),
        method: 'POST',
      },
    );
  } catch (error) {
    throw normalizeApiError(error);
  }
}

export async function rollbackPolicyVersion(
  namespace: string,
  input: RollbackPolicyInput,
): Promise<PolicyDraft> {
  try {
    return await request<PolicyDraft>(`${namespacePath(namespace)}/rollback`, {
      data: input,
      headers: mutationHeaders(),
      method: 'POST',
    });
  } catch (error) {
    throw normalizeApiError(error);
  }
}

export async function listPolicyVersions(
  namespace: string,
): Promise<PolicyVersionsResponse> {
  try {
    return await request<PolicyVersionsResponse>(
      `${namespacePath(namespace)}/versions`,
      { method: 'GET' },
    );
  } catch (error) {
    throw normalizeApiError(error);
  }
}

export type {
  CreatePolicyDraftInput,
  PolicyCatalogItem,
  PolicyCatalogResponse,
  PolicyDraft,
  PolicyEnumOption,
  PolicyPreview,
  PolicyPreviewChange,
  PolicyScope,
  PolicyValidationIssue,
  PolicyValidationResult,
  PolicyValue,
  PolicyValueType,
  PolicyVersionSummary,
  PolicyVersionsResponse,
  PublishedPolicyVersion,
  PublishPolicyInput,
  RollbackPolicyInput,
  UpdatePolicyDraftInput,
} from './type';
