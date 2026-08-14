import { defineMock } from '@umijs/max';
import { type GovernanceCatalog, governanceCatalog } from './governanceCatalog';

const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

type AccountStatus = 'PENDING_INIT' | 'ENABLED' | 'DISABLED' | 'RESTRICTED';

interface AccountSummary {
  id: string;
  employeeNo: string;
  displayName: string;
  lastLogin?: string;
  profession: string | null;
  roles?: readonly string[];
  status: AccountStatus;
  superior?: string;
  team?: string;
}

interface MockRequest {
  body?: unknown;
  headers: Record<string, string | string[] | undefined>;
  params?: Record<string, string | undefined>;
  query?: Record<string, string | string[] | undefined>;
}

interface MockResponse {
  end: () => unknown;
  json: (body: unknown) => unknown;
  setHeader: (name: string, value: string) => unknown;
  status: (statusCode: number) => MockResponse;
}

export interface AdminAccountsMockOptions {
  authorize?: (request: MockRequest) => boolean;
  catalog?: GovernanceCatalog;
}

const INITIAL_ACCOUNTS = Object.freeze([
  Object.freeze({
    displayName: '王悦',
    employeeNo: 'E1001',
    id: 'account-1',
    lastLogin: '08-06 09:02',
    profession: '产品',
    roles: Object.freeze(['产品']),
    status: 'ENABLED',
    superior: '吴桐 · 产品Leader · 营销',
    team: '营销',
  }),
  Object.freeze({
    displayName: '吴桐',
    employeeNo: 'E1002',
    id: 'account-2',
    lastLogin: '08-06 08:41',
    profession: '产品',
    roles: Object.freeze(['产品Leader']),
    status: 'ENABLED',
    superior: '赵敏 · 经理',
    team: '营销',
  }),
  Object.freeze({
    displayName: '李强',
    employeeNo: 'E1003',
    id: 'account-3',
    lastLogin: '08-06 09:31',
    profession: '研发',
    roles: Object.freeze(['开发Leader']),
    status: 'ENABLED',
    superior: '赵敏 · 经理',
    team: '营销',
  }),
  Object.freeze({
    displayName: '陈晓',
    employeeNo: 'E1004',
    id: 'account-4',
    lastLogin: '08-06 10:02',
    profession: '研发',
    roles: Object.freeze(['前端开发']),
    status: 'ENABLED',
    superior: '李强 · 开发Leader · 营销',
    team: '营销',
  }),
  Object.freeze({
    displayName: '郑楠',
    employeeNo: 'E1005',
    id: 'account-5',
    lastLogin: '08-05 19:22',
    profession: '研发',
    roles: Object.freeze(['后端开发']),
    status: 'ENABLED',
    superior: '李强 · 开发Leader · 营销',
    team: '营销',
  }),
  Object.freeze({
    displayName: '徐蕾',
    employeeNo: 'E1006',
    id: 'account-6',
    lastLogin: '08-01 11:20',
    profession: '研发',
    roles: Object.freeze(['前端开发']),
    status: 'DISABLED',
    superior: '李强 · 开发Leader · 营销',
    team: '营销',
  }),
  Object.freeze({
    displayName: '赵敏',
    employeeNo: 'E1007',
    id: 'account-7',
    lastLogin: '08-06 08:12',
    profession: null,
    roles: Object.freeze(['经理']),
    status: 'ENABLED',
    superior: '无',
    team: '营销',
  }),
  Object.freeze({
    displayName: '刘洋',
    employeeNo: 'E2001',
    id: 'account-8',
    lastLogin: '08-06 09:40',
    profession: '研发',
    roles: Object.freeze(['开发Leader']),
    status: 'ENABLED',
    superior: '无',
    team: '交易',
  }),
  Object.freeze({
    displayName: '何山',
    employeeNo: 'E2002',
    id: 'account-9',
    lastLogin: '08-06 10:44',
    profession: '研发',
    roles: Object.freeze(['前端开发', '后端开发']),
    status: 'ENABLED',
    superior: '刘洋 · 开发Leader · 交易',
    team: '交易',
  }),
  Object.freeze({
    displayName: '秦岚',
    employeeNo: 'E2003',
    id: 'account-10',
    lastLogin: '08-05 16:03',
    profession: '产品',
    roles: Object.freeze(['产品']),
    status: 'ENABLED',
    superior: '无',
    team: '交易',
  }),
  Object.freeze({
    displayName: '罗成',
    employeeNo: 'E3001',
    id: 'account-11',
    lastLogin: '08-06 07:55',
    profession: null,
    roles: Object.freeze(['经理']),
    status: 'ENABLED',
    superior: '无',
    team: '中台',
  }),
  Object.freeze({
    displayName: '康宁',
    employeeNo: 'E3002',
    id: 'account-12',
    lastLogin: '08-04 18:30',
    profession: '研发',
    roles: Object.freeze(['后端开发']),
    status: 'ENABLED',
    superior: '高翔 · 开发Leader · 中台',
    team: '中台',
  }),
  Object.freeze({
    displayName: '孙杰',
    employeeNo: 'E0001',
    id: 'account-13',
    lastLogin: '08-06 08:00',
    profession: null,
    roles: Object.freeze(['管理员']),
    status: 'ENABLED',
    superior: '无',
    team: '平台',
  }),
  Object.freeze({
    displayName: '周天',
    employeeNo: 'E0000',
    id: 'account-14',
    lastLogin: '08-06 07:30',
    profession: null,
    roles: Object.freeze(['超级管理员']),
    status: 'ENABLED',
    superior: '无',
    team: '平台',
  }),
] as const satisfies readonly AccountSummary[]);

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value);

const headerValue = (request: MockRequest, name: string) => {
  const entry = Object.entries(request.headers).find(
    ([headerName]) => headerName.toLowerCase() === name.toLowerCase(),
  );
  const value = entry?.[1];
  return Array.isArray(value) ? value[0] : value;
};

const queryValue = (request: MockRequest, name: string) => {
  const value = request.query?.[name];
  return Array.isArray(value) ? value[0] : value;
};

const parsePositiveInteger = (value: string | undefined, fallback: number) => {
  const parsed = Number(value);
  return Number.isSafeInteger(parsed) && parsed > 0 ? parsed : fallback;
};

const toContractAccount = (account: AccountSummary) => ({
  displayName: account.displayName,
  employeeNo: account.employeeNo,
  etag: `"v${'version' in account ? account.version : 1}"`,
  id: account.id,
  profession: account.profession,
  status: account.status,
});

export const createAdminAccountsMock = (
  options: AdminAccountsMockOptions = {},
) => {
  const authorize = options.authorize ?? (() => true);
  const catalog = options.catalog ?? governanceCatalog;
  const accounts: Array<AccountSummary & { version: number }> =
    INITIAL_ACCOUNTS.map((account) => ({
      ...account,
      version: 1,
    }));
  for (const account of accounts) {
    catalog.registerAccount(toContractAccount(account));
  }
  let nextAccountId = INITIAL_ACCOUNTS.length + 1;
  let requestSequence = 0;

  const sendJson = (response: MockResponse, status: number, body: unknown) => {
    response.status(status);
    response.setHeader('Content-Type', 'application/json');
    response.json(body);
  };

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
      type: `https://engineering-platform.example/problems/${title.toLowerCase()}`,
      title,
      status,
      detail,
      requestId: `mock-admin-account-${String(++requestSequence).padStart(4, '0')}`,
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
    sendProblem(response, 403, 'FORBIDDEN', '无账号治理权限');
    return false;
  };

  const requireIdempotencyKey = (
    request: MockRequest,
    response: MockResponse,
  ) => {
    const key = headerValue(request, 'Idempotency-Key');
    if (typeof key === 'string' && UUID_PATTERN.test(key)) {
      return true;
    }
    sendProblem(
      response,
      422,
      'VALIDATION_ERROR',
      'Idempotency-Key 缺失或格式错误，必须为 UUID',
      { errors: [{ field: 'Idempotency-Key', reason: '必须提供合法 UUID' }] },
    );
    return false;
  };

  const requireReason = (request: MockRequest, response: MockResponse) => {
    if (
      isRecord(request.body) &&
      typeof request.body.reason === 'string' &&
      request.body.reason.trim().length > 0
    ) {
      return true;
    }
    sendProblem(response, 422, 'VALIDATION_ERROR', 'reason 为必填项', {
      errors: [{ field: 'reason', reason: '请输入变更原因' }],
    });
    return false;
  };

  const requireWrite = (request: MockRequest, response: MockResponse) =>
    requireAuthorization(request, response) &&
    requireIdempotencyKey(request, response) &&
    requireReason(request, response);

  const requireIfMatch = (
    request: MockRequest,
    response: MockResponse,
    account: AccountSummary & { version: number },
  ) => {
    if (headerValue(request, 'If-Match') === `"v${account.version}"`) {
      return true;
    }
    sendProblem(response, 409, 'VERSION_CONFLICT', '账号已被并发修改');
    return false;
  };

  const findAccount = (request: MockRequest, response: MockResponse) => {
    const account = accounts.find(({ id }) => id === request.params?.id);
    if (account !== undefined) {
      return account;
    }
    sendProblem(response, 404, 'ACCOUNT_NOT_FOUND', '账号不存在');
    return undefined;
  };

  const credentialReceipt = (
    account: AccountSummary,
    kind: 'create' | 'reset',
  ) => ({
    account: toContractAccount(account),
    temporaryPassword: `${kind === 'create' ? 'Temp' : 'Reset'}!${globalThis.crypto.randomUUID()}`,
  });

  return defineMock({
    'GET /api/v1/admin/accounts': (
      request: MockRequest,
      response: MockResponse,
    ) => {
      if (!requireAuthorization(request, response)) {
        return;
      }

      const pageSize = parsePositiveInteger(queryValue(request, 'limit'), 20);
      const offset = Number(queryValue(request, 'cursor') ?? 0);
      const safeOffset =
        Number.isSafeInteger(offset) && offset >= 0 ? offset : 0;
      const nextOffset = safeOffset + pageSize;
      sendJson(response, 200, {
        items: accounts.slice(safeOffset, nextOffset).map(toContractAccount),
        nextCursor: nextOffset < accounts.length ? String(nextOffset) : null,
      });
    },

    'POST /api/v1/admin/accounts': (
      request: MockRequest,
      response: MockResponse,
    ) => {
      if (!requireWrite(request, response)) {
        return;
      }
      const body = request.body as Record<string, unknown>;
      const employeeNo =
        typeof body.employeeNo === 'string'
          ? body.employeeNo.trim().toUpperCase()
          : '';
      const displayName =
        typeof body.displayName === 'string' ? body.displayName.trim() : '';
      const profession =
        typeof body.profession === 'string' && body.profession.trim().length > 0
          ? body.profession.trim()
          : null;
      if (!/^(?:E\d{4}|\d{8})$/.test(employeeNo) || displayName.length === 0) {
        sendProblem(
          response,
          422,
          'VALIDATION_ERROR',
          '员工号必须为 E 加 4 位数字或 8 位数字，且姓名不能为空',
          {
            errors: [
              {
                field: 'employeeNo',
                reason: '必须为 E 加 4 位数字或 8 位数字',
              },
              { field: 'displayName', reason: '不能为空' },
            ],
          },
        );
        return;
      }
      if (accounts.some((account) => account.employeeNo === employeeNo)) {
        sendProblem(
          response,
          409,
          'ACCOUNT_ALREADY_EXISTS',
          `员工号 ${employeeNo} 已存在`,
        );
        return;
      }

      const account: AccountSummary = {
        displayName,
        employeeNo,
        id: `account-${nextAccountId++}`,
        profession,
        status: 'PENDING_INIT',
      };
      const accountRecord = { ...account, version: 1 };
      accounts.push(accountRecord);
      catalog.registerAccount(toContractAccount(accountRecord));
      response.setHeader('ETag', '"v1"');
      sendJson(response, 201, credentialReceipt(accountRecord, 'create'));
    },

    'POST /api/v1/admin/accounts/:id/reset-password': (
      request: MockRequest,
      response: MockResponse,
    ) => {
      if (!requireWrite(request, response)) {
        return;
      }
      const account = findAccount(request, response);
      if (account !== undefined && requireIfMatch(request, response, account)) {
        account.version += 1;
        response.setHeader('ETag', `"v${account.version}"`);
        sendJson(response, 200, credentialReceipt(account, 'reset'));
      }
    },

    'POST /api/v1/admin/accounts/:id/enable': (
      request: MockRequest,
      response: MockResponse,
    ) => {
      if (!requireWrite(request, response)) {
        return;
      }
      const account = findAccount(request, response);
      if (account !== undefined && requireIfMatch(request, response, account)) {
        account.status = 'ENABLED';
        account.version += 1;
        response.setHeader('ETag', `"v${account.version}"`);
        response.status(204).end();
      }
    },

    'POST /api/v1/admin/accounts/:id/disable': (
      request: MockRequest,
      response: MockResponse,
    ) => {
      if (!requireWrite(request, response)) {
        return;
      }
      const account = findAccount(request, response);
      if (account !== undefined && requireIfMatch(request, response, account)) {
        account.status = 'DISABLED';
        account.version += 1;
        response.setHeader('ETag', `"v${account.version}"`);
        response.status(204).end();
      }
    },

    'POST /api/v1/admin/accounts/:id/totp-reset': (
      request: MockRequest,
      response: MockResponse,
    ) => {
      if (!requireWrite(request, response)) {
        return;
      }
      const account = findAccount(request, response);
      if (account !== undefined && requireIfMatch(request, response, account)) {
        account.version += 1;
        response.setHeader('ETag', `"v${account.version}"`);
        response.status(204).end();
      }
    },
  });
};

export default createAdminAccountsMock();
