import { beforeEach, describe, expect, it } from 'vitest';
import { mutationHeaders } from '@/services/transport';
import { createAdminAccountsMock } from '../../../mock/adminAccounts';

interface MockRequest {
  body?: unknown;
  headers: Record<string, string>;
  params: Record<string, string>;
  query: Record<string, string>;
}

interface MockResponse {
  body?: unknown;
  ended: boolean;
  headers: Headers;
  statusCode: number;
  end: () => MockResponse;
  json: (body: unknown) => MockResponse;
  setHeader: (name: string, value: string) => MockResponse;
  status: (statusCode: number) => MockResponse;
}

type MockRouteHandler = (
  request: MockRequest,
  response: MockResponse,
) => Promise<void> | void;

type MockRoutes = Record<string, unknown>;

async function invokeRoute(
  routes: MockRoutes,
  route: string,
  request: Partial<MockRequest> = {},
) {
  const handler = routes[route];
  if (typeof handler !== 'function') {
    throw new Error(`Missing admin account mock route: ${route}`);
  }

  const response: MockResponse = {
    ended: false,
    headers: new Headers(),
    statusCode: 200,
    end() {
      this.ended = true;
      return this;
    },
    json(body) {
      this.body = body;
      return this;
    },
    setHeader(name, value) {
      this.headers.set(name, value);
      return this;
    },
    status(statusCode) {
      this.statusCode = statusCode;
      return this;
    },
  };

  await (handler as MockRouteHandler)(
    {
      body: request.body,
      headers: request.headers ?? {},
      params: request.params ?? {},
      query: request.query ?? {},
    },
    response,
  );
  return response;
}

const writeRequest = (body: unknown, ifMatch?: string) => ({
  body,
  headers: {
    ...mutationHeaders(),
    ...(ifMatch === undefined ? {} : { 'If-Match': ifMatch }),
  },
});

function expectProblem(response: MockResponse, status: number, detail: string) {
  expect(response.statusCode).toBe(status);
  expect(response.headers.get('content-type')).toBe('application/problem+json');
  expect(response.body).toMatchObject({
    detail,
    requestId: expect.any(String),
    status,
  });
}

describe('admin accounts mock-only contract', () => {
  let routes: ReturnType<typeof createAdminAccountsMock>;

  beforeEach(() => {
    routes = createAdminAccountsMock();
  });

  it('使用 V0.2 cursor/limit 分页并返回 AccountSummary etag', async () => {
    const response = await invokeRoute(routes, 'GET /api/v1/admin/accounts', {
      query: { cursor: '3', limit: '1' },
    });

    expect(response.statusCode).toBe(200);
    expect(response.body).toEqual({
      items: [
        expect.objectContaining({
          employeeNo: 'E1004',
          etag: '"v1"',
          profession: '研发',
          status: 'ENABLED',
        }),
      ],
      nextCursor: '4',
    });
  });

  it('创建账号仅在响应中返回临时密码，并进入后续列表', async () => {
    const created = await invokeRoute(
      routes,
      'POST /api/v1/admin/accounts',
      writeRequest({
        displayName: '临时用户',
        employeeNo: '10000009',
        profession: '测试',
        reason: '项目入职',
      }),
    );

    expect(created.statusCode).toBe(201);
    expect(created.body).toEqual({
      account: {
        displayName: '临时用户',
        employeeNo: '10000009',
        etag: '"v1"',
        id: expect.any(String),
        profession: '测试',
        status: 'PENDING_INIT',
      },
      temporaryPassword: expect.any(String),
    });

    const listed = await invokeRoute(routes, 'GET /api/v1/admin/accounts', {
      query: { limit: '100' },
    });
    expect(listed.body).toEqual({
      items: expect.arrayContaining([
        expect.objectContaining({
          displayName: '临时用户',
          employeeNo: '10000009',
          etag: '"v1"',
          id: expect.any(String),
          profession: '测试',
          status: 'PENDING_INIT',
        }),
      ]),
      nextCursor: null,
    });
    expect(JSON.stringify(listed.body)).not.toContain('temporaryPassword');
  });

  it('重复 employeeNo 返回 409 Problem 原文', async () => {
    const response = await invokeRoute(
      routes,
      'POST /api/v1/admin/accounts',
      writeRequest({
        displayName: '重复用户',
        employeeNo: 'E1001',
        reason: '重复测试',
      }),
    );

    expectProblem(response, 409, '员工号 E1001 已存在');
  });

  it('写请求缺少 Idempotency-Key 或 reason 时返回 422 Problem', async () => {
    const missingKey = await invokeRoute(
      routes,
      'POST /api/v1/admin/accounts',
      {
        body: {
          displayName: '临时用户',
          employeeNo: '10000009',
          reason: '项目入职',
        },
      },
    );
    expectProblem(
      missingKey,
      422,
      'Idempotency-Key 缺失或格式错误，必须为 UUID',
    );

    const missingReason = await invokeRoute(
      routes,
      'POST /api/v1/admin/accounts/:id/disable',
      {
        ...writeRequest({ reason: '   ' }),
        params: { id: 'account-1' },
      },
    );
    expectProblem(missingReason, 422, 'reason 为必填项');
  });

  it('启用、停用和 TOTP 重置返回 204，状态变化可由列表观察', async () => {
    const disabled = await invokeRoute(
      routes,
      'POST /api/v1/admin/accounts/:id/disable',
      {
        ...writeRequest({ reason: '离职停用' }, '"v1"'),
        params: { id: 'account-1' },
      },
    );
    expect(disabled.statusCode).toBe(204);
    expect(disabled.ended).toBe(true);

    const listed = await invokeRoute(routes, 'GET /api/v1/admin/accounts', {
      query: { limit: '100' },
    });
    const disabledAccount = (
      listed.body as { items: Array<{ id: string; status: string }> }
    ).items.find(({ id }) => id === 'account-1');
    expect(disabledAccount).toMatchObject({ status: 'DISABLED' });

    for (const [route, etag] of [
      ['POST /api/v1/admin/accounts/:id/enable', '"v2"'],
      ['POST /api/v1/admin/accounts/:id/totp-reset', '"v3"'],
    ] as const) {
      const response = await invokeRoute(routes, route, {
        ...writeRequest({ reason: '治理动作确认' }, etag),
        params: { id: 'account-1' },
      });
      expect(response.statusCode).toBe(204);
      expect(response.ended).toBe(true);
    }
  });

  it('每次重置返回不同临时密码，且后续列表不持久化凭据', async () => {
    const firstResponse = await invokeRoute(
      routes,
      'POST /api/v1/admin/accounts/:id/reset-password',
      {
        ...writeRequest({ reason: '用户忘记密码' }, '"v1"'),
        params: { id: 'account-1' },
      },
    );
    const secondResponse = await invokeRoute(
      routes,
      'POST /api/v1/admin/accounts/:id/reset-password',
      {
        ...writeRequest({ reason: '首次凭据未安全送达' }, '"v2"'),
        params: { id: 'account-1' },
      },
    );

    expect(firstResponse.statusCode).toBe(200);
    expect(firstResponse.body).toEqual({
      account: expect.objectContaining({ id: 'account-1' }),
      temporaryPassword: expect.any(String),
    });
    expect(secondResponse.statusCode).toBe(200);
    expect(secondResponse.body).toEqual({
      account: expect.objectContaining({ id: 'account-1' }),
      temporaryPassword: expect.any(String),
    });
    expect(
      (secondResponse.body as { temporaryPassword: string }).temporaryPassword,
    ).not.toBe(
      (firstResponse.body as { temporaryPassword: string }).temporaryPassword,
    );

    const listed = await invokeRoute(routes, 'GET /api/v1/admin/accounts', {
      query: { limit: '100' },
    });
    expect((listed.body as { items: Array<{ id: string }> }).items).toEqual(
      expect.arrayContaining([expect.objectContaining({ id: 'account-1' })]),
    );
    expect(JSON.stringify(listed.body)).not.toContain('temporaryPassword');
  });

  it('通过 handler factory 授权选项稳定产生 403，而不依赖 magic 输入', async () => {
    const forbiddenRoutes = createAdminAccountsMock({
      authorize: () => false,
    });
    const response = await invokeRoute(
      forbiddenRoutes,
      'POST /api/v1/admin/accounts',
      writeRequest({
        displayName: '无权创建',
        employeeNo: '10000009',
        reason: '测试拒绝分支',
      }),
    );

    expectProblem(response, 403, '无账号治理权限');
  });

  it('不同 handler factory 实例的账号状态完全隔离', async () => {
    await invokeRoute(routes, 'POST /api/v1/admin/accounts/:id/disable', {
      ...writeRequest({ reason: '只修改当前实例' }, '"v1"'),
      params: { id: 'account-1' },
    });

    const isolated = createAdminAccountsMock();
    const listed = await invokeRoute(isolated, 'GET /api/v1/admin/accounts', {
      query: { limit: '100' },
    });
    const account = (
      listed.body as { items: Array<{ id: string; status: string }> }
    ).items.find(({ id }) => id === 'account-1');
    expect(account).toMatchObject({ status: 'ENABLED' });
  });
});
