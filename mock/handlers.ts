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

export const loginHandler = (body: LoginBody): ApiEnvelope<LoginResult> => {
  const valid =
    /^\d{8}$/.test(body.employeeId) &&
    body.password.length >= 1 &&
    /^\d{6}$/.test(body.totp);

  if (!valid) {
    return { code: 422, data: null, message: 'Validation failed' };
  }

  return { code: 200, data: { ok: true }, message: 'ok' };
};
