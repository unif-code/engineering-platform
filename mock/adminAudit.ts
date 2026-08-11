import { defineMock } from '@umijs/max';

type AuditTargetType =
  | 'ARTIFACT'
  | 'CAPABILITY'
  | 'CONFIGURATION'
  | 'GRANT'
  | 'WORKSPACE';

interface AuditEvent {
  action:
    | 'Capability Activate'
    | 'Artifact Accept'
    | 'Promotion'
    | 'Config Publish';
  actor: string;
  correlationId: string;
  id: string;
  occurredAt: string;
  reason: string | null;
  requestId: string;
  result: 'success' | 'rejected';
  risk: 'low' | 'medium' | 'high';
  summary: string;
  target: string;
  targetId: string;
  targetType: AuditTargetType;
}

interface MockRequest {
  headers: Record<string, string | string[] | undefined>;
  query?: Record<string, string | string[] | undefined>;
}

interface MockResponse {
  json: (body: unknown) => unknown;
  setHeader: (name: string, value: string) => unknown;
  status: (statusCode: number) => MockResponse;
}

export interface AdminAuditMockOptions {
  authorize?: (request: MockRequest) => boolean;
}

const AUDIT_EVENTS = Object.freeze([
  Object.freeze({
    action: 'Config Publish',
    actor: '孙杰',
    correlationId: 'corr-audit-0810-001',
    id: 'AUD-2026-0810-001',
    occurredAt: '2026-08-10T18:40:00+08:00',
    reason: '发布访问治理策略 v8',
    requestId: 'req-audit-0810-001',
    result: 'success',
    risk: 'high',
    summary: '生产策略 access-policy-v8 已发布，版本由 7 提升至 8。',
    target: '生产策略 / access-policy-v8',
    targetId: 'access-policy-v8',
    targetType: 'CONFIGURATION',
  }),
  Object.freeze({
    action: 'Promotion',
    actor: '刘洋',
    correlationId: 'corr-audit-0810-003',
    id: 'AUD-2026-0810-003',
    occurredAt: '2026-08-10T16:30:00+08:00',
    reason: '发布窗口已批准',
    requestId: 'req-audit-0810-003',
    result: 'success',
    risk: 'high',
    summary: '策略服务 release-2026.08 完成生产晋级。',
    target: '策略服务 / release-2026.08',
    targetId: 'release-2026.08',
    targetType: 'WORKSPACE',
  }),
  Object.freeze({
    action: 'Config Publish',
    actor: '周遥',
    correlationId: 'corr-audit-0810-004',
    id: 'AUD-2026-0810-004',
    occurredAt: '2026-08-10T15:20:00+08:00',
    reason: '更新开发环境主题',
    requestId: 'req-audit-0810-004',
    result: 'success',
    risk: 'low',
    summary: '开发策略 theme-v3 已发布。',
    target: '开发策略 / theme-v3',
    targetId: 'theme-v3',
    targetType: 'CONFIGURATION',
  }),
  Object.freeze({
    action: 'Config Publish',
    actor: '方舟',
    correlationId: 'corr-audit-0810-005',
    id: 'AUD-2026-0810-005',
    occurredAt: '2026-08-10T14:10:00+08:00',
    reason: '配置校验未通过',
    requestId: 'req-audit-0810-005',
    result: 'rejected',
    risk: 'high',
    summary: '模型路由 coding-primary 发布被服务端校验拒绝。',
    target: '模型路由 / coding-primary',
    targetId: 'coding-primary',
    targetType: 'CONFIGURATION',
  }),
  Object.freeze({
    action: 'Config Publish',
    actor: '孙杰',
    correlationId: 'corr-audit-0809-002',
    id: 'AUD-2026-0809-002',
    occurredAt: '2026-08-09T17:15:00+08:00',
    reason: '启用新功能开关',
    requestId: 'req-audit-0809-002',
    result: 'success',
    risk: 'high',
    summary: '生产策略 feature-toggle-v7 已发布。',
    target: '生产策略 / feature-toggle-v7',
    targetId: 'feature-toggle-v7',
    targetType: 'CONFIGURATION',
  }),
  Object.freeze({
    action: 'Artifact Accept',
    actor: '郑楠',
    correlationId: 'corr-audit-0808-006',
    id: 'AUD-2026-0808-006',
    occurredAt: '2026-08-08T12:05:00+08:00',
    reason: '验收证据完整',
    requestId: 'req-audit-0808-006',
    result: 'success',
    risk: 'medium',
    summary: '制品 requirement-spec-v12 已验收。',
    target: 'artifact / requirement-spec-v12',
    targetId: 'requirement-spec-v12',
    targetType: 'ARTIFACT',
  }),
  Object.freeze({
    action: 'Capability Activate',
    actor: '李强',
    correlationId: 'corr-audit-0807-007',
    id: 'AUD-2026-0807-007',
    occurredAt: '2026-08-07T11:25:00+08:00',
    reason: '安全前置未满足',
    requestId: 'req-audit-0807-007',
    result: 'rejected',
    risk: 'medium',
    summary: 'sandbox-runtime Capability 激活被拒绝。',
    target: 'capability / sandbox-runtime',
    targetId: 'sandbox-runtime',
    targetType: 'CAPABILITY',
  }),
  Object.freeze({
    action: 'Promotion',
    actor: '王悦',
    correlationId: 'corr-audit-0805-008',
    id: 'AUD-2026-0805-008',
    occurredAt: '2026-08-05T10:10:00+08:00',
    reason: '版本验收通过',
    requestId: 'req-audit-0805-008',
    result: 'success',
    risk: 'low',
    summary: 'product-release Workspace 完成晋级。',
    target: 'workspace / product-release',
    targetId: 'product-release',
    targetType: 'WORKSPACE',
  }),
  Object.freeze({
    action: 'Artifact Accept',
    actor: '陈默',
    correlationId: 'corr-audit-0802-009',
    id: 'AUD-2026-0802-009',
    occurredAt: '2026-08-02T09:35:00+08:00',
    reason: '安全证据核验完成',
    requestId: 'req-audit-0802-009',
    result: 'success',
    risk: 'low',
    summary: '安全证据 security-evidence-v4 已验收。',
    target: 'artifact / security-evidence-v4',
    targetId: 'security-evidence-v4',
    targetType: 'ARTIFACT',
  }),
] as const satisfies readonly AuditEvent[]);

const queryValue = (request: MockRequest, name: string) => {
  const value = request.query?.[name];
  return Array.isArray(value) ? value[0] : value;
};

const timestamp = (value: string | undefined) => {
  if (value === undefined) {
    return undefined;
  }
  const parsed = Date.parse(value);
  return Number.isNaN(parsed) ? undefined : parsed;
};

const encodeCursor = (event: AuditEvent) =>
  encodeURIComponent(JSON.stringify([event.occurredAt, event.id]));

const decodeCursor = (cursor: string) => {
  try {
    const parsed: unknown = JSON.parse(decodeURIComponent(cursor));
    return Array.isArray(parsed) &&
      parsed.length === 2 &&
      parsed.every((value) => typeof value === 'string')
      ? ([parsed[0], parsed[1]] as const)
      : undefined;
  } catch {
    return undefined;
  }
};

export function createAdminAuditMock(options: AdminAuditMockOptions = {}) {
  const authorize = options.authorize ?? (() => true);
  let requestSequence = 0;

  const sendProblem = (
    response: MockResponse,
    status: number,
    title: string,
    detail: string,
  ) => {
    response.status(status);
    response.setHeader('Content-Type', 'application/problem+json');
    response.json({
      detail,
      requestId: `mock-admin-audit-${String(++requestSequence).padStart(4, '0')}`,
      status,
      title,
      type: `https://engineering-platform.example/problems/${title.toLowerCase()}`,
    });
  };

  return defineMock({
    'GET /api/v1/admin/audit-events': (
      request: MockRequest,
      response: MockResponse,
    ) => {
      if (!authorize(request)) {
        sendProblem(response, 403, 'FORBIDDEN', '无审计读取权限');
        return;
      }
      const actor = queryValue(request, 'actor')?.trim().toLocaleLowerCase();
      const targetId = queryValue(request, 'targetId')?.trim();
      const targetType = queryValue(request, 'targetType');
      const from = timestamp(queryValue(request, 'from'));
      const to = timestamp(queryValue(request, 'to'));
      const limitCandidate = Number(queryValue(request, 'limit'));
      const limit =
        Number.isSafeInteger(limitCandidate) && limitCandidate > 0
          ? Math.min(limitCandidate, 100)
          : 20;
      const filtered = AUDIT_EVENTS.filter((event) => {
        const occurredAt = Date.parse(event.occurredAt);
        return (
          (!actor || event.actor.toLocaleLowerCase().includes(actor)) &&
          (!targetId || event.targetId === targetId) &&
          (!targetType || event.targetType === targetType) &&
          (from === undefined || occurredAt >= from) &&
          (to === undefined || occurredAt <= to)
        );
      });
      const cursor = queryValue(request, 'cursor');
      let start = 0;
      if (cursor) {
        const tuple = decodeCursor(cursor);
        start = tuple
          ? filtered.findIndex(
              (event) => event.occurredAt === tuple[0] && event.id === tuple[1],
            ) + 1
          : 0;
        if (!tuple || start === 0) {
          sendProblem(response, 422, 'INVALID_CURSOR', 'cursor 无效或已过期');
          return;
        }
      }
      const items = filtered.slice(start, start + limit);
      const hasMore = start + items.length < filtered.length;
      response.json({
        items: items.map((event) => ({ ...event })),
        nextCursor:
          hasMore && items.length > 0
            ? encodeCursor(items[items.length - 1])
            : null,
      });
    },
  });
}

export default createAdminAuditMock();
