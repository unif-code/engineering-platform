export interface LoginBody {
  employeeNo: string;
  password: string;
}

type LoginHandlerResult =
  | { kind: 'validation' }
  | { employeeNo: string; kind: 'invalidCredentials' }
  | {
      data:
        | { state: 'BOOTSTRAP_REQUIRED' }
        | { challengeToken: string; state: 'TOTP_REQUIRED' };
      employeeNo: string;
      kind: 'success';
    };

interface Principal {
  capabilities: Array<{
    capability: string;
    scopeType: 'PLATFORM';
  }>;
  employeeId: string;
  name: string;
}

interface NavigationItem {
  meta: Record<string, unknown>;
  name: string;
  order: number;
  routeKey: string;
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
  ].map((capability) => ({ capability, scopeType: 'PLATFORM' })),
  employeeId: '00000000',
  name: '平台管理员',
});

export const navigationHandler = (): NavigationItem[] => [
  {
    meta: { section: 'workspace' },
    name: '工作台',
    order: 1,
    routeKey: 'home',
  },
  {
    meta: { section: 'workspace' },
    name: '任务',
    order: 2,
    routeKey: 'tasks',
  },
  {
    meta: { section: 'workspace' },
    name: '工作区',
    order: 3,
    routeKey: 'workspaces',
  },
  {
    meta: { section: 'workspace' },
    name: '归档数据',
    order: 4,
    routeKey: 'tasks.archived',
  },
  {
    meta: { section: 'workspace', unreadCount: 4 },
    name: '消息中心',
    order: 5,
    routeKey: 'messages',
  },
  {
    meta: { section: 'workspace' },
    name: '团队看板',
    order: 6,
    routeKey: 'team-board',
  },
  {
    meta: { section: 'governance' },
    name: '审计看板',
    order: 7,
    routeKey: 'audit',
  },
  {
    meta: { section: 'administration' },
    name: '工作区管理',
    order: 8,
    routeKey: 'admin.workspaces',
  },
  {
    meta: { section: 'administration' },
    name: '组织管理',
    order: 9,
    routeKey: 'admin.organization',
  },
  {
    meta: { section: 'administration' },
    name: '技能管理',
    order: 10,
    routeKey: 'admin.skills',
  },
  {
    meta: { section: 'administration' },
    name: '模型管理',
    order: 11,
    routeKey: 'admin.models',
  },
  {
    meta: { section: 'administration' },
    name: '角色管理',
    order: 12,
    routeKey: 'admin.roles',
  },
  {
    meta: { section: 'administration' },
    name: '用户管理',
    order: 13,
    routeKey: 'admin.users',
  },
  {
    meta: { section: 'administration' },
    name: 'Grant 管理',
    order: 14,
    routeKey: 'admin.grants',
  },
  {
    meta: { section: 'administration' },
    name: 'Policy 发布',
    order: 15,
    routeKey: 'admin.policies',
  },
  {
    meta: { section: 'administration' },
    name: '菜单管理',
    order: 16,
    routeKey: 'admin.menus',
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
        state: 'BOOTSTRAP_REQUIRED',
      },
      employeeNo: body.employeeNo,
      kind: 'success',
    };
  }

  return {
    data: {
      challengeToken: `challenge-${body.employeeNo}`,
      state: 'TOTP_REQUIRED',
    },
    employeeNo: body.employeeNo,
    kind: 'success',
  };
};
