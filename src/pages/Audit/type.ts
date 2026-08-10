export interface AuditRow {
  id: string;
  occurredAt: string;
  actor: string;
  action:
    | 'Capability Activate'
    | 'Artifact Accept'
    | 'Promotion'
    | 'Config Publish';
  target: string;
  risk: 'low' | 'medium' | 'high';
  correlationId: string;
  result: 'success' | 'rejected';
}

export type AuditRange = 'all' | 'today' | '7d' | '30d';

export interface AuditQueryParams {
  current?: number;
  pageSize?: number;
  range?: AuditRange;
  action?: AuditRow['action'] | 'all';
  risk?: AuditRow['risk'] | 'all';
  keyword?: string;
}
