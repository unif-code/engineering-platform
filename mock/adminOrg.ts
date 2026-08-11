import { defineMock } from '@umijs/max';

const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

type OrganizationKind = 'MANAGER' | 'LEADER' | 'MEMBER';

interface OrganizationRecord {
  displayName: string;
  employeeNo: string;
  id: string;
  kind: OrganizationKind;
  superiorId: string | null;
}

interface OrganizationNode extends OrganizationRecord {
  children: OrganizationNode[];
}

interface MockRequest {
  body?: unknown;
  headers: Record<string, string | string[] | undefined>;
  params?: Record<string, string | undefined>;
}

interface MockResponse {
  end: () => unknown;
  json: (body: unknown) => unknown;
  setHeader: (name: string, value: string) => unknown;
  status: (statusCode: number) => MockResponse;
}

export interface AdminOrganizationMockOptions {
  authorize?: (request: MockRequest) => boolean;
}

const INITIAL_ORGANIZATION = Object.freeze([
  Object.freeze({
    displayName: '周天',
    employeeNo: '10001000',
    id: 'manager-zhou',
    kind: 'MANAGER',
    superiorId: null,
  }),
  Object.freeze({
    displayName: '顾北',
    employeeNo: '10001001',
    id: 'manager-gu',
    kind: 'MANAGER',
    superiorId: null,
  }),
  Object.freeze({
    displayName: '方舟',
    employeeNo: '10002000',
    id: 'leader-fang',
    kind: 'LEADER',
    superiorId: 'manager-zhou',
  }),
  Object.freeze({
    displayName: '沈一',
    employeeNo: '10002001',
    id: 'leader-shen',
    kind: 'LEADER',
    superiorId: 'manager-zhou',
  }),
  Object.freeze({
    displayName: '赵晨',
    employeeNo: '10002002',
    id: 'leader-zhao',
    kind: 'LEADER',
    superiorId: 'manager-gu',
  }),
  Object.freeze({
    displayName: '林一',
    employeeNo: '10003000',
    id: 'member-lin',
    kind: 'MEMBER',
    superiorId: 'leader-fang',
  }),
  Object.freeze({
    displayName: '韩梅',
    employeeNo: '10003001',
    id: 'member-han',
    kind: 'MEMBER',
    superiorId: 'leader-shen',
  }),
  Object.freeze({
    displayName: '吴桐',
    employeeNo: '10003002',
    id: 'member-wu',
    kind: 'MEMBER',
    superiorId: 'leader-zhao',
  }),
] as const satisfies readonly OrganizationRecord[]);

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value);

const headerValue = (request: MockRequest, name: string) => {
  const entry = Object.entries(request.headers).find(
    ([headerName]) => headerName.toLowerCase() === name.toLowerCase(),
  );
  return Array.isArray(entry?.[1]) ? entry[1][0] : entry?.[1];
};

export function createAdminOrganizationMock(
  options: AdminOrganizationMockOptions = {},
) {
  const authorize = options.authorize ?? (() => true);
  const records: OrganizationRecord[] = INITIAL_ORGANIZATION.map((record) => ({
    ...record,
  }));
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
      requestId: `mock-admin-org-${String(++requestSequence).padStart(4, '0')}`,
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
    sendProblem(response, 403, 'FORBIDDEN', '无组织治理权限');
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
        errors: [{ field: 'reason', reason: '请输入调整原因' }],
      });
      return false;
    }
    return true;
  };

  const toNode = (record: OrganizationRecord): OrganizationNode => ({
    ...record,
    children: records
      .filter(({ superiorId }) => superiorId === record.id)
      .map(toNode),
  });

  return defineMock({
    'GET /api/v1/admin/organization/tree': (
      request: MockRequest,
      response: MockResponse,
    ) => {
      if (!requireAuthorization(request, response)) {
        return;
      }
      response.json({
        items: records
          .filter(({ superiorId }) => superiorId === null)
          .map(toNode),
      });
    },
    'PUT /api/v1/admin/accounts/:accountId/superior': (
      request: MockRequest,
      response: MockResponse,
    ) => {
      if (!requireWrite(request, response)) {
        return;
      }
      const account = records.find(
        ({ id }) => id === request.params?.accountId,
      );
      const superiorId = isRecord(request.body)
        ? request.body.superiorId
        : undefined;
      const superior = records.find(({ id }) => id === superiorId);
      if (account === undefined || superior === undefined) {
        sendProblem(response, 422, 'VALIDATION_ERROR', '目标账号或上级不存在');
        return;
      }
      if (account.kind === 'MANAGER') {
        sendProblem(
          response,
          422,
          'VALIDATION_ERROR',
          '经理不能设置平台内上级',
        );
        return;
      }
      const expectedKind = account.kind === 'LEADER' ? 'MANAGER' : 'LEADER';
      if (superior.kind !== expectedKind) {
        sendProblem(
          response,
          422,
          'VALIDATION_ERROR',
          account.kind === 'LEADER'
            ? 'Leader 只能归属经理'
            : '普通员工只能归属 Leader',
        );
        return;
      }
      if (account.superiorId === superior.id) {
        sendProblem(response, 409, 'ORGANIZATION_CONFLICT', '账号已属于该上级');
        return;
      }
      account.superiorId = superior.id;
      response.status(204).end();
    },
  });
}

export default createAdminOrganizationMock();
