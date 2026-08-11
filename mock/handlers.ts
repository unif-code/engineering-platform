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
  capabilities: string[];
  employeeId: string;
  name: string;
}

interface NavigationItem {
  meta: Record<string, unknown>;
  name: string;
  order: number;
  routeKey: string;
  sort: number;
}

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value);

const isLoginBody = (body: unknown): body is LoginBody =>
  isRecord(body) &&
  typeof body.employeeNo === 'string' &&
  /^\d{8}$/.test(body.employeeNo) &&
  typeof body.password === 'string' &&
  body.password.length > 0;

export const meHandler = (): Principal => ({
  capabilities: [
    'audit.read',
    'identity.account.manage',
    'organization.manage',
    'authorization.grant.manage',
    'platform.configuration.manage',
    'workspace.manage',
  ],
  employeeId: '00000000',
  name: '平台管理员',
});

export const navigationHandler = (): NavigationItem[] => [
  {
    meta: { section: 'workspace' },
    name: '工作台',
    order: 1,
    routeKey: 'home',
    sort: 10,
  },
  {
    meta: { section: 'workspace' },
    name: '工作区',
    order: 2,
    routeKey: 'workspaces',
    sort: 20,
  },
  {
    meta: { section: 'governance' },
    name: '审计看板',
    order: 3,
    routeKey: 'audit',
    sort: 30,
  },
  {
    meta: { section: 'administration' },
    name: '管理概览',
    order: 4,
    routeKey: 'admin',
    sort: 40,
  },
  {
    meta: { section: 'administration' },
    name: '组织管理',
    order: 5,
    routeKey: 'admin.organization',
    sort: 50,
  },
  {
    meta: { section: 'administration' },
    name: '工作区管理',
    order: 6,
    routeKey: 'admin.workspaces',
    sort: 60,
  },
  {
    meta: { section: 'administration' },
    name: '账号管理',
    order: 7,
    routeKey: 'admin.users',
    sort: 70,
  },
  {
    meta: { section: 'administration' },
    name: 'Grant 管理',
    order: 8,
    routeKey: 'admin.grants',
    sort: 80,
  },
];

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
