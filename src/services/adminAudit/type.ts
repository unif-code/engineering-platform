export type AuditAction = string;
export type AuditRisk = 'low' | 'medium' | 'high';
export type AuditResult = 'success' | 'rejected';
export type AuditTargetType = string;

/** 页面展示模型；所有事实字段来自 generated AuditEventResponseDto。 */
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
  requestId?: string;
  targetId?: string;
  targetType?: AuditTargetType;
  to?: string;
}

export interface AuditEventsResponse {
  items: AuditEvent[];
  nextCursor: string | null;
}
