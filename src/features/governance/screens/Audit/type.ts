import type {
  AuditAction,
  AuditEvent,
  AuditRisk,
  AuditTargetType,
} from '@/features/administration';

export interface AuditRow extends AuditEvent {
  sourceIp: string;
}

export type AuditRange = 'all' | 'today' | '7d' | '30d';

export interface AuditQueryParams {
  actor?: string;
  current?: number;
  cursor?: string;
  keyword?: string;
  pageSize?: number;
  range?: AuditRange;
  action?: AuditAction | 'all';
  risk?: AuditRisk | 'all';
  targetType?: AuditTargetType | 'all';
}
