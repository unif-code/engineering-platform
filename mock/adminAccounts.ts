import { defineMock } from '@umijs/max';

const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

type AccountStatus = 'PENDING_INIT' | 'ENABLED' | 'DISABLED' | 'RESTRICTED';

interface AccountSummary {
  id: string;
  employeeNo: string;
  displayName: string;
  profession: string | null;
  status: AccountStatus;
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
}

const INITIAL_ACCOUNTS = Object.freeze([
  Object.freeze({
    displayName: '示例用户甲',
    employeeNo: '10000001',
    id: 'account-1',
    profession: '研发',
    status: 'ENABLED',
  }),
  Object.freeze({
    displayName: '示例用户乙',
    employeeNo: '10000002',
    id: 'account-2',
    profession: '测试',
    status: 'ENABLED',
  }),
  Object.freeze({
    displayName: '示例用户丙',
    employeeNo: '10000003',
    id: 'account-3',
    profession: '产品',
    status: 'DISABLED',
  }),
  Object.freeze({
    displayName: '示例用户丁',
    employeeNo: '10000004',
    id: 'account-4',
    profession: '研发',
    status: 'ENABLED',
  }),
  Object.freeze({
    displayName: '示例用户戊',
    employeeNo: '10000005',
    id: 'account-5',
    profession: null,
    status: 'RESTRICTED',
  }),
  Object.freeze({
    displayName: '示例用户己',
    employeeNo: '10000006',
    id: 'account-6',
    profession: '运维',
    status: 'PENDING_INIT',
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

const isAccountStatus = (value: string | undefined): value is AccountStatus =>
  value === 'PENDING_INIT' ||
  value === 'ENABLED' ||
  value === 'DISABLED' ||
  value === 'RESTRICTED';

const isSortField = (
  value: string | undefined,
): value is 'displayName' | 'employeeNo' | 'profession' | 'status' =>
  value === 'displayName' ||
  value === 'employeeNo' ||
  value === 'profession' ||
  value === 'status';

export const createAdminAccountsMock = (
  options: AdminAccountsMockOptions = {},
) => {
  const authorize = options.authorize ?? (() => true);
  const accounts: AccountSummary[] = INITIAL_ACCOUNTS.map((account) => ({
    ...account,
  }));
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
    account: { ...account },
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

      const employeeNo = queryValue(request, 'employeeNo')
        ?.trim()
        .toLocaleLowerCase();
      const displayName = queryValue(request, 'displayName')
        ?.trim()
        .toLocaleLowerCase();
      const profession = queryValue(request, 'profession')
        ?.trim()
        .toLocaleLowerCase();
      const status = queryValue(request, 'status');
      const sortBy = queryValue(request, 'sortBy');
      const sortOrder = queryValue(request, 'sortOrder');
      const page = parsePositiveInteger(queryValue(request, 'page'), 1);
      const pageSize = parsePositiveInteger(
        queryValue(request, 'pageSize'),
        10,
      );

      const filtered = accounts.filter((account) => {
        const matchesEmployeeNo =
          !employeeNo ||
          account.employeeNo.toLocaleLowerCase().includes(employeeNo);
        const matchesDisplayName =
          !displayName ||
          account.displayName.toLocaleLowerCase().includes(displayName);
        const matchesProfession =
          !profession ||
          account.profession?.toLocaleLowerCase().includes(profession) === true;
        const matchesStatus =
          !isAccountStatus(status) || account.status === status;
        return (
          matchesEmployeeNo &&
          matchesDisplayName &&
          matchesProfession &&
          matchesStatus
        );
      });

      const sorted = [...filtered];
      if (isSortField(sortBy)) {
        const direction = sortOrder === 'desc' ? -1 : 1;
        sorted.sort(
          (left, right) =>
            String(left[sortBy] ?? '').localeCompare(
              String(right[sortBy] ?? ''),
              'zh-CN',
              { numeric: true },
            ) * direction,
        );
      }

      const offset = (page - 1) * pageSize;
      sendJson(response, 200, {
        items: sorted.slice(offset, offset + pageSize).map((account) => ({
          ...account,
        })),
        total: sorted.length,
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
        typeof body.employeeNo === 'string' ? body.employeeNo.trim() : '';
      const displayName =
        typeof body.displayName === 'string' ? body.displayName.trim() : '';
      const profession =
        typeof body.profession === 'string' && body.profession.trim().length > 0
          ? body.profession.trim()
          : null;
      if (!/^\d{8}$/.test(employeeNo) || displayName.length === 0) {
        sendProblem(
          response,
          422,
          'VALIDATION_ERROR',
          '员工号必须为 8 位数字，且姓名不能为空',
          {
            errors: [
              { field: 'employeeNo', reason: '必须为 8 位数字' },
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
      accounts.push(account);
      sendJson(response, 201, credentialReceipt(account, 'create'));
    },

    'POST /api/v1/admin/accounts/:id/reset-password': (
      request: MockRequest,
      response: MockResponse,
    ) => {
      if (!requireWrite(request, response)) {
        return;
      }
      const account = findAccount(request, response);
      if (account !== undefined) {
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
      if (account !== undefined) {
        account.status = 'ENABLED';
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
      if (account !== undefined) {
        account.status = 'DISABLED';
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
      if (findAccount(request, response) !== undefined) {
        response.status(204).end();
      }
    },
  });
};

export default createAdminAccountsMock();
