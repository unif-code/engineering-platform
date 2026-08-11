import { defineMock } from '@umijs/max';

const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

type WorkspaceStatus = 'ACTIVE' | 'ARCHIVED';

interface AccountRef {
  displayName: string;
  employeeNo: string;
  id: string;
}

interface WorkspaceRecord {
  id: string;
  invitedLeaders: AccountRef[];
  name: string;
  owner: AccountRef;
  status: WorkspaceStatus;
  version: number;
}

interface MockRequest {
  body?: unknown;
  headers: Record<string, string | string[] | undefined>;
  params?: Record<string, string | undefined>;
  query?: Record<string, string | string[] | undefined>;
}

interface MockResponse {
  end: () => unknown;
  json: (body: unknown) => unknown;
  setHeader: (name: string, value: string) => unknown;
  status: (statusCode: number) => MockResponse;
}

export interface AdminWorkspacesMockOptions {
  authorize?: (request: MockRequest) => boolean;
}

const LEADERS = {
  fang: { displayName: '方舟', employeeNo: '10002000', id: 'leader-fang' },
  shen: { displayName: '沈一', employeeNo: '10002001', id: 'leader-shen' },
  zhao: { displayName: '赵晨', employeeNo: '10002002', id: 'leader-zhao' },
} as const satisfies Record<string, AccountRef>;

const DIRECT_REPORTS: Record<string, readonly AccountRef[]> = {
  'leader-fang': [
    { displayName: '林一', employeeNo: '10003000', id: 'member-lin' },
  ],
  'leader-shen': [
    { displayName: '韩梅', employeeNo: '10003001', id: 'member-han' },
  ],
  'leader-zhao': [
    { displayName: '吴桐', employeeNo: '10003002', id: 'member-wu' },
  ],
};

const INITIAL_WORKSPACES = Object.freeze([
  Object.freeze({
    id: 'workspace-platform-core',
    invitedLeaders: Object.freeze([LEADERS.shen]),
    name: 'Platform Core',
    owner: LEADERS.fang,
    status: 'ACTIVE',
    version: 1,
  }),
  Object.freeze({
    id: 'workspace-agent-runtime',
    invitedLeaders: Object.freeze([]),
    name: 'Agent Runtime',
    owner: LEADERS.zhao,
    status: 'ACTIVE',
    version: 1,
  }),
  Object.freeze({
    id: 'workspace-delivery-governance',
    invitedLeaders: Object.freeze([]),
    name: 'Delivery Governance',
    owner: LEADERS.shen,
    status: 'ARCHIVED',
    version: 3,
  }),
] as const);

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value);

const headerValue = (request: MockRequest, name: string) => {
  const entry = Object.entries(request.headers).find(
    ([headerName]) => headerName.toLowerCase() === name.toLowerCase(),
  );
  return Array.isArray(entry?.[1]) ? entry[1][0] : entry?.[1];
};

const queryValue = (request: MockRequest, name: string) => {
  const value = request.query?.[name];
  return Array.isArray(value) ? value[0] : value;
};

const positiveInteger = (value: string | undefined, fallback: number) => {
  const parsed = Number(value);
  return Number.isSafeInteger(parsed) && parsed > 0 ? parsed : fallback;
};

export function createAdminWorkspacesMock(
  options: AdminWorkspacesMockOptions = {},
) {
  const authorize = options.authorize ?? (() => true);
  const workspaces: WorkspaceRecord[] = INITIAL_WORKSPACES.map((workspace) => ({
    ...workspace,
    invitedLeaders: workspace.invitedLeaders.map((leader) => ({ ...leader })),
    owner: { ...workspace.owner },
  }));
  let nextWorkspaceId = 1;
  let requestSequence = 0;

  const sendProblem = (
    response: MockResponse,
    status: number,
    title: string,
    detail: string,
    extensions: Record<string, unknown> = {},
  ) => {
    response.status(status);
    response.setHeader('Content-Type', 'application/problem+json');
    response.json({
      detail,
      requestId: `mock-admin-workspace-${String(++requestSequence).padStart(4, '0')}`,
      status,
      title,
      type: `https://engineering-platform.example/problems/${title.toLowerCase()}`,
      ...extensions,
    });
  };

  const requireAuthorization = (
    request: MockRequest,
    response: MockResponse,
  ) => {
    if (authorize(request)) {
      return true;
    }
    sendProblem(response, 403, 'FORBIDDEN', '无 Workspace 治理权限');
    return false;
  };

  const requireWrite = (request: MockRequest, response: MockResponse) => {
    if (!requireAuthorization(request, response)) {
      return false;
    }
    const key = headerValue(request, 'Idempotency-Key');
    if (typeof key !== 'string' || !UUID_PATTERN.test(key)) {
      sendProblem(
        response,
        422,
        'VALIDATION_ERROR',
        'Idempotency-Key 缺失或格式错误，必须为 UUID',
      );
      return false;
    }
    if (
      !isRecord(request.body) ||
      typeof request.body.reason !== 'string' ||
      request.body.reason.trim().length === 0
    ) {
      sendProblem(response, 422, 'VALIDATION_ERROR', 'reason 为必填项', {
        errors: [{ field: 'reason', reason: '请输入操作原因' }],
      });
      return false;
    }
    return true;
  };

  const findWorkspace = (request: MockRequest, response: MockResponse) => {
    const workspace = workspaces.find(
      ({ id }) => id === request.params?.workspaceId,
    );
    if (workspace === undefined) {
      sendProblem(response, 404, 'WORKSPACE_NOT_FOUND', '工作区不存在');
    }
    return workspace;
  };

  const formalLeaders = (workspace: WorkspaceRecord) => [
    workspace.owner,
    ...workspace.invitedLeaders.filter(
      ({ id }) => id !== workspace.owner.id,
    ),
  ];

  const memberProjection = (workspace: WorkspaceRecord) => {
    const members = new Map<
      string,
      AccountRef & { accountId: string; source: 'OWNER' | 'LEADER' | 'DIRECT_REPORT' }
    >();
    for (const leader of formalLeaders(workspace)) {
      members.set(leader.id, {
        ...leader,
        accountId: leader.id,
        source: leader.id === workspace.owner.id ? 'OWNER' : 'LEADER',
      });
      for (const member of DIRECT_REPORTS[leader.id] ?? []) {
        if (!members.has(member.id)) {
          members.set(member.id, {
            ...member,
            accountId: member.id,
            source: 'DIRECT_REPORT',
          });
        }
      }
    }
    return [...members.values()].map(({ id: _id, ...member }) => member);
  };

  const summary = (workspace: WorkspaceRecord) => ({
    id: workspace.id,
    leaders: formalLeaders(workspace).map((leader) => ({ ...leader })),
    memberCount: memberProjection(workspace).length,
    name: workspace.name,
    owner: { ...workspace.owner },
    status: workspace.status,
    version: workspace.version,
  });

  return defineMock({
    'GET /api/v1/admin/workspaces': (
      request: MockRequest,
      response: MockResponse,
    ) => {
      if (!requireAuthorization(request, response)) {
        return;
      }
      const keyword = queryValue(request, 'keyword')
        ?.trim()
        .toLocaleLowerCase();
      const status = queryValue(request, 'status');
      const filtered = workspaces.filter((workspace) => {
        const matchesKeyword =
          !keyword ||
          [workspace.id, workspace.name, workspace.owner.displayName].some(
            (value) => value.toLocaleLowerCase().includes(keyword),
          );
        const matchesStatus =
          status !== 'ACTIVE' && status !== 'ARCHIVED'
            ? true
            : workspace.status === status;
        return matchesKeyword && matchesStatus;
      });
      const page = positiveInteger(queryValue(request, 'page'), 1);
      const pageSize = positiveInteger(queryValue(request, 'pageSize'), 10);
      const offset = (page - 1) * pageSize;
      response.json({
        items: filtered.slice(offset, offset + pageSize).map(summary),
        total: filtered.length,
      });
    },
    'POST /api/v1/admin/workspaces': (
      request: MockRequest,
      response: MockResponse,
    ) => {
      if (!requireWrite(request, response)) {
        return;
      }
      const body = request.body as Record<string, unknown>;
      const name = typeof body.name === 'string' ? body.name.trim() : '';
      const owner = Object.values(LEADERS).find(({ id }) => id === body.ownerId);
      if (name.length === 0 || owner === undefined) {
        sendProblem(
          response,
          422,
          'VALIDATION_ERROR',
          '工作区名称与有效 Leader Owner 为必填项',
        );
        return;
      }
      if (
        workspaces.some(
          (workspace) =>
            workspace.name.toLocaleLowerCase() === name.toLocaleLowerCase(),
        )
      ) {
        sendProblem(
          response,
          409,
          'WORKSPACE_ALREADY_EXISTS',
          `工作区名称 ${name} 已存在`,
        );
        return;
      }
      const workspace: WorkspaceRecord = {
        id: `workspace-mock-${nextWorkspaceId++}`,
        invitedLeaders: [],
        name,
        owner: { ...owner },
        status: 'ACTIVE',
        version: 1,
      };
      workspaces.push(workspace);
      response.status(201).json(summary(workspace));
    },
    'POST /api/v1/admin/workspaces/:workspaceId/leaders': (
      request: MockRequest,
      response: MockResponse,
    ) => {
      if (!requireWrite(request, response)) {
        return;
      }
      const workspace = findWorkspace(request, response);
      if (workspace === undefined) {
        return;
      }
      const accountId = isRecord(request.body)
        ? request.body.accountId
        : undefined;
      const leader = Object.values(LEADERS).find(({ id }) => id === accountId);
      if (leader === undefined) {
        sendProblem(response, 422, 'VALIDATION_ERROR', '目标账号不是有效 Leader');
        return;
      }
      if (
        workspace.owner.id === leader.id ||
        workspace.invitedLeaders.some(({ id }) => id === leader.id)
      ) {
        sendProblem(response, 409, 'WORKSPACE_CONFLICT', '该 Leader 已在名单中');
        return;
      }
      workspace.invitedLeaders.push({ ...leader });
      workspace.version += 1;
      response.json(summary(workspace));
    },
    'DELETE /api/v1/admin/workspaces/:workspaceId/leaders/:accountId': (
      request: MockRequest,
      response: MockResponse,
    ) => {
      if (!requireWrite(request, response)) {
        return;
      }
      const workspace = findWorkspace(request, response);
      if (workspace === undefined) {
        return;
      }
      const accountId = request.params?.accountId;
      if (accountId === workspace.owner.id) {
        sendProblem(response, 409, 'WORKSPACE_CONFLICT', '请先转让 Owner');
        return;
      }
      const index = workspace.invitedLeaders.findIndex(
        ({ id }) => id === accountId,
      );
      if (index < 0) {
        sendProblem(response, 422, 'VALIDATION_ERROR', '目标账号不在 Leader 名单中');
        return;
      }
      workspace.invitedLeaders.splice(index, 1);
      workspace.version += 1;
      response.json(summary(workspace));
    },
    'POST /api/v1/admin/workspaces/:workspaceId/transfer-owner': (
      request: MockRequest,
      response: MockResponse,
    ) => {
      if (!requireWrite(request, response)) {
        return;
      }
      const workspace = findWorkspace(request, response);
      if (workspace === undefined) {
        return;
      }
      const accountId = isRecord(request.body)
        ? request.body.accountId
        : undefined;
      const leader = workspace.invitedLeaders.find(({ id }) => id === accountId);
      if (leader === undefined) {
        sendProblem(
          response,
          422,
          'VALIDATION_ERROR',
          '新 Owner 必须是已受邀 Leader',
        );
        return;
      }
      if (leader.id === workspace.owner.id) {
        sendProblem(response, 409, 'WORKSPACE_CONFLICT', '该 Leader 已是 Owner');
        return;
      }
      workspace.owner = { ...leader };
      workspace.version += 1;
      response.json(summary(workspace));
    },
    'GET /api/v1/admin/workspaces/:workspaceId/members': (
      request: MockRequest,
      response: MockResponse,
    ) => {
      if (!requireAuthorization(request, response)) {
        return;
      }
      const workspace = findWorkspace(request, response);
      if (workspace !== undefined) {
        response.json({ items: memberProjection(workspace) });
      }
    },
  });
}

export default createAdminWorkspacesMock();
