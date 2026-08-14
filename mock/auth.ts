import { defineMock } from '@umijs/max';
import { loginHandler } from './handlers';

const PROVISIONING_URI =
  'otpauth://totp/EP:00000009?secret=JBSWY3DPEHPK3PXP&issuer=EP';
const SESSION_COOKIE =
  'ep_session=mock-session; Path=/; HttpOnly; Secure; SameSite=Lax';
const BOOTSTRAP_SESSION_COOKIE =
  'ep_session=bootstrap-00000009; Path=/; HttpOnly; Secure; SameSite=Lax';
const CLEARED_SESSION_COOKIE =
  'ep_session=; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=0';
const VALID_TOTP = '123456';
const MAX_ATTEMPTS = 5;
const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

interface MockRequest {
  body?: unknown;
  headers: Record<string, string | string[] | undefined>;
}

interface MockResponse {
  end: () => unknown;
  json: (body: unknown) => unknown;
  setHeader: (name: string, value: string) => unknown;
  status: (statusCode: number) => MockResponse;
}

interface ProblemDetails extends Record<string, unknown> {
  detail: string;
  requestId: string;
  status: number;
  title: string;
  type: string;
}

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value);

const isStrongPassword = (password: string) =>
  password.length >= 15 &&
  password.length <= 64 &&
  /[A-Z]/.test(password) &&
  /[a-z]/.test(password) &&
  /[^A-Za-z0-9]/.test(password);

const getHeader = (request: MockRequest, name: string) => {
  const entry = Object.entries(request.headers).find(
    ([headerName]) => headerName.toLowerCase() === name.toLowerCase(),
  );
  const value = entry?.[1];
  return Array.isArray(value) ? value[0] : value;
};

const hasBootstrapSession = (request: MockRequest) =>
  getHeader(request, 'cookie')
    ?.split(';')
    .some((cookie) => cookie.trim() === 'ep_session=bootstrap-00000009') ??
  false;

const sendJson = (response: MockResponse, status: number, body: unknown) => {
  response.status(status);
  response.setHeader('Content-Type', 'application/json');
  response.json(body);
};

export const createAuthMock = () => {
  const loginFailures = new Map<string, number>();
  const totpFailures = new Map<string, number>();
  let requestSequence = 0;

  const problem = (
    status: number,
    title: string,
    detail: string,
    extensions: Record<string, unknown> = {},
  ): ProblemDetails => ({
    type: `https://engineering-platform.example/problems/${title.toLowerCase()}`,
    title,
    status,
    detail,
    requestId: `mock-auth-${String(++requestSequence).padStart(4, '0')}`,
    ...extensions,
  });

  const sendProblem = (
    response: MockResponse,
    status: number,
    title: string,
    detail: string,
    extensions: Record<string, unknown> = {},
  ) => {
    response.status(status);
    response.setHeader('Content-Type', 'application/problem+json');
    response.json(problem(status, title, detail, extensions));
  };

  const requireIdempotencyKey = (
    request: MockRequest,
    response: MockResponse,
  ) => {
    const idempotencyKey = getHeader(request, 'Idempotency-Key');
    if (
      typeof idempotencyKey === 'string' &&
      UUID_PATTERN.test(idempotencyKey)
    ) {
      return true;
    }

    sendProblem(
      response,
      422,
      'VALIDATION_ERROR',
      'Idempotency-Key 缺失或格式错误，必须为 UUID',
      {
        errors: [
          {
            field: 'Idempotency-Key',
            reason: '必须提供合法 UUID',
          },
        ],
      },
    );
    return false;
  };

  return defineMock({
    'POST /api/v1/auth/login': (
      request: MockRequest,
      response: MockResponse,
    ) => {
      if (!requireIdempotencyKey(request, response)) {
        return;
      }

      const result = loginHandler(request.body);
      if (result.kind === 'validation') {
        sendProblem(
          response,
          422,
          'VALIDATION_ERROR',
          '员工号必须为 8 位数字，且密码不能为空',
          {
            errors: [
              {
                field: 'credentials',
                reason: 'employeeNo 或 password 格式错误',
              },
            ],
          },
        );
        return;
      }

      if (result.kind === 'invalidCredentials') {
        const failureCount = (loginFailures.get(result.employeeNo) ?? 0) + 1;
        loginFailures.set(result.employeeNo, failureCount);

        if (failureCount >= MAX_ATTEMPTS) {
          response.setHeader('Retry-After', '30');
          sendProblem(
            response,
            429,
            'LOGIN_BACKOFF',
            '登录失败次数过多，请在 30 秒后重试',
          );
          return;
        }

        sendProblem(response, 401, 'INVALID_CREDENTIALS', '员工号或密码错误');
        return;
      }

      loginFailures.delete(result.employeeNo);
      if (result.data.state === 'BOOTSTRAP_REQUIRED') {
        response.setHeader('Set-Cookie', BOOTSTRAP_SESSION_COOKIE);
      }
      sendJson(response, 200, result.data);
    },

    'POST /api/v1/auth/totp': (
      request: MockRequest,
      response: MockResponse,
    ) => {
      if (!requireIdempotencyKey(request, response)) {
        return;
      }

      const { body } = request;
      if (
        !isRecord(body) ||
        typeof body.challengeToken !== 'string' ||
        typeof body.code !== 'string'
      ) {
        sendProblem(
          response,
          422,
          'VALIDATION_ERROR',
          'challengeToken 与 code 不能为空',
        );
        return;
      }

      const challengeValid = /^challenge-\d{8}$/.test(body.challengeToken);
      const failureCount = totpFailures.get(body.challengeToken) ?? 0;
      if (!challengeValid || failureCount >= MAX_ATTEMPTS) {
        response.setHeader('Retry-After', '30');
        sendProblem(
          response,
          401,
          'TOTP_CHALLENGE_EXPIRED',
          'TOTP challenge 已失效，请等待 30 秒后重新登录',
          { challengeExpired: true },
        );
        return;
      }

      if (body.code === VALID_TOTP) {
        totpFailures.delete(body.challengeToken);
        response.setHeader('Set-Cookie', SESSION_COOKIE);
        sendJson(response, 200, { state: 'AUTHENTICATED' });
        return;
      }

      const nextFailureCount = failureCount + 1;
      totpFailures.set(body.challengeToken, nextFailureCount);
      if (nextFailureCount >= MAX_ATTEMPTS) {
        response.setHeader('Retry-After', '30');
        sendProblem(
          response,
          401,
          'TOTP_CHALLENGE_EXPIRED',
          'TOTP 验证失败次数已达上限，请等待 30 秒后重新登录',
          { challengeExpired: true },
        );
        return;
      }

      sendProblem(
        response,
        401,
        'INVALID_TOTP',
        `TOTP 验证码错误，剩余 ${MAX_ATTEMPTS - nextFailureCount} 次`,
      );
    },

    'POST /api/v1/auth/logout': (
      request: MockRequest,
      response: MockResponse,
    ) => {
      if (!requireIdempotencyKey(request, response)) {
        return;
      }

      response.setHeader('Set-Cookie', CLEARED_SESSION_COOKIE);
      sendJson(response, 200, { state: 'LOGGED_OUT' });
    },

    'POST /api/v1/auth/bootstrap/password': (
      request: MockRequest,
      response: MockResponse,
    ) => {
      if (!requireIdempotencyKey(request, response)) {
        return;
      }

      const { body } = request;
      if (!hasBootstrapSession(request)) {
        sendProblem(
          response,
          401,
          'BOOTSTRAP_SESSION_EXPIRED',
          'Bootstrap Session 已失效，请联系管理员重新签发临时密码',
        );
        return;
      }

      if (
        !isRecord(body) ||
        typeof body.password !== 'string' ||
        !isStrongPassword(body.password)
      ) {
        sendProblem(
          response,
          422,
          'VALIDATION_ERROR',
          '正式密码不满足 Security Floor',
          {
            errors: [
              {
                field: 'password',
                reason:
                  '密码需为 15～64 位，并包含大写字母、小写字母和特殊字符',
              },
            ],
          },
        );
        return;
      }

      sendJson(response, 200, { state: 'PASSWORD_SET' });
    },

    'POST /api/v1/auth/bootstrap/totp/enroll': (
      request: MockRequest,
      response: MockResponse,
    ) => {
      if (!requireIdempotencyKey(request, response)) {
        return;
      }

      if (!hasBootstrapSession(request)) {
        sendProblem(
          response,
          401,
          'BOOTSTRAP_SESSION_EXPIRED',
          'Bootstrap Session 已失效，请联系管理员重新签发临时密码',
        );
        return;
      }

      sendJson(response, 200, { provisioningUri: PROVISIONING_URI });
    },

    'POST /api/v1/auth/bootstrap/totp/confirm': (
      request: MockRequest,
      response: MockResponse,
    ) => {
      if (!requireIdempotencyKey(request, response)) {
        return;
      }

      const { body } = request;
      if (!hasBootstrapSession(request)) {
        sendProblem(
          response,
          401,
          'BOOTSTRAP_SESSION_EXPIRED',
          'Bootstrap Session 已失效，请联系管理员重新签发临时密码',
        );
        return;
      }

      if (!isRecord(body) || body.code !== VALID_TOTP) {
        sendProblem(response, 401, 'INVALID_TOTP', 'TOTP 验证码错误');
        return;
      }

      response.setHeader('Set-Cookie', SESSION_COOKIE);
      sendJson(response, 200, { state: 'AUTHENTICATED' });
    },
  });
};

export default createAuthMock();
