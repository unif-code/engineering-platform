import { defineMock } from '@umijs/max';

const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

type GrantScopeType = 'PLATFORM' | 'WORKSPACE';
type GrantStatus = 'ACTIVE' | 'REVOKED';

interface PrincipalRef {
  displayName: string;
  employeeNo: string;
  id: string;
}

interface GrantRecord {
  capability: string;
  id: string;
  principal: PrincipalRef;
  scope: { id: string | null; label: string; type: GrantScopeType };
  source: 'DIRECT';
  status: GrantStatus;
  validFrom: string | null;
  validTo: string | null;
  version: number;
}

interface MockRequest {
  body?: unknown;
  headers: Record<string, string | string[] | undefined>;
  params?: Record<string, string | undefined>;
  query?: Record<string, string | string[] | undefined>;
}

interface MockResponse {
  json: (body: unknown) => unknown;
  setHeader: (name: string, value: string) => unknown;
  status: (statusCode: number) => MockResponse;
}

export interface AdminGrantsMockOptions {
  authorize?: (request: MockRequest) => boolean;
}

const PRINCIPALS = {
  'account-1': {
    displayName: '示例用户甲',
    employeeNo: '10000001',
    id: 'account-1',
  },
  'account-2': {
    displayName: '示例用户乙',
    employeeNo: '10000002',
    id: 'account-2',
  },
  'account-4': {
    displayName: '示例用户丁',
    employeeNo: '10000004',
    id: 'account-4',
  },
} as const satisfies Record<string, PrincipalRef>;

const WORKSPACES = {
  'workspace-agent-runtime': 'Agent Runtime',
  'workspace-platform-core': 'Platform Core',
} as const satisfies Record<string, string>;

const INITIAL_GRANTS = Object.freeze([
  Object.freeze({
    capability: 'audit.read',
    id: 'grant-audit-reader',
    principal: PRINCIPALS['account-1'],
    scope: Object.freeze({ id: null, label: 'Platform', type: 'PLATFORM' }),
    source: 'DIRECT',
    status: 'ACTIVE',
    validFrom: '2026-08-01T08:00:00.000Z',
    validTo: null,
    version: 1,
  }),
  Object.freeze({
    capability: 'organization.manage',
    id: 'grant-organization-manager',
    principal: PRINCIPALS['account-2'],
    scope: Object.freeze({ id: null, label: 'Platform', type: 'PLATFORM' }),
    source: 'DIRECT',
    status: 'ACTIVE',
    validFrom: '2026-08-02T08:00:00.000Z',
    validTo: null,
    version: 1,
  }),
  Object.freeze({
    capability: 'identity.account.manage',
    id: 'grant-account-manager',
    principal: PRINCIPALS['account-4'],
    scope: Object.freeze({ id: null, label: 'Platform', type: 'PLATFORM' }),
    source: 'DIRECT',
    status: 'ACTIVE',
    validFrom: '2026-08-03T08:00:00.000Z',
    validTo: null,
    version: 1,
  }),
] as const satisfies readonly GrantRecord[]);

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value);

const headerValue = (request: MockRequest, name: string) => {
  const entry = Object.entries(request.headers).find(
    ([headerName]) => headerName.toLowerCase() === name.toLowerCase(),
  );
  return Array.isArray(entry?.[1]) ? entry[1][0] : entry?.[1];
};

const queryValue = (request: MockRequest, name: string) => {
  const value = request.query?.[name];
  return Array.isArray(value) ? value[0] : value;
};

const positiveInteger = (value: string | undefined, fallback: number) => {
  const parsed = Number(value);
  return Number.isSafeInteger(parsed) && parsed > 0 ? parsed : fallback;
};

const cloneGrant = (grant: GrantRecord): GrantRecord => ({
  ...grant,
  principal: { ...grant.principal },
  scope: { ...grant.scope },
});

export function createAdminGrantsMock(
  options: AdminGrantsMockOptions = {},
) {
  const authorize = options.authorize ?? (() => true);
  const grants = INITIAL_GRANTS.map(cloneGrant);
  let nextGrantId = 1;
  let requestSequence = 0;

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
      requestId: `mock-admin-grant-${String(++requestSequence).padStart(4, '0')}`,
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
    sendProblem(response, 403, 'FORBIDDEN', '无 Grant 治理权限');
    return false;
  };

  const requireWrite = (request: MockRequest, response: MockResponse) => {
    if (!requireAuthorization(request, response)) {
      return false;
    }
    const key = headerValue(request, 'Idempotency-Key');
    if (typeof key !== 'string' || !UUID_PATTERN.test(key)) {
      sendProblem(
        response,
        422,
        'VALIDATION_ERROR',
        'Idempotency-Key 缺失或格式错误，必须为 UUID',
      );
      return false;
    }
    if (
      !isRecord(request.body) ||
      typeof request.body.reason !== 'string' ||
      request.body.reason.trim().length === 0
    ) {
      sendProblem(response, 422, 'VALIDATION_ERROR', 'reason 为必填项', {
        errors: [{ field: 'reason', reason: '请输入操作原因' }],
      });
      return false;
    }
    return true;
  };

  return defineMock({
    'GET /api/v1/admin/grants': (
      request: MockRequest,
      response: MockResponse,
    ) => {
      if (!requireAuthorization(request, response)) {
        return;
      }
      const capability = queryValue(request, 'capability')?.trim();
      const principalId = queryValue(request, 'principalId')?.trim();
      const filtered = grants.filter(
        (grant) =>
          (!capability || grant.capability === capability) &&
          (!principalId || grant.principal.id === principalId),
      );
      const page = positiveInteger(queryValue(request, 'page'), 1);
      const pageSize = positiveInteger(queryValue(request, 'pageSize'), 10);
      const offset = (page - 1) * pageSize;
      response.json({
        items: filtered.slice(offset, offset + pageSize).map(cloneGrant),
        total: filtered.length,
      });
    },
    'POST /api/v1/admin/grants': (
      request: MockRequest,
      response: MockResponse,
    ) => {
      if (!requireWrite(request, response)) {
        return;
      }
      const body = request.body as Record<string, unknown>;
      const principal =
        typeof body.principalId === 'string'
          ? PRINCIPALS[body.principalId as keyof typeof PRINCIPALS]
          : undefined;
      const capability =
        typeof body.capability === 'string' ? body.capability.trim() : '';
      const scope = isRecord(body.scope) ? body.scope : undefined;
      const scopeType = scope?.type;
      const scopeId = typeof scope?.id === 'string' ? scope.id : undefined;
      if (principal === undefined || capability.length === 0 || !scope) {
        sendProblem(
          response,
          422,
          'VALIDATION_ERROR',
          'principal、capability 与 scope 为必填项',
        );
        return;
      }
      if (
        capability === 'platform.configuration.manage' ||
        capability === 'platform.super_admin.manage'
      ) {
        sendProblem(response, 422, 'RESERVED_CAPABILITY', '保留能力不可普通授予');
        return;
      }
      if (
        scopeType !== 'PLATFORM' &&
        (scopeType !== 'WORKSPACE' ||
          scopeId === undefined ||
          WORKSPACES[scopeId as keyof typeof WORKSPACES] === undefined)
      ) {
        sendProblem(response, 422, 'VALIDATION_ERROR', 'Grant scope 不合法');
        return;
      }
      const normalizedScope =
        scopeType === 'PLATFORM'
          ? ({ id: null, label: 'Platform', type: 'PLATFORM' } as const)
          : ({
              id: scopeId as string,
              label: WORKSPACES[scopeId as keyof typeof WORKSPACES],
              type: 'WORKSPACE',
            } as const);
      if (
        grants.some(
          (grant) =>
            grant.status === 'ACTIVE' &&
            grant.principal.id === principal.id &&
            grant.capability === capability &&
            grant.scope.type === normalizedScope.type &&
            grant.scope.id === normalizedScope.id,
        )
      ) {
        sendProblem(response, 409, 'GRANT_CONFLICT', '相同 Grant 已存在');
        return;
      }
      const grant: GrantRecord = {
        capability,
        id: `grant-mock-${nextGrantId++}`,
        principal: { ...principal },
        scope: normalizedScope,
        source: 'DIRECT',
        status: 'ACTIVE',
        validFrom: new Date().toISOString(),
        validTo: null,
        version: 1,
      };
      grants.unshift(grant);
      response.status(201).json(cloneGrant(grant));
    },
    'DELETE /api/v1/admin/grants/:grantId': (
      request: MockRequest,
      response: MockResponse,
    ) => {
      if (!requireWrite(request, response)) {
        return;
      }
      const grant = grants.find(({ id }) => id === request.params?.grantId);
      if (grant === undefined) {
        sendProblem(response, 404, 'GRANT_NOT_FOUND', 'Grant 不存在');
        return;
      }
      if (grant.status === 'REVOKED') {
        sendProblem(response, 409, 'GRANT_CONFLICT', 'Grant 已撤销');
        return;
      }
      grant.status = 'REVOKED';
      grant.version += 1;
      response.json(cloneGrant(grant));
    },
  });
}

export default createAdminGrantsMock();
