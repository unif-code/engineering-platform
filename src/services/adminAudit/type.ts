/**
 * V0.2 Task 8 的 mock-only 临时 DTO。
 * 后端仅冻结筛选、cursor 分页与 requestId；api-v0.2.0 锁定后由
 * Task 10 的 generated client 类型整体替换本文件。
 */
export type AuditAction =
  | 'Capability Activate'
  | 'Artifact Accept'
  | 'Promotion'
  | 'Config Publish';
export type AuditRisk = 'low' | 'medium' | 'high';
export type AuditResult = 'success' | 'rejected';
export type AuditTargetType =
  | 'ARTIFACT'
  | 'CAPABILITY'
  | 'CONFIGURATION'
  | 'GRANT'
  | 'WORKSPACE';

export interface AuditEvent {
  action: AuditAction;
  actor: string;
  correlationId: string;
  id: string;
  occurredAt: string;
  reason: string | null;
  requestId: string;
  result: AuditResult;
  risk: AuditRisk;
  summary: string;
  target: string;
  targetId: string;
  targetType: AuditTargetType;
}

export interface AuditEventsQuery {
  actor?: string;
  cursor?: string;
  from?: string;
  limit: number;
  targetId?: string;
  targetType?: AuditTargetType;
  to?: string;
}

export interface AuditEventsResponse {
  items: AuditEvent[];
  nextCursor: string | null;
}
