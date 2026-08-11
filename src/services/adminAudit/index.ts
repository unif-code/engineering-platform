import { request } from '@umijs/max';
import { normalizeApiError } from '@/services/transport';
import type { AuditEventsQuery, AuditEventsResponse } from './type';

export async function listAuditEvents(
  query: AuditEventsQuery,
): Promise<AuditEventsResponse> {
  try {
    return await request<AuditEventsResponse>('/api/v1/admin/audit-events', {
      method: 'GET',
      params: query,
    });
  } catch (error) {
    throw normalizeApiError(error);
  }
}

export type {
  AuditAction,
  AuditEvent,
  AuditEventsQuery,
  AuditEventsResponse,
  AuditResult,
  AuditRisk,
  AuditTargetType,
} from './type';
