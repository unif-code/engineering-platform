import type { ApiSuccessEnvelope } from '../src/types/api';

export interface LoginBody {
  employeeNo: string;
  password: string;
}

type LoginHandlerResult =
  | { kind: 'validation' }
  | { employeeNo: string; kind: 'invalidCredentials' }
  | {
      data:
        | { bootstrapToken: string; stage: 'BOOTSTRAP' }
        | { challengeToken: string; stage: 'TOTP' };
      employeeNo: string;
      kind: 'success';
    };

interface Principal {
  employeeId: string;
  name: string;
}

interface NavigationItem {
  routeKey: string;
  name: string;
  order: number;
}

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value);

const isLoginBody = (body: unknown): body is LoginBody =>
  isRecord(body) &&
  typeof body.employeeNo === 'string' &&
  /^\d{8}$/.test(body.employeeNo) &&
  typeof body.password === 'string' &&
  body.password.length > 0;

export const meHandler = (): ApiSuccessEnvelope<Principal> => ({
  code: 200,
  data: { employeeId: '00000000', name: 'V0.1 Stub' },
  message: 'ok',
});

export const navigationHandler = (): ApiSuccessEnvelope<NavigationItem[]> => ({
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

export const loginHandler = (body: unknown): LoginHandlerResult => {
  if (!isLoginBody(body)) {
    return { kind: 'validation' };
  }

  const expectedPassword =
    body.employeeNo === '00000009'
      ? 'Temporary-Password!2026'
      : 'Valid-Password!2026';

  if (body.password !== expectedPassword) {
    return { employeeNo: body.employeeNo, kind: 'invalidCredentials' };
  }

  if (body.employeeNo === '00000009') {
    return {
      data: {
        bootstrapToken: 'bootstrap-00000009',
        stage: 'BOOTSTRAP',
      },
      employeeNo: body.employeeNo,
      kind: 'success',
    };
  }

  return {
    data: {
      challengeToken: `challenge-${body.employeeNo}`,
      stage: 'TOTP',
    },
    employeeNo: body.employeeNo,
    kind: 'success',
  };
};
