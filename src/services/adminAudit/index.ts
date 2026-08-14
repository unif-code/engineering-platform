import { api } from '@/services/generated';
import { requireApiData } from '@/services/transport';
import type { AuditEventsQuery, AuditEventsResponse } from './type';

export async function listAuditEvents(
  query: AuditEventsQuery,
): Promise<AuditEventsResponse> {
  const response = requireApiData(
    await api.GET('/api/v1/admin/audit-events', {
      params: {
        query: {
          actor: query.actor,
          cursor: query.cursor,
          from: query.from,
          limit: query.limit,
          requestId: query.requestId,
          targetId: query.targetId,
          targetType: query.targetType,
          to: query.to,
        },
      },
    }),
  );
  return {
    items: response.items.map((event) => {
      const target = `${event.targetType} / ${event.targetId}`;
      return {
        action: event.action,
        actor: event.actor,
        correlationId: event.correlationId,
        id: event.id,
        occurredAt: event.occurredAt,
        reason: event.reason,
        requestId: event.requestId ?? '—',
        result:
          event.result.toLocaleUpperCase() === 'SUCCESS'
            ? 'success'
            : 'rejected',
        risk: /(?:grant|policy|publish|rollback)/i.test(event.action)
          ? 'high'
          : 'low',
        summary: `${event.action} · ${target}`,
        target,
        targetId: event.targetId,
        targetType: event.targetType,
      };
    }),
    nextCursor: response.nextCursor,
  };
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
