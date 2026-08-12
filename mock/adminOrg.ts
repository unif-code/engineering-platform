import { defineMock } from '@umijs/max';

const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

type OrganizationKind = 'MANAGER' | 'LEADER' | 'MEMBER';
type OrganizationAccountStatus = 'ACTIVE' | 'DISABLED';

interface OrganizationRecord {
  departmentKey: string;
  displayName: string;
  employeeNo: string;
  id: string;
  kind: OrganizationKind;
  lastLoginAt: string;
  roles: readonly string[];
  status: OrganizationAccountStatus;
  superiorId: string | null;
}

interface OrganizationNode {
  children: OrganizationNode[];
  displayName: string;
  employeeNo: string;
  id: string;
  kind: OrganizationKind;
  superiorId: string | null;
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
    departmentKey: 'marketing',
    displayName: '赵敏',
    employeeNo: 'E1007',
    id: 'manager-zhao',
    kind: 'MANAGER',
    lastLoginAt: '08-06 08:12',
    roles: Object.freeze(['经理']),
    status: 'ACTIVE',
    superiorId: null,
  }),
  Object.freeze({
    departmentKey: 'trading',
    displayName: '秦岚',
    employeeNo: 'E2003',
    id: 'manager-qin',
    kind: 'MANAGER',
    lastLoginAt: '08-05 16:03',
    roles: Object.freeze(['产品']),
    status: 'ACTIVE',
    superiorId: null,
  }),
  Object.freeze({
    departmentKey: 'platform',
    displayName: '罗成',
    employeeNo: 'E3001',
    id: 'manager-luo',
    kind: 'MANAGER',
    lastLoginAt: '08-06 07:55',
    roles: Object.freeze(['经理']),
    status: 'ACTIVE',
    superiorId: null,
  }),
  Object.freeze({
    departmentKey: 'operations',
    displayName: '康宁',
    employeeNo: 'E3002',
    id: 'manager-kang',
    kind: 'MANAGER',
    lastLoginAt: '08-04 18:30',
    roles: Object.freeze(['后端开发']),
    status: 'ACTIVE',
    superiorId: null,
  }),
  Object.freeze({
    departmentKey: 'marketing',
    displayName: '吴桐',
    employeeNo: 'E1002',
    id: 'leader-wu',
    kind: 'LEADER',
    lastLoginAt: '08-06 08:41',
    roles: Object.freeze(['产品Leader']),
    status: 'ACTIVE',
    superiorId: 'manager-zhao',
  }),
  Object.freeze({
    departmentKey: 'marketing',
    displayName: '李强',
    employeeNo: 'E1003',
    id: 'leader-li',
    kind: 'LEADER',
    lastLoginAt: '08-06 09:31',
    roles: Object.freeze(['开发Leader']),
    status: 'ACTIVE',
    superiorId: 'manager-zhao',
  }),
  Object.freeze({
    departmentKey: 'trading',
    displayName: '刘洋',
    employeeNo: 'E2001',
    id: 'leader-liu',
    kind: 'LEADER',
    lastLoginAt: '08-06 09:40',
    roles: Object.freeze(['开发Leader']),
    status: 'ACTIVE',
    superiorId: 'manager-qin',
  }),
  Object.freeze({
    departmentKey: 'platform',
    displayName: '高翔',
    employeeNo: 'E3003',
    id: 'leader-gao',
    kind: 'LEADER',
    lastLoginAt: '08-06 09:18',
    roles: Object.freeze(['开发Leader']),
    status: 'ACTIVE',
    superiorId: 'manager-luo',
  }),
  Object.freeze({
    departmentKey: 'operations',
    displayName: '孙杰',
    employeeNo: 'E0001',
    id: 'leader-sun',
    kind: 'LEADER',
    lastLoginAt: '08-06 08:00',
    roles: Object.freeze(['管理员']),
    status: 'ACTIVE',
    superiorId: 'manager-kang',
  }),
  Object.freeze({
    departmentKey: 'marketing',
    displayName: '王悦',
    employeeNo: 'E1001',
    id: 'member-wang',
    kind: 'MEMBER',
    lastLoginAt: '08-06 09:02',
    roles: Object.freeze(['产品']),
    status: 'ACTIVE',
    superiorId: 'leader-wu',
  }),
  Object.freeze({
    departmentKey: 'marketing',
    displayName: '陈晓',
    employeeNo: 'E1004',
    id: 'member-chen',
    kind: 'MEMBER',
    lastLoginAt: '08-06 10:02',
    roles: Object.freeze(['前端开发']),
    status: 'ACTIVE',
    superiorId: 'leader-li',
  }),
  Object.freeze({
    departmentKey: 'marketing',
    displayName: '郑楠',
    employeeNo: 'E1005',
    id: 'member-zheng',
    kind: 'MEMBER',
    lastLoginAt: '08-05 19:22',
    roles: Object.freeze(['后端开发']),
    status: 'ACTIVE',
    superiorId: 'leader-li',
  }),
  Object.freeze({
    departmentKey: 'marketing',
    displayName: '徐蕾',
    employeeNo: 'E1006',
    id: 'member-xu',
    kind: 'MEMBER',
    lastLoginAt: '08-01 11:20',
    roles: Object.freeze(['前端开发']),
    status: 'DISABLED',
    superiorId: 'leader-li',
  }),
  Object.freeze({
    departmentKey: 'trading',
    displayName: '何山',
    employeeNo: 'E2002',
    id: 'member-he',
    kind: 'MEMBER',
    lastLoginAt: '08-06 10:44',
    roles: Object.freeze(['前端开发', '后端开发']),
    status: 'ACTIVE',
    superiorId: 'leader-liu',
  }),
  Object.freeze({
    departmentKey: 'operations',
    displayName: '周天',
    employeeNo: 'E0000',
    id: 'member-zhou',
    kind: 'MEMBER',
    lastLoginAt: '08-06 07:30',
    roles: Object.freeze(['超级管理员']),
    status: 'ACTIVE',
    superiorId: 'leader-sun',
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
    children: records
      .filter(({ superiorId }) => superiorId === record.id)
      .map(toNode),
    displayName: record.displayName,
    employeeNo: record.employeeNo,
    id: record.id,
    kind: record.kind,
    superiorId: record.superiorId,
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
      account.departmentKey = superior.departmentKey;
      response.status(204).end();
    },
  });
}

export default createAdminOrganizationMock();
