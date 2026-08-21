import type {
  PolicyCatalogItem,
  PolicyPreviewChange,
  PolicyValue,
  PolicyVersionSummary,
} from '@/features/administration';

export type PolicyCatalogRow = PolicyCatalogItem;
export type PolicyPreviewRow = PolicyPreviewChange;
export type PolicyVersionRow = PolicyVersionSummary;

export interface PolicyTableQueryParams {
  refresh?: number;
}

export interface PublishPolicyFormValues {
  reason: string;
  totpCode: string;
}

export type DraftContent = Record<string, PolicyValue | null>;
