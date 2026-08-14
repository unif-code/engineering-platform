import { describe, expect, it } from 'vitest';
import api from './api';
import auth, { createAuthMock } from './auth';

interface MockRequest {
  body?: unknown;
  headers: Record<string, string | undefined>;
}

interface CookieCall {
  name: string;
  options: Record<string, unknown>;
  value: string;
}

interface MockResponse {
  body?: unknown;
  cookieCall?: CookieCall;
  ended: boolean;
  headers: Headers;
  statusCode: number;
  cookie: (
    name: string,
    value: string,
    options: Record<string, unknown>,
  ) => MockResponse;
  json: (body: unknown) => MockResponse;
  end: () => MockResponse;
  setHeader: (
    name: string,
    value: string | number | readonly string[],
  ) => MockResponse;
  status: (statusCode: number) => MockResponse;
}

type MockRouteHandler = (request: MockRequest, response: MockResponse) => void;

type MockRoutes = Record<string, unknown>;

function getRouteHandler(
  route: string,
  routes: MockRoutes = api,
): MockRouteHandler {
  const handler = routes[route];
  if (typeof handler !== 'function') {
    throw new Error(`Missing mock route handler: ${route}`);
  }
  return handler as unknown as MockRouteHandler;
}

function runRoute(
  route: string,
  request: Partial<MockRequest> = {},
  routes: MockRoutes = api,
): MockResponse {
  const response: MockResponse = {
    ended: false,
    headers: new Headers(),
    statusCode: 200,
    cookie(name, value, options) {
      this.cookieCall = { name, value, options };
      return this;
    },
    json(body) {
      this.body = body;
      return this;
    },
    end() {
      this.ended = true;
      return this;
    },
    setHeader(name, value) {
      this.headers.set(
        name,
        Array.isArray(value) ? value.join(', ') : String(value),
      );
      return this;
    },
    status(statusCode) {
      this.statusCode = statusCode;
      return this;
    },
  };
  getRouteHandler(route, routes)(
    { body: request.body, headers: request.headers ?? {} },
    response,
  );
  return response;
}

const unauthenticatedProblem = {
  detail: '当前 Session 不存在或已失效',
  requestId: 'mock-session-unauthorized',
  status: 401,
  title: 'UNAUTHORIZED',
  type: 'https://engineering-platform.example/problems/unauthorized',
};
const idempotencyHeaders = {
  'idempotency-key': '00000000-0000-4000-8000-000000000001',
};

describe('mock API session assembly', () => {
  it('基础会话与 V0.2 auth mock 不重复注册路由', () => {
    expect(Object.keys(api).filter((route) => route in auth)).toEqual([]);
  });

  it.each(['GET /api/v1/me', 'GET /api/v1/navigation'])(
    'fresh %s 返回 401 Problem Details',
    (route) => {
      const response = runRoute(route);

      expect(response.statusCode).toBe(401);
      expect(response.body).toEqual(unauthenticatedProblem);
      expect(response.headers.get('content-type')).toBe(
        'application/problem+json',
      );
    },
  );

  it('合法登录由 auth mock 签发 TOTP challenge，尚不建立 session', () => {
    const response = runRoute(
      'POST /api/v1/auth/login',
      {
        body: {
          employeeNo: '00000001',
          password: 'Valid-Password!2026',
        },
        headers: idempotencyHeaders,
      },
      createAuthMock(),
    );

    expect(response.statusCode).toBe(200);
    expect(response.body).toEqual({
      challengeToken: 'challenge-00000001',
      state: 'TOTP_REQUIRED',
    });
    expect(response.cookieCall).toBeUndefined();
  });

  it('密码错误返回 Problem 且不建立 session', () => {
    const response = runRoute(
      'POST /api/v1/auth/login',
      {
        body: { employeeNo: '00000001', password: 'wrong-password' },
        headers: idempotencyHeaders,
      },
      createAuthMock(),
    );

    expect(response.statusCode).toBe(401);
    expect(response.body).toMatchObject({
      detail: '员工号或密码错误',
      requestId: expect.any(String),
      status: 401,
    });
    expect(response.headers.get('content-type')).toBe(
      'application/problem+json',
    );
    expect(response.cookieCall).toBeUndefined();
  });

  it.each([
    { caseName: 'body 为 undefined', body: undefined },
    { caseName: 'body 为数组', body: [] },
    {
      caseName: '缺少 password',
      body: { employeeNo: '00000001' },
    },
    {
      caseName: 'password 类型错误',
      body: { employeeNo: '00000001', password: null },
    },
  ])(
    'login route 在$caseName时返回 422 Problem 且不建立 session',
    ({ body }) => {
      const response = runRoute(
        'POST /api/v1/auth/login',
        { body, headers: idempotencyHeaders },
        createAuthMock(),
      );

      expect(response.statusCode).toBe(422);
      expect(response.body).toMatchObject({
        requestId: expect.any(String),
        status: 422,
      });
      expect(response.headers.get('content-type')).toBe(
        'application/problem+json',
      );
      expect(response.cookieCall).toBeUndefined();
    },
  );

  it('携带合法 session 后 me 与 navigation 返回 V0.2 裸投影', () => {
    const request = {
      headers: { cookie: 'ep_session=mock-session' },
    };

    const meResponse = runRoute('GET /api/v1/me', request);
    expect(meResponse.statusCode).toBe(200);
    expect(meResponse.body).toEqual({
      capabilities: [
        { capability: 'audit.read', scopeType: 'PLATFORM' },
        { capability: 'identity.account.manage', scopeType: 'PLATFORM' },
        { capability: 'organization.manage', scopeType: 'PLATFORM' },
        {
          capability: 'authorization.grant.manage',
          scopeType: 'PLATFORM',
        },
        {
          capability: 'platform.configuration.manage',
          scopeType: 'PLATFORM',
        },
        { capability: 'workspace.manage', scopeType: 'PLATFORM' },
      ],
      employeeId: '00000000',
      name: '平台管理员',
    });

    const navigationResponse = runRoute('GET /api/v1/navigation', request);
    expect(navigationResponse.statusCode).toBe(200);
    expect(navigationResponse.body).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ order: 1, routeKey: 'home' }),
        expect.objectContaining({ order: 14, routeKey: 'admin.grants' }),
      ]),
    );
    expect(
      (navigationResponse.body as Array<Record<string, unknown>>).some(
        (item) => 'sort' in item,
      ),
    ).toBe(false);
  });
});
