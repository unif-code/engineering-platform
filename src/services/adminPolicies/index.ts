import { api, type components } from '@/services/generated';
import {
  entityTag,
  mutationHeaders,
  requireApiData,
} from '@/services/transport';
import type {
  CreatePolicyDraftInput,
  PolicyCatalogResponse,
  PolicyDraft,
  PolicyPreview,
  PolicyScope,
  PolicyValidationResult,
  PolicyValue,
  PolicyVersionsResponse,
  PublishedPolicyVersion,
  PublishPolicyInput,
  RollbackPolicyInput,
  UpdatePolicyDraftInput,
} from './type';

type DraftResult = {
  data?: components['schemas']['DraftResponseDto'];
  response: Response;
};

const POLICY_PRESENTATION: Record<
  string,
  {
    description: string;
    enumLabels?: Record<string, string>;
    label: string;
  }
> = {
  'identity.draft_auto_archive_days': {
    description: 'Draft 连续无 Meaningful Activity 后自动归档的等待天数',
    label: 'Draft 自动归档等待期',
  },
  'identity.login_backoff_profile': {
    description: '连续 5 次失败后从 30 秒起指数退避，上限 15 分钟，24 小时清零',
    enumLabels: {
      STANDARD: '标准（5 次 / 30 秒起 / 15 分钟上限 / 24 小时清零）',
    },
    label: '登录失败退避',
  },
  'identity.password_expiry': {
    description: '正式密码的过期周期',
    enumLabels: {
      '180_DAYS': '180 天',
      '90_DAYS': '90 天',
      NEVER: '永不过期',
    },
    label: '密码过期周期',
  },
  'identity.session_idle_minutes': {
    description: '人员 Session 连续无活动后的失效分钟数',
    label: 'Session 空闲期限',
  },
  'identity.session_limit': {
    description: '同一账号同时有效的 Session 数量上限',
    label: 'Session 上限',
  },
  'identity.temp_password_ttl_hours': {
    description: '一次性临时密码签发后的有效小时数',
    label: '临时密码有效期',
  },
  'identity.totp_attempt_limit': {
    description: '同一 TOTP Challenge 可失败的最大次数',
    label: 'TOTP 尝试上限',
  },
};

const policyPresentation = (key: string) =>
  POLICY_PRESENTATION[key] ?? { description: '', label: key };

const toPolicyValue = (value: unknown): PolicyValue => value as PolicyValue;

const toPolicyDraft = (result: DraftResult): PolicyDraft => {
  const draft = requireApiData(result);
  return {
    baseVersion: draft.baseVersion,
    content: draft.content as Record<string, PolicyValue>,
    etag: result.response.headers.get('etag') ?? entityTag(draft.revision),
    id: draft.id,
    namespace: draft.namespace,
    revision: draft.revision,
    scope: draft.scope as PolicyScope,
    stale: draft.stale,
    status: draft.status as PolicyDraft['status'],
    updatedAt: draft.lastMeaningfulActivityAt,
  };
};

export async function listPolicyCatalog(): Promise<PolicyCatalogResponse> {
  const catalog = requireApiData(await api.GET('/api/v1/admin/policies'));
  return {
    activeVersion: catalog.active.version,
    items: catalog.items.map((item) => {
      const presentation = policyPresentation(item.key);
      return {
        activeValue: toPolicyValue(catalog.active.values[item.key]),
        activeVersion: catalog.active.version,
        defaultValue: toPolicyValue(item.defaultValue),
        description: presentation.description || item.effectSemantics,
        effectSemantics: item.effectSemantics,
        ...(item.enumValues
          ? {
              enumOptions: item.enumValues.map((value) => ({
                label:
                  presentation.enumLabels?.[String(value)] ?? String(value),
                value: String(value),
              })),
            }
          : {}),
        key: item.key,
        label: presentation.label,
        ...(typeof item.maxValue === 'number' ? { max: item.maxValue } : {}),
        ...(typeof item.minValue === 'number' ? { min: item.minValue } : {}),
        namespace: item.namespace,
        unit: item.unit,
        valueType: item.valueType,
      };
    }),
    namespace: catalog.active.namespace,
    scope: catalog.active.scope as PolicyScope,
  };
}

export async function createPolicyDraft(
  namespace: string,
  input: CreatePolicyDraftInput,
): Promise<PolicyDraft> {
  return toPolicyDraft(
    await api.POST('/api/v1/admin/policies/{namespace}/drafts', {
      body: input,
      params: {
        header: mutationHeaders(),
        path: { namespace },
      },
    }),
  );
}

export async function updatePolicyDraft(
  namespace: string,
  draftId: string,
  input: UpdatePolicyDraftInput,
  etag: string,
): Promise<PolicyDraft> {
  return toPolicyDraft(
    await api.PATCH('/api/v1/admin/policies/{namespace}/drafts/{draft_id}', {
      body: { values: input.content },
      params: {
        header: mutationHeaders({ etag }),
        path: { draft_id: draftId, namespace },
      },
    }),
  );
}

export async function validatePolicyDraft(
  namespace: string,
  draftId: string,
  etag: string,
): Promise<PolicyValidationResult> {
  const result = await api.POST(
    '/api/v1/admin/policies/{namespace}/drafts/{draft_id}/validate',
    {
      body: {},
      params: {
        header: mutationHeaders({ etag }),
        path: { draft_id: draftId, namespace },
      },
    },
  );
  const validation = requireApiData(result);
  return {
    etag: result.response.headers.get('etag') ?? entityTag(validation.revision),
    issues: validation.issues,
    revision: validation.revision,
    valid: validation.valid,
  };
}

export async function previewPolicyDraft(
  namespace: string,
  draftId: string,
  etag: string,
): Promise<PolicyPreview> {
  const result = await api.GET(
    '/api/v1/admin/policies/{namespace}/drafts/{draft_id}/preview',
    {
      params: {
        header: { 'If-Match': etag },
        path: { draft_id: draftId, namespace },
      },
    },
  );
  const preview = requireApiData(result);
  return {
    baseVersion: preview.baseVersion,
    changes: preview.items.map((item) => ({
      afterValue: toPolicyValue(item.after),
      beforeValue: toPolicyValue(item.before),
      changed: item.before !== item.after,
      effectSemantics: item.effectSemantics,
      key: item.key,
      label: policyPresentation(item.key).label,
    })),
    draftId: preview.draftId,
    etag: result.response.headers.get('etag') ?? entityTag(preview.revision),
    namespace,
    revision: preview.revision,
  };
}

export async function publishPolicyDraft(
  namespace: string,
  draftId: string,
  input: PublishPolicyInput,
  etag: string,
): Promise<PublishedPolicyVersion> {
  const published = requireApiData(
    await api.POST(
      '/api/v1/admin/policies/{namespace}/drafts/{draft_id}/publish',
      {
        body: input,
        params: {
          header: mutationHeaders({ etag }),
          path: { draft_id: draftId, namespace },
        },
      },
    ),
  );
  return {
    namespace: published.namespace,
    publishedAt: published.publishedAt,
    reason: published.reason,
    scope: published.scope as PolicyScope,
    version: published.version,
  };
}

export async function rollbackPolicyVersion(
  namespace: string,
  input: RollbackPolicyInput,
  activeVersion: number,
): Promise<PolicyDraft> {
  return toPolicyDraft(
    await api.POST('/api/v1/admin/policies/{namespace}/rollback', {
      body: { ...input, scope: 'PLATFORM' },
      params: {
        header: mutationHeaders({ etag: entityTag(activeVersion) }),
        path: { namespace },
      },
    }),
  );
}

export async function listPolicyVersions(
  namespace: string,
): Promise<PolicyVersionsResponse> {
  const response = requireApiData(
    await api.GET('/api/v1/admin/policies/{namespace}/versions', {
      params: { path: { namespace } },
    }),
  );
  return {
    items: response.items.map((item, index) => ({
      current: index === 0,
      namespace: item.namespace,
      publishedAt: item.publishedAt,
      publishedBy: item.publishedBy,
      reason: item.reason,
      scope: item.scope as PolicyScope,
      version: item.version,
    })),
  };
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
