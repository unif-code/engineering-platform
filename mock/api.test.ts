import { describe, expect, it } from 'vitest';
import api from './api';

interface MockRequest {
  body?: unknown;
  headers: { cookie?: string };
}

interface CookieCall {
  name: string;
  options: Record<string, unknown>;
  value: string;
}

interface MockResponse {
  body?: unknown;
  cookieCall?: CookieCall;
  statusCode: number;
  cookie: (
    name: string,
    value: string,
    options: Record<string, unknown>,
  ) => MockResponse;
  json: (body: unknown) => MockResponse;
  status: (statusCode: number) => MockResponse;
}

type MockRouteHandler = (
  request: MockRequest,
  response: MockResponse,
) => void;

function getRouteHandler(route: string): MockRouteHandler {
  const handler = api[route];
  if (typeof handler !== 'function') {
    throw new Error(`Missing mock route handler: ${route}`);
  }
  return handler as unknown as MockRouteHandler;
}

function runRoute(
  route: string,
  request: Partial<MockRequest> = {},
): MockResponse {
  const response: MockResponse = {
    statusCode: 200,
    cookie(name, value, options) {
      this.cookieCall = { name, value, options };
      return this;
    },
    json(body) {
      this.body = body;
      return this;
    },
    status(statusCode) {
      this.statusCode = statusCode;
      return this;
    },
  };
  getRouteHandler(route)(
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

describe('mock API session assembly', () => {
  it.each(['GET /api/v1/me', 'GET /api/v1/navigation'])(
    'fresh %s 返回完整 401 信封',
    (route) => {
      const response = runRoute(route);

      expect(response.statusCode).toBe(401);
      expect(response.body).toEqual(unauthenticatedEnvelope);
    },
  );

  it('合法登录设置 dev session cookie 并保留成功信封', () => {
    const response = runRoute('POST /api/v1/auth/login', {
      body: {
        employeeId: '00000000',
        password: 'x',
        totp: '123456',
      },
    });

    expect(response.statusCode).toBe(200);
    expect(response.body).toEqual({
      code: 200,
      data: { ok: true },
      message: 'ok',
    });
    expect(response.cookieCall).toEqual({
      name: 'engineering-platform-session',
      value: 'authenticated',
      options: { httpOnly: true, path: '/', sameSite: 'lax' },
    });
  });

  it('非法登录不建立 session', () => {
    const response = runRoute('POST /api/v1/auth/login', {
      body: { employeeId: '123', password: '', totp: '12' },
    });

    expect(response.statusCode).toBe(422);
    expect(response.body).toEqual({
      code: 422,
      data: null,
      message: 'Validation failed',
    });
    expect(response.cookieCall).toBeUndefined();
  });

  it.each([
    { caseName: 'body 为 undefined', body: undefined },
    { caseName: 'body 为数组', body: [] },
    {
      caseName: '缺少 password',
      body: { employeeId: '00000000', totp: '123456' },
    },
    {
      caseName: 'password 类型错误',
      body: { employeeId: '00000000', password: null, totp: '123456' },
    },
  ])('login route 在$caseName时返回精确 422 且不建立 session', ({ body }) => {
    const response = runRoute('POST /api/v1/auth/login', { body });

    expect(response.statusCode).toBe(422);
    expect(response.body).toEqual({
      code: 422,
      data: null,
      message: 'Validation failed',
    });
    expect(response.cookieCall).toBeUndefined();
  });

  it('携带合法 session 后 me 与 navigation 返回现有精确信封', () => {
    const request = {
      headers: { cookie: 'engineering-platform-session=authenticated' },
    };

    const meResponse = runRoute('GET /api/v1/me', request);
    expect(meResponse.statusCode).toBe(200);
    expect(meResponse.body).toEqual({
      code: 200,
      data: { employeeId: '00000000', name: 'V0.1 Stub' },
      message: 'ok',
    });

    const navigationResponse = runRoute(
      'GET /api/v1/navigation',
      request,
    );
    expect(navigationResponse.statusCode).toBe(200);
    expect(navigationResponse.body).toEqual({
      code: 200,
      data: [
        { routeKey: 'home', name: '首页', order: 1 },
        { routeKey: 'admin', name: '管理后台', order: 2 },
      ],
      message: 'ok',
    });
  });
});
