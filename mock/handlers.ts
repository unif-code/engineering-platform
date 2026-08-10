import type {
  ApiEnvelope,
  ApiSuccessEnvelope,
} from '../src/types/api';

export interface LoginBody {
  employeeId: string;
  password: string;
  totp: string;
}

interface Principal {
  employeeId: string;
  name: string;
}

interface NavigationItem {
  routeKey: string;
  name: string;
  order: number;
}

interface LoginResult {
  ok: true;
}

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value);

const isLoginBody = (body: unknown): body is LoginBody =>
  isRecord(body) &&
  typeof body.employeeId === 'string' &&
  typeof body.password === 'string' &&
  typeof body.totp === 'string';

const validationFailure = (): ApiEnvelope<LoginResult> => ({
  code: 422,
  data: null,
  message: 'Validation failed',
});

export const meHandler = (): ApiSuccessEnvelope<Principal> => ({
  code: 200,
  data: { employeeId: '00000000', name: 'V0.1 Stub' },
  message: 'ok',
});

export const navigationHandler = (): ApiSuccessEnvelope<NavigationItem[]> => ({
  code: 200,
  data: [
    { routeKey: 'home', name: '首页', order: 1 },
    { routeKey: 'admin', name: '管理后台', order: 2 },
  ],
  message: 'ok',
});

export const loginHandler = (body: unknown): ApiEnvelope<LoginResult> => {
  if (!isLoginBody(body)) {
    return validationFailure();
  }

  const valid =
    /^\d{8}$/.test(body.employeeId) &&
    body.password.length >= 1 &&
    /^\d{6}$/.test(body.totp);

  if (!valid) {
    return validationFailure();
  }

  return { code: 200, data: { ok: true }, message: 'ok' };
};
