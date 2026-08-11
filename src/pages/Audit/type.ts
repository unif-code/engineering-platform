import type {
  AuditAction,
  AuditEvent,
  AuditRisk,
  AuditTargetType,
} from '@/features/administration';

export type AuditRow = AuditEvent;

export type AuditRange = 'all' | 'today' | '7d' | '30d';

export interface AuditQueryParams {
  actor?: string;
  current?: number;
  cursor?: string;
  pageSize?: number;
  range?: AuditRange;
  action?: AuditAction | 'all';
  risk?: AuditRisk | 'all';
  targetType?: AuditTargetType | 'all';
}
