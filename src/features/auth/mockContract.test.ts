import { beforeEach, describe, expect, it } from 'vitest';
import { mutationHeaders } from '@/services/transport';
import api from '../../../mock/api';
import { createAuthMock } from '../../../mock/auth';

interface MockRequest {
  body?: unknown;
  headers: Record<string, string>;
}

interface MockResponse {
  body?: unknown;
  ended: boolean;
  headers: Headers;
  statusCode: number;
  end: () => MockResponse;
  json: (body: unknown) => MockResponse;
  setHeader: (
    name: string,
    value: string | number | readonly string[],
  ) => MockResponse;
  status: (statusCode: number) => MockResponse;
}

type MockRouteHandler = (
  request: MockRequest,
  response: MockResponse,
) => Promise<void> | void;

type MockRoutes = Record<string, unknown>;
type MockFetchResponse = Response & { rawHeaders: Headers };

function createMockFetch(routes: MockRoutes) {
  return async (
    input: string,
    init: RequestInit = {},
  ): Promise<MockFetchResponse> => {
    const request = new Request(new URL(input, 'http://mock.local'), init);
    const route = `${request.method} ${new URL(request.url).pathname}`;
    const handler = routes[route];

    if (typeof handler !== 'function') {
      throw new Error(`Missing auth mock route: ${route}`);
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

    const body = init.body ? JSON.parse(String(init.body)) : undefined;
    const directHeaders = new Headers(init.headers);
    const requestHeaders = Object.fromEntries(request.headers.entries());
    directHeaders.forEach((value, name) => {
      requestHeaders[name.toLowerCase()] = value;
    });
    await (handler as unknown as MockRouteHandler)(
      { body, headers: requestHeaders },
      response,
    );

    return Object.assign(
      new Response(
        response.statusCode === 204 || response.ended
          ? null
          : JSON.stringify(response.body),
        { headers: response.headers, status: response.statusCode },
      ),
      { rawHeaders: response.headers },
    );
  };
}

const jsonRequest = (
  body: unknown,
  headers: Record<string, string> = mutationHeaders(),
): RequestInit => ({
  body: JSON.stringify(body),
  headers: { 'Content-Type': 'application/json', ...headers },
  method: 'POST',
});

const expectProblem = async (response: Response, status: number) => {
  expect(response.status).toBe(status);
  expect(response.headers.get('content-type')).toBe('application/problem+json');
  const problem = await response.json();
  expect(problem).toMatchObject({
    requestId: expect.any(String),
    status,
  });
  return problem as Record<string, unknown>;
};

const authPostCases = [
  {
    body: { employeeNo: '00000001', password: 'Valid-Password!2026' },
    route: '/api/v1/auth/login',
  },
  {
    body: { challengeToken: 'challenge-00000001', code: '123456' },
    route: '/api/v1/auth/totp',
  },
  { body: {}, route: '/api/v1/auth/logout' },
  {
    body: {
      bootstrapToken: 'bootstrap-00000009',
      password: 'New-Valid-Password!2026',
    },
    route: '/api/v1/auth/bootstrap/password',
  },
  {
    body: { bootstrapToken: 'bootstrap-00000009' },
    route: '/api/v1/auth/bootstrap/totp/enroll',
  },
  {
    body: { bootstrapToken: 'bootstrap-00000009', code: '123456' },
    route: '/api/v1/auth/bootstrap/totp/confirm',
  },
] as const;

describe('auth mock contract', () => {
  let fetchAuth: ReturnType<typeof createMockFetch>;

  beforeEach(() => {
    fetchAuth = createMockFetch(createAuthMock());
  });

  it.each(authPostCases)(
    '$route 缺失 Idempotency-Key 时返回 422 Problem',
    async ({ body, route }) => {
      const response = await fetchAuth(route, jsonRequest(body, {}));

      const problem = await expectProblem(response, 422);
      expect(problem.detail).toContain('Idempotency-Key');
    },
  );

  it.each(authPostCases)(
    '$route 的 Idempotency-Key 非 UUID 时返回 422 Problem',
    async ({ body, route }) => {
      const response = await fetchAuth(
        route,
        jsonRequest(body, { 'Idempotency-Key': 'not-a-uuid' }),
      );

      const problem = await expectProblem(response, 422);
      expect(problem.detail).toContain('Idempotency-Key');
    },
  );

  it('密码步骤为已初始化账号签发 TOTP challenge', async () => {
    const response = await fetchAuth(
      '/api/v1/auth/login',
      jsonRequest({
        employeeNo: '00000001',
        password: 'Valid-Password!2026',
      }),
    );

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({
      challengeToken: 'challenge-00000001',
      stage: 'TOTP',
    });
    expect(response.rawHeaders.get('set-cookie')).toBeNull();
  });

  it('待初始化账号返回 BOOTSTRAP token', async () => {
    const response = await fetchAuth(
      '/api/v1/auth/login',
      jsonRequest({
        employeeNo: '00000009',
        password: 'Temporary-Password!2026',
      }),
    );

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({
      bootstrapToken: 'bootstrap-00000009',
      stage: 'BOOTSTRAP',
    });
  });

  it('密码错误返回 401 Problem Details', async () => {
    const response = await fetchAuth(
      '/api/v1/auth/login',
      jsonRequest({ employeeNo: '00000001', password: 'wrong-password' }),
    );

    const problem = await expectProblem(response, 401);
    expect(problem.detail).toBe('员工号或密码错误');
  });

  it('连续第五次密码错误进入 30 秒退避', async () => {
    const failures: Response[] = [];

    for (let attempt = 0; attempt < 5; attempt += 1) {
      failures.push(
        await fetchAuth(
          '/api/v1/auth/login',
          jsonRequest({ employeeNo: '00000001', password: 'wrong-password' }),
        ),
      );
    }

    expect(failures.slice(0, 4).map(({ status }) => status)).toEqual([
      401, 401, 401, 401,
    ]);
    expect(failures[4]?.headers.get('retry-after')).toBe('30');
    const problem = await expectProblem(failures[4] as Response, 429);
    expect(problem.detail).toContain('30 秒');
  });

  it('每个 mock 实例拥有独立的登录退避计数', async () => {
    for (let attempt = 0; attempt < 5; attempt += 1) {
      await fetchAuth(
        '/api/v1/auth/login',
        jsonRequest({ employeeNo: '00000001', password: 'wrong-password' }),
      );
    }

    const isolatedFetch = createMockFetch(createAuthMock());
    const response = await isolatedFetch(
      '/api/v1/auth/login',
      jsonRequest({ employeeNo: '00000001', password: 'wrong-password' }),
    );

    await expectProblem(response, 401);
  });

  it('同一 mock 实例内的登录退避按 employeeNo 隔离', async () => {
    for (let attempt = 0; attempt < 4; attempt += 1) {
      await fetchAuth(
        '/api/v1/auth/login',
        jsonRequest({ employeeNo: '00000001', password: 'wrong-password' }),
      );
    }

    const anotherAccount = await fetchAuth(
      '/api/v1/auth/login',
      jsonRequest({ employeeNo: '00000002', password: 'wrong-password' }),
    );
    const lockedAccount = await fetchAuth(
      '/api/v1/auth/login',
      jsonRequest({ employeeNo: '00000001', password: 'wrong-password' }),
    );

    await expectProblem(anotherAccount, 401);
    expect(anotherAccount.rawHeaders.get('retry-after')).toBeNull();
    await expectProblem(lockedAccount, 429);
  });

  it('正确 TOTP 建立 HttpOnly Session cookie', async () => {
    const response = await fetchAuth(
      '/api/v1/auth/totp',
      jsonRequest({
        challengeToken: 'challenge-00000001',
        code: '123456',
      }),
    );

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({ ok: true });
    expect(response.rawHeaders.get('set-cookie')).toContain('ep_session=');
    expect(response.rawHeaders.get('set-cookie')).toContain('HttpOnly');
    expect(response.rawHeaders.get('set-cookie')).toContain('Secure');
    expect(response.rawHeaders.get('set-cookie')).toContain('SameSite=Lax');
  });

  it('TOTP 签发的 Session cookie 可直接消费 me 与 navigation', async () => {
    const fetchApi = createMockFetch({ ...api, ...createAuthMock() });
    const totp = await fetchApi(
      '/api/v1/auth/totp',
      jsonRequest({
        challengeToken: 'challenge-00000001',
        code: '123456',
      }),
    );
    const setCookie = totp.rawHeaders.get('set-cookie');
    expect(setCookie).not.toBeNull();
    const cookie = setCookie?.split(';')[0];

    const me = await fetchApi('/api/v1/me', {
      headers: { Cookie: cookie ?? '' },
    });
    const navigation = await fetchApi('/api/v1/navigation', {
      headers: { Cookie: cookie ?? '' },
    });

    expect(me.status).toBe(200);
    expect(navigation.status).toBe(200);
  });

  it('错误 TOTP 返回剩余次数，且第五次使 challenge 失效', async () => {
    const first = await fetchAuth(
      '/api/v1/auth/totp',
      jsonRequest({
        challengeToken: 'challenge-00000001',
        code: '000000',
      }),
    );
    const firstProblem = await expectProblem(first, 401);
    expect(firstProblem.detail).toContain('剩余 4 次');

    let expired: MockFetchResponse | undefined;
    for (let attempt = 1; attempt < 5; attempt += 1) {
      expired = await fetchAuth(
        '/api/v1/auth/totp',
        jsonRequest({
          challengeToken: 'challenge-00000001',
          code: '000000',
        }),
      );
    }

    expect(expired?.rawHeaders.get('retry-after')).toBe('30');
    const expiredProblem = await expectProblem(expired as Response, 401);
    expect(expiredProblem).toMatchObject({ challengeExpired: true });
    expect(expiredProblem.detail).toContain('30 秒');
  });

  it('同一 mock 实例内的 TOTP 次数按 challengeToken 隔离', async () => {
    for (let attempt = 0; attempt < 4; attempt += 1) {
      await fetchAuth(
        '/api/v1/auth/totp',
        jsonRequest({
          challengeToken: 'challenge-00000001',
          code: '000000',
        }),
      );
    }

    const anotherChallenge = await fetchAuth(
      '/api/v1/auth/totp',
      jsonRequest({
        challengeToken: 'challenge-00000002',
        code: '000000',
      }),
    );
    const expiredChallenge = await fetchAuth(
      '/api/v1/auth/totp',
      jsonRequest({
        challengeToken: 'challenge-00000001',
        code: '000000',
      }),
    );

    const anotherProblem = await expectProblem(anotherChallenge, 401);
    expect(anotherProblem.detail).toContain('剩余 4 次');
    expect(anotherProblem.challengeExpired).toBeUndefined();
    const expiredProblem = await expectProblem(expiredChallenge, 401);
    expect(expiredProblem.challengeExpired).toBe(true);
  });

  it('logout 返回 204 并清除 Session cookie', async () => {
    const response = await fetchAuth('/api/v1/auth/logout', jsonRequest({}));

    expect(response.status).toBe(204);
    expect(response.rawHeaders.get('set-cookie')).toContain(
      'ep_session=; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=0',
    );
    await expect(response.text()).resolves.toBe('');
  });

  it('bootstrap password 对弱密码返回字段级 422 Problem', async () => {
    const response = await fetchAuth(
      '/api/v1/auth/bootstrap/password',
      jsonRequest({
        bootstrapToken: 'bootstrap-00000009',
        password: 'weak',
      }),
    );

    const problem = await expectProblem(response, 422);
    expect(problem.errors).toEqual([
      {
        field: 'password',
        reason: '密码需为 15～64 位，并包含大写字母、小写字母和特殊字符',
      },
    ]);
  });

  it('bootstrap password 接受满足 Security Floor 的正式密码', async () => {
    const response = await fetchAuth(
      '/api/v1/auth/bootstrap/password',
      jsonRequest({
        bootstrapToken: 'bootstrap-00000009',
        password: 'New-Valid-Password!2026',
      }),
    );

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({ ok: true });
  });

  it('bootstrap enroll 返回固定 provisioning URI', async () => {
    const response = await fetchAuth(
      '/api/v1/auth/bootstrap/totp/enroll',
      jsonRequest({ bootstrapToken: 'bootstrap-00000009' }),
    );

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({
      provisioningUri:
        'otpauth://totp/EP:00000009?secret=JBSWY3DPEHPK3PXP&issuer=EP',
    });
  });

  it('bootstrap confirm 仅接受固定 TOTP', async () => {
    const invalid = await fetchAuth(
      '/api/v1/auth/bootstrap/totp/confirm',
      jsonRequest({
        bootstrapToken: 'bootstrap-00000009',
        code: '000000',
      }),
    );
    await expectProblem(invalid, 401);

    const valid = await fetchAuth(
      '/api/v1/auth/bootstrap/totp/confirm',
      jsonRequest({
        bootstrapToken: 'bootstrap-00000009',
        code: '123456',
      }),
    );

    expect(valid.status).toBe(200);
    await expect(valid.json()).resolves.toEqual({ ok: true });
  });
});
