import { defineMock } from '@umijs/max';

const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

type PolicyValue = number | string;

interface PolicyDefinition {
  defaultValue: PolicyValue;
  description: string;
  effectSemantics: string;
  enumOptions?: readonly { label: string; value: string }[];
  key: string;
  label: string;
  max?: number;
  min?: number;
  namespace: string;
  unit: string | null;
  valueType: 'ENUM' | 'INTEGER';
}

interface DraftRecord {
  baseVersion: number;
  content: Record<string, PolicyValue>;
  etag: string;
  id: string;
  namespace: string;
  revision: number;
  scope: 'PLATFORM';
  stale: boolean;
  status: 'ARCHIVED' | 'DRAFT';
  updatedAt: string;
}

interface VersionRecord {
  namespace: string;
  publishedAt: string;
  publishedBy: string;
  reason: string;
  scope: 'PLATFORM';
  snapshot: Record<string, PolicyValue>;
  version: number;
}

interface MockRequest {
  body?: unknown;
  headers: Record<string, string | string[] | undefined>;
  params?: Record<string, string | undefined>;
}

interface MockResponse {
  json: (body: unknown) => unknown;
  setHeader: (name: string, value: string) => unknown;
  status: (statusCode: number) => MockResponse;
}

export interface AdminPoliciesMockOptions {
  authorize?: (request: MockRequest) => boolean;
}

const POLICY_DEFINITIONS: readonly PolicyDefinition[] = Object.freeze([
  Object.freeze({
    defaultValue: 24,
    description: '一次性临时密码签发后的有效小时数',
    effectSemantics: '仅影响后续签发的一次性临时密码。',
    key: 'identity.temp_password_ttl_hours',
    label: '临时密码有效期',
    max: 72,
    min: 1,
    namespace: 'identity',
    unit: '小时',
    valueType: 'INTEGER',
  }),
  Object.freeze({
    defaultValue: 'NEVER',
    description: '正式密码的过期周期',
    effectSemantics: '发布后用于后续认证时的密码有效性判断。',
    enumOptions: Object.freeze([
      Object.freeze({ label: '永不过期', value: 'NEVER' }),
      Object.freeze({ label: '90 天', value: '90_DAYS' }),
      Object.freeze({ label: '180 天', value: '180_DAYS' }),
    ]),
    key: 'identity.password_expiry',
    label: '密码过期周期',
    namespace: 'identity',
    unit: null,
    valueType: 'ENUM',
  }),
  Object.freeze({
    defaultValue: 3,
    description: '同一账号同时有效的 Session 数量上限',
    effectSemantics: '发布后登录会逐出超出上限的最旧 Session。',
    key: 'identity.session_limit',
    label: 'Session 上限',
    max: 10,
    min: 1,
    namespace: 'identity',
    unit: '个',
    valueType: 'INTEGER',
  }),
  Object.freeze({
    defaultValue: 60,
    description: '人员 Session 连续无活动后的失效分钟数',
    effectSemantics: '发布后用于认证 API 的空闲 Session 判定。',
    key: 'identity.session_idle_minutes',
    label: 'Session 空闲期限',
    max: 240,
    min: 15,
    namespace: 'identity',
    unit: '分钟',
    valueType: 'INTEGER',
  }),
  Object.freeze({
    defaultValue: 'STANDARD',
    description: '连续 5 次失败后从 30 秒起指数退避，上限 15 分钟，24 小时清零',
    effectSemantics: '发布后仅影响后续登录失败的服务端退避判定。',
    enumOptions: Object.freeze([
      Object.freeze({
        label: '标准（5 次 / 30 秒起 / 15 分钟上限 / 24 小时清零）',
        value: 'STANDARD',
      }),
    ]),
    key: 'identity.login_backoff_profile',
    label: '登录失败退避',
    namespace: 'identity',
    unit: null,
    valueType: 'ENUM',
  }),
  Object.freeze({
    defaultValue: 5,
    description: '同一 TOTP Challenge 可失败的最大次数',
    effectSemantics: '发布后仅影响新创建的 TOTP Challenge。',
    key: 'identity.totp_attempt_limit',
    label: 'TOTP 尝试上限',
    max: 10,
    min: 3,
    namespace: 'identity',
    unit: '次',
    valueType: 'INTEGER',
  }),
  Object.freeze({
    defaultValue: 30,
    description: 'Draft 连续无 Meaningful Activity 后自动归档的等待天数',
    effectSemantics: '按 NEXT_SCHEDULE 仅影响后续自动归档调度。',
    key: 'identity.draft_auto_archive_days',
    label: 'Draft 自动归档等待期',
    max: 365,
    min: 1,
    namespace: 'identity',
    unit: '天',
    valueType: 'INTEGER',
  }),
]);

const INITIAL_CONTENT = Object.freeze(
  Object.fromEntries(
    POLICY_DEFINITIONS.map(({ defaultValue, key }) => [key, defaultValue]),
  ) as Record<string, PolicyValue>,
);

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value);

const headerValue = (request: MockRequest, name: string) => {
  const entry = Object.entries(request.headers).find(
    ([headerName]) => headerName.toLowerCase() === name.toLowerCase(),
  );
  return Array.isArray(entry?.[1]) ? entry[1][0] : entry?.[1];
};

const cloneContent = (content: Record<string, PolicyValue>) => ({ ...content });

const cloneDraft = (draft: DraftRecord): DraftRecord => ({
  ...draft,
  content: cloneContent(draft.content),
});

export function createAdminPoliciesMock(
  options: AdminPoliciesMockOptions = {},
) {
  const authorize = options.authorize ?? (() => true);
  let activeContent = cloneContent(INITIAL_CONTENT);
  let activeVersion = 1;
  let nextDraftId = 1;
  let requestSequence = 0;
  const drafts = new Map<string, DraftRecord>();
  const versions: VersionRecord[] = [
    {
      namespace: 'identity',
      publishedAt: '2026-08-01T08:00:00.000Z',
      publishedBy: 'SYSTEM_SEED',
      reason: '平台初始化默认策略',
      scope: 'PLATFORM',
      snapshot: cloneContent(INITIAL_CONTENT),
      version: 1,
    },
  ];

  const sendProblem = (
    response: MockResponse,
    status: number,
    title: string,
    detail: string,
    extensions: Record<string, unknown> = {},
  ) => {
    response.status(status);
    response.setHeader('Content-Type', 'application/problem+json');
    response.json({
      detail,
      requestId: `mock-admin-policy-${String(++requestSequence).padStart(4, '0')}`,
      status,
      title,
      type: `https://engineering-platform.example/problems/${title.toLowerCase()}`,
      ...extensions,
    });
  };

  const requireAuthorization = (
    request: MockRequest,
    response: MockResponse,
  ) => {
    if (authorize(request)) {
      return true;
    }
    sendProblem(response, 403, 'FORBIDDEN', '无 Policy 发布权限');
    return false;
  };

  const requireMutation = (request: MockRequest, response: MockResponse) => {
    if (!requireAuthorization(request, response)) {
      return false;
    }
    const key = headerValue(request, 'Idempotency-Key');
    if (typeof key === 'string' && UUID_PATTERN.test(key)) {
      return true;
    }
    sendProblem(
      response,
      422,
      'VALIDATION_ERROR',
      'Idempotency-Key 缺失或格式错误，必须为 UUID',
    );
    return false;
  };

  const findDraft = (request: MockRequest, response: MockResponse) => {
    const draft = drafts.get(request.params?.draftId ?? '');
    if (draft === undefined || draft.namespace !== request.params?.namespace) {
      sendProblem(response, 404, 'DRAFT_NOT_FOUND', 'Policy Draft 不存在');
      return undefined;
    }
    return draft;
  };

  const validationResult = (draft: DraftRecord) => {
    const issues = POLICY_DEFINITIONS.flatMap((definition) => {
      const value = draft.content[definition.key];
      if (definition.valueType === 'INTEGER') {
        if (typeof value !== 'number' || !Number.isFinite(value)) {
          return [
            {
              code: 'TYPE_MISMATCH',
              key: definition.key,
              message: `${definition.label}必须为数字`,
            },
          ];
        }
        if (
          (definition.min !== undefined && value < definition.min) ||
          (definition.max !== undefined && value > definition.max)
        ) {
          return [
            {
              code: 'OUT_OF_RANGE',
              key: definition.key,
              message: `${definition.label}必须在 ${definition.min}～${definition.max} 之间`,
            },
          ];
        }
        return [];
      }
      const allowed = definition.enumOptions?.map(({ value }) => value) ?? [];
      return typeof value === 'string' && allowed.includes(value)
        ? []
        : [
            {
              code: 'ENUM_MISMATCH',
              key: definition.key,
              message: `${definition.label}不是允许的枚举值`,
            },
          ];
    });
    return { issues, valid: issues.length === 0 };
  };

  const createDraftFrom = (content: Record<string, PolicyValue>) => {
    const id = `draft-${nextDraftId++}`;
    const draft: DraftRecord = {
      baseVersion: activeVersion,
      content: cloneContent(content),
      etag: `"${id}-r1"`,
      id,
      namespace: 'identity',
      revision: 1,
      scope: 'PLATFORM',
      stale: false,
      status: 'DRAFT',
      updatedAt: new Date().toISOString(),
    };
    drafts.set(id, draft);
    return draft;
  };

  return defineMock({
    'GET /api/v1/admin/policies': (
      request: MockRequest,
      response: MockResponse,
    ) => {
      if (!requireAuthorization(request, response)) {
        return;
      }
      response.json({
        activeVersion,
        items: POLICY_DEFINITIONS.map((definition) => ({
          ...definition,
          activeValue: activeContent[definition.key],
          activeVersion,
          enumOptions: definition.enumOptions?.map((option) => ({ ...option })),
        })),
        namespace: 'identity',
        scope: 'PLATFORM',
      });
    },
    'POST /api/v1/admin/policies/:namespace/drafts': (
      request: MockRequest,
      response: MockResponse,
    ) => {
      if (!requireMutation(request, response)) {
        return;
      }
      if (
        request.params?.namespace !== 'identity' ||
        !isRecord(request.body) ||
        request.body.scope !== 'PLATFORM'
      ) {
        sendProblem(
          response,
          422,
          'VALIDATION_ERROR',
          'Policy namespace 或 scope 不合法',
        );
        return;
      }
      const draft = createDraftFrom(activeContent);
      response.setHeader('ETag', draft.etag);
      response.status(201).json(cloneDraft(draft));
    },
    'PATCH /api/v1/admin/policies/:namespace/drafts/:draftId': (
      request: MockRequest,
      response: MockResponse,
    ) => {
      if (!requireMutation(request, response)) {
        return;
      }
      const draft = findDraft(request, response);
      if (draft === undefined) {
        return;
      }
      if (draft.status !== 'DRAFT') {
        sendProblem(response, 409, 'DRAFT_ARCHIVED', 'Policy Draft 已归档');
        return;
      }
      if (headerValue(request, 'If-Match') !== draft.etag) {
        sendProblem(
          response,
          409,
          'DRAFT_CONFLICT',
          '已被并发修改，刷新后重试',
        );
        return;
      }
      if (!isRecord(request.body) || !isRecord(request.body.content)) {
        sendProblem(response, 422, 'VALIDATION_ERROR', 'content 为必填对象');
        return;
      }
      draft.content = cloneContent(
        request.body.content as Record<string, PolicyValue>,
      );
      draft.revision += 1;
      draft.etag = `"${draft.id}-r${draft.revision}"`;
      draft.updatedAt = new Date().toISOString();
      response.setHeader('ETag', draft.etag);
      response.json(cloneDraft(draft));
    },
    'POST /api/v1/admin/policies/:namespace/drafts/:draftId/validate': (
      request: MockRequest,
      response: MockResponse,
    ) => {
      if (!requireMutation(request, response)) {
        return;
      }
      const draft = findDraft(request, response);
      if (draft !== undefined) {
        response.json(validationResult(draft));
      }
    },
    'GET /api/v1/admin/policies/:namespace/drafts/:draftId/preview': (
      request: MockRequest,
      response: MockResponse,
    ) => {
      if (!requireAuthorization(request, response)) {
        return;
      }
      const draft = findDraft(request, response);
      if (draft === undefined) {
        return;
      }
      response.json({
        baseVersion: draft.baseVersion,
        changes: POLICY_DEFINITIONS.map((definition) => ({
          afterValue: draft.content[definition.key],
          beforeValue: activeContent[definition.key],
          changed:
            draft.content[definition.key] !== activeContent[definition.key],
          effectSemantics: definition.effectSemantics,
          key: definition.key,
          label: definition.label,
        })),
        draftId: draft.id,
        namespace: draft.namespace,
      });
    },
    'POST /api/v1/admin/policies/:namespace/drafts/:draftId/publish': (
      request: MockRequest,
      response: MockResponse,
    ) => {
      if (!requireMutation(request, response)) {
        return;
      }
      const draft = findDraft(request, response);
      if (draft === undefined) {
        return;
      }
      if (!isRecord(request.body) || typeof request.body.reason !== 'string') {
        sendProblem(response, 422, 'VALIDATION_ERROR', 'reason 为必填项');
        return;
      }
      if (request.body.reason.trim().length === 0) {
        sendProblem(response, 422, 'VALIDATION_ERROR', 'reason 为必填项');
        return;
      }
      if (request.body.totpCode !== '123456') {
        sendProblem(response, 401, 'TOTP_INVALID', 'TOTP 验证码错误');
        return;
      }
      if (draft.baseVersion !== activeVersion) {
        sendProblem(
          response,
          409,
          'SOURCE_STALE',
          'Draft Base 已落后，请刷新后重试',
        );
        return;
      }
      const validation = validationResult(draft);
      if (!validation.valid) {
        sendProblem(
          response,
          422,
          'POLICY_VALIDATION_FAILED',
          'Policy 校验未通过',
          {
            issues: validation.issues,
          },
        );
        return;
      }
      activeVersion += 1;
      activeContent = cloneContent(draft.content);
      draft.status = 'ARCHIVED';
      for (const candidate of drafts.values()) {
        if (candidate.status === 'DRAFT' && candidate.id !== draft.id) {
          candidate.stale = true;
        }
      }
      const version: VersionRecord = {
        namespace: 'identity',
        publishedAt: new Date().toISOString(),
        publishedBy: '示例管理员',
        reason: request.body.reason.trim(),
        scope: 'PLATFORM',
        snapshot: cloneContent(activeContent),
        version: activeVersion,
      };
      versions.unshift(version);
      response.json({
        namespace: version.namespace,
        publishedAt: version.publishedAt,
        reason: version.reason,
        scope: version.scope,
        version: version.version,
      });
    },
    'POST /api/v1/admin/policies/:namespace/rollback': (
      request: MockRequest,
      response: MockResponse,
    ) => {
      if (!requireMutation(request, response)) {
        return;
      }
      const toVersion = isRecord(request.body)
        ? request.body.toVersion
        : undefined;
      const source = versions.find(
        (version) =>
          version.namespace === request.params?.namespace &&
          version.version === toVersion,
      );
      if (source === undefined) {
        sendProblem(
          response,
          404,
          'VERSION_NOT_FOUND',
          'Policy Version 不存在',
        );
        return;
      }
      const draft = createDraftFrom(source.snapshot);
      response.status(201).json(cloneDraft(draft));
    },
    'GET /api/v1/admin/policies/:namespace/versions': (
      request: MockRequest,
      response: MockResponse,
    ) => {
      if (!requireAuthorization(request, response)) {
        return;
      }
      response.json({
        items: versions
          .filter(({ namespace }) => namespace === request.params?.namespace)
          .map(({ snapshot: _snapshot, ...version }) => ({
            ...version,
            current: version.version === activeVersion,
          })),
      });
    },
  });
}

export default createAdminPoliciesMock();
