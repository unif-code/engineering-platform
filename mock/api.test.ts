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

const unauthenticatedEnvelope = {
  code: 401,
  data: null,
  message: 'Unauthenticated',
};
const idempotencyHeaders = {
  'idempotency-key': '00000000-0000-4000-8000-000000000001',
};

describe('mock API session assembly', () => {
  it('基础会话与 V0.2 auth mock 不重复注册路由', () => {
    expect(Object.keys(api).filter((route) => route in auth)).toEqual([]);
  });

  it.each([
    'GET /api/v1/me',
    'GET /api/v1/navigation',
  ])('fresh %s 返回完整 401 信封', (route) => {
    const response = runRoute(route);

    expect(response.statusCode).toBe(401);
    expect(response.body).toEqual(unauthenticatedEnvelope);
  });

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
      stage: 'TOTP',
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
  ])('login route 在$caseName时返回 422 Problem 且不建立 session', ({
    body,
  }) => {
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
  });

  it('携带合法 session 后 me 与 navigation 返回现有精确信封', () => {
    const request = {
      headers: { cookie: 'ep_session=mock-session' },
    };

    const meResponse = runRoute('GET /api/v1/me', request);
    expect(meResponse.statusCode).toBe(200);
    expect(meResponse.body).toEqual({
      code: 200,
      data: { employeeId: '00000000', name: 'V0.1 Stub' },
      message: 'ok',
    });

    const navigationResponse = runRoute('GET /api/v1/navigation', request);
    expect(navigationResponse.statusCode).toBe(200);
    expect(navigationResponse.body).toEqual({
      code: 200,
      data: [
        { routeKey: 'home', name: '工作台', order: 1 },
        { routeKey: 'tasks', name: '任务', order: 2 },
        { routeKey: 'workspaces', name: '工作区', order: 3 },
        { routeKey: 'messages', name: '消息中心', order: 4 },
        { routeKey: 'teamBoard', name: '团队看板', order: 5 },
        { routeKey: 'audit', name: '审计看板', order: 6 },
        { routeKey: 'admin', name: '管理概览', order: 7 },
        { routeKey: 'adminWorkspaces', name: '工作区管理', order: 8 },
        { routeKey: 'adminSkills', name: '技能管理', order: 9 },
        { routeKey: 'adminModels', name: '模型管理', order: 10 },
        { routeKey: 'adminRoles', name: '角色管理', order: 11 },
        { routeKey: 'adminUsers', name: '用户管理', order: 12 },
        { routeKey: 'adminMenus', name: '菜单管理', order: 13 },
      ],
      message: 'ok',
    });
  });
});
