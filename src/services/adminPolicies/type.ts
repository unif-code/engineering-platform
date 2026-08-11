/**
 * V0.2 Task 9 的 mock-only 临时 DTO。
 * 后端已冻结 Policy 资源路径与生命周期语义，但精确 DTO 尚待 api-v0.2.0；
 * Task 10 将用 generated client 类型整体替换本文件。
 */
export type PolicyScope = 'PLATFORM';
export type PolicyValue = number | string;
export type PolicyValueType = 'ENUM' | 'INTEGER';

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

export interface CreatePolicyDraftInput {
  scope: PolicyScope;
}

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

export interface PolicyValidationIssue {
  code: string;
  key: string;
  message: string;
}

export interface PolicyValidationResult {
  issues: PolicyValidationIssue[];
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
  namespace: string;
}

export interface PublishPolicyInput {
  reason: string;
  totpCode: string;
}

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
  toVersion: number;
}
