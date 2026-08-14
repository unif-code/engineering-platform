import type { components } from '@/services/generated';

export type PolicyScope = 'PLATFORM';
export type PolicyValue = number | string;
export type PolicyValueType = string;

export interface PolicyEnumOption {
  label: string;
  value: string;
}

export interface PolicyCatalogItem {
  activeValue: PolicyValue;
  activeVersion: number;
  defaultValue: PolicyValue;
  description: string;
  effectSemantics: string;
  enumOptions?: PolicyEnumOption[];
  key: string;
  label: string;
  max?: number;
  min?: number;
  namespace: string;
  unit: string | null;
  valueType: PolicyValueType;
}

export interface PolicyCatalogResponse {
  activeVersion: number;
  items: PolicyCatalogItem[];
  namespace: string;
  scope: PolicyScope;
}

export type CreatePolicyDraftInput =
  components['schemas']['DraftValuesRequestDto'];

export interface UpdatePolicyDraftInput {
  content: Record<string, PolicyValue>;
}

export interface PolicyDraft {
  baseVersion: number;
  content: Record<string, PolicyValue>;
  etag: string;
  id: string;
  namespace: string;
  revision: number;
  scope: PolicyScope;
  stale: boolean;
  status: 'ARCHIVED' | 'DRAFT';
  updatedAt: string;
}

export type PolicyValidationIssue = components['schemas']['ValidationIssueDto'];

export interface PolicyValidationResult {
  etag: string;
  issues: PolicyValidationIssue[];
  revision: number;
  valid: boolean;
}

export interface PolicyPreviewChange {
  afterValue: PolicyValue;
  beforeValue: PolicyValue;
  changed: boolean;
  effectSemantics: string;
  key: string;
  label: string;
}

export interface PolicyPreview {
  baseVersion: number;
  changes: PolicyPreviewChange[];
  draftId: string;
  etag: string;
  namespace: string;
  revision: number;
}

export type PublishPolicyInput =
  components['schemas']['PublishDraftRequestDto'];

export interface PublishedPolicyVersion {
  namespace: string;
  publishedAt: string;
  reason: string;
  scope: PolicyScope;
  version: number;
}

export interface PolicyVersionSummary extends PublishedPolicyVersion {
  current: boolean;
  publishedBy: string;
}

export interface PolicyVersionsResponse {
  items: PolicyVersionSummary[];
}

export interface RollbackPolicyInput {
  reason: string;
  toVersion: number;
  totpCode: string;
}
