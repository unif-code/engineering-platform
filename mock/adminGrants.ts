import { defineMock } from '@umijs/max';
import { type GovernanceCatalog, governanceCatalog } from './governanceCatalog';

const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

type GrantScopeType = 'PLATFORM' | 'WORKSPACE';
type GrantStatus = 'ACTIVE' | 'REVOKED';

interface PrincipalRef {
  displayName: string;
  employeeNo?: string;
  id: string;
  type: 'ACCOUNT' | 'ROLE' | 'SERVICE_ACCOUNT';
}

interface GrantRecord {
  capability: string;
  grantedBy: string;
  id: string;
  principal: PrincipalRef;
  risk: 'HIGH' | 'NORMAL';
  scope: { id: string | null; label: string; type: GrantScopeType };
  source: 'DIRECT' | 'INHERITED';
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
  catalog?: GovernanceCatalog;
}

const STATIC_PRINCIPALS = {
  'role-administrator': {
    displayName: '管理员',
    id: 'role-administrator',
    type: 'ROLE',
  },
  'role-development-leader': {
    displayName: '开发Leader',
    id: 'role-development-leader',
    type: 'ROLE',
  },
  'service-agent-runner': {
    displayName: 'svc-agent-runner',
    id: 'service-agent-runner',
    type: 'SERVICE_ACCOUNT',
  },
} as const satisfies Record<string, PrincipalRef>;

const accountPrincipal = (id: string): PrincipalRef => {
  const account = governanceCatalog.findAccount(id);
  if (account === undefined) {
    throw new Error(`Missing governance account fixture: ${id}`);
  }
  return { ...account, type: 'ACCOUNT' };
};

const INITIAL_GRANTS = Object.freeze([
  Object.freeze({
    capability: 'task.develop',
    grantedBy: '康宁',
    id: 'grant-audit-reader',
    principal: accountPrincipal('account-4'),
    risk: 'NORMAL',
    scope: Object.freeze({
      id: 'workspace-platform-core',
      label: '营销工作区',
      type: 'WORKSPACE',
    }),
    source: 'DIRECT',
    status: 'ACTIVE',
    validFrom: '2026-07-01T08:00:00.000Z',
    validTo: null,
    version: 1,
  }),
  Object.freeze({
    capability: 'mr.merge',
    grantedBy: '康宁',
    id: 'grant-merge-trading',
    principal: accountPrincipal('account-9'),
    risk: 'HIGH',
    scope: Object.freeze({
      id: 'workspace-agent-runtime',
      label: '交易工作区',
      type: 'WORKSPACE',
    }),
    source: 'DIRECT',
    status: 'ACTIVE',
    validFrom: '2026-07-01T08:00:00.000Z',
    validTo: null,
    version: 1,
  }),
  Object.freeze({
    capability: 'task.assign',
    grantedBy: '系统',
    id: 'grant-role-development-leader',
    principal: STATIC_PRINCIPALS['role-development-leader'],
    risk: 'NORMAL',
    scope: Object.freeze({ id: null, label: 'Platform', type: 'PLATFORM' }),
    source: 'INHERITED',
    status: 'ACTIVE',
    validFrom: '2026-05-20T08:00:00.000Z',
    validTo: null,
    version: 1,
  }),
  Object.freeze({
    capability: 'task.create',
    grantedBy: '康宁',
    id: 'grant-task-create-marketing',
    principal: accountPrincipal('account-1'),
    risk: 'NORMAL',
    scope: Object.freeze({
      id: 'workspace-platform-core',
      label: '营销工作区',
      type: 'WORKSPACE',
    }),
    source: 'DIRECT',
    status: 'ACTIVE',
    validFrom: '2026-06-11T08:00:00.000Z',
    validTo: null,
    version: 1,
  }),
  Object.freeze({
    capability: 'identity.account.manage',
    grantedBy: '康宁',
    id: 'grant-account-manager',
    principal: accountPrincipal('account-11'),
    risk: 'HIGH',
    scope: Object.freeze({ id: null, label: 'Platform', type: 'PLATFORM' }),
    source: 'DIRECT',
    status: 'ACTIVE',
    validFrom: '2026-08-01T08:00:00.000Z',
    validTo: '2026-08-15T08:00:00.000Z',
    version: 1,
  }),
  Object.freeze({
    capability: 'task.develop',
    grantedBy: '系统',
    id: 'grant-service-agent-runner',
    principal: STATIC_PRINCIPALS['service-agent-runner'],
    risk: 'NORMAL',
    scope: Object.freeze({ id: null, label: 'Platform', type: 'PLATFORM' }),
    source: 'DIRECT',
    status: 'ACTIVE',
    validFrom: '2026-04-02T08:00:00.000Z',
    validTo: null,
    version: 1,
  }),
  Object.freeze({
    capability: 'task.approve',
    grantedBy: '康宁',
    id: 'grant-task-approve-trading',
    principal: accountPrincipal('account-10'),
    risk: 'NORMAL',
    scope: Object.freeze({
      id: 'workspace-agent-runtime',
      label: '交易工作区',
      type: 'WORKSPACE',
    }),
    source: 'DIRECT',
    status: 'ACTIVE',
    validFrom: '2026-06-30T08:00:00.000Z',
    validTo: null,
    version: 1,
  }),
  Object.freeze({
    capability: 'admin.policy',
    grantedBy: '系统',
    id: 'grant-role-administrator',
    principal: STATIC_PRINCIPALS['role-administrator'],
    risk: 'HIGH',
    scope: Object.freeze({ id: null, label: 'Platform', type: 'PLATFORM' }),
    source: 'INHERITED',
    status: 'ACTIVE',
    validFrom: '2026-05-20T08:00:00.000Z',
    validTo: null,
    version: 1,
  }),
  Object.freeze({
    capability: 'mr.merge',
    grantedBy: '吴桐',
    id: 'grant-merge-marketing-temporary',
    principal: accountPrincipal('account-5'),
    risk: 'HIGH',
    scope: Object.freeze({
      id: 'workspace-platform-core',
      label: '营销工作区',
      type: 'WORKSPACE',
    }),
    source: 'DIRECT',
    status: 'ACTIVE',
    validFrom: '2026-08-04T08:00:00.000Z',
    validTo: '2026-08-12T08:00:00.000Z',
    version: 1,
  }),
  Object.freeze({
    capability: 'audit.read',
    grantedBy: '系统',
    id: 'grant-audit-platform',
    principal: accountPrincipal('account-12'),
    risk: 'NORMAL',
    scope: Object.freeze({ id: null, label: 'Platform', type: 'PLATFORM' }),
    source: 'DIRECT',
    status: 'ACTIVE',
    validFrom: '2026-03-15T08:00:00.000Z',
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

const toContractGrant = (grant: GrantRecord) => ({
  capability: grant.capability,
  id: grant.id,
  principal: {
    displayName: grant.principal.displayName,
    employeeNo: grant.principal.employeeNo ?? grant.principal.id,
    id: grant.principal.id,
  },
  scope: { ...grant.scope },
  source: 'DIRECT' as const,
  status: grant.status,
  validFrom: grant.validFrom,
  validTo: grant.validTo,
  version: grant.version,
});

export function createAdminGrantsMock(options: AdminGrantsMockOptions = {}) {
  const authorize = options.authorize ?? (() => true);
  const catalog = options.catalog ?? governanceCatalog;
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
          grant.source === 'DIRECT' &&
          (!capability || grant.capability === capability) &&
          (!principalId || grant.principal.id === principalId),
      );
      const page = positiveInteger(queryValue(request, 'page'), 1);
      const pageSize = positiveInteger(queryValue(request, 'pageSize'), 10);
      const offset = (page - 1) * pageSize;
      response.json({
        items: filtered.slice(offset, offset + pageSize).map(toContractGrant),
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
      const account =
        typeof body.principalId === 'string'
          ? catalog.findAccount(body.principalId)
          : undefined;
      const principal =
        typeof body.principalId === 'string'
          ? (STATIC_PRINCIPALS[
              body.principalId as keyof typeof STATIC_PRINCIPALS
            ] ??
            (account === undefined
              ? undefined
              : { ...account, type: 'ACCOUNT' as const }))
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
        sendProblem(
          response,
          422,
          'RESERVED_CAPABILITY',
          '保留能力不可普通授予',
        );
        return;
      }
      if (
        scopeType !== 'PLATFORM' &&
        (scopeType !== 'WORKSPACE' ||
          scopeId === undefined ||
          catalog.findWorkspace(scopeId) === undefined)
      ) {
        sendProblem(response, 422, 'VALIDATION_ERROR', 'Grant scope 不合法');
        return;
      }
      const normalizedScope =
        scopeType === 'PLATFORM'
          ? ({ id: null, label: 'Platform', type: 'PLATFORM' } as const)
          : ({
              id: scopeId as string,
              label: catalog.findWorkspace(scopeId as string)?.name ?? '',
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
        grantedBy: '当前管理员',
        id: `grant-mock-${nextGrantId++}`,
        principal: { ...principal },
        risk: /^(mr\.merge|admin\.)/.test(capability) ? 'HIGH' : 'NORMAL',
        scope: normalizedScope,
        source: 'DIRECT',
        status: 'ACTIVE',
        validFrom: new Date().toISOString(),
        validTo: null,
        version: 1,
      };
      grants.unshift(grant);
      response.status(201).json(toContractGrant(grant));
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
      if (grant.source === 'INHERITED') {
        sendProblem(
          response,
          422,
          'INHERITED_GRANT',
          '继承授权不能单条撤销，请到角色管理调整能力模板',
        );
        return;
      }
      if (grant.status === 'REVOKED') {
        sendProblem(response, 409, 'GRANT_CONFLICT', 'Grant 已撤销');
        return;
      }
      grant.status = 'REVOKED';
      grant.version += 1;
      response.json(toContractGrant(grant));
    },
  });
}

export default createAdminGrantsMock();
