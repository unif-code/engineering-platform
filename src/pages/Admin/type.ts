import type { RouteKey } from '@/features/navigation';
import type { SemanticTone } from '@/types/presentation';

export interface AdminMetric {
  title: string;
  value: string | number;
  description: string;
  tone: SemanticTone;
}

export interface AdminEntry {
  routeKey: RouteKey;
  label: string;
  description: string;
  href: string;
}

export interface AdminRisk {
  key: string;
  title: string;
  description: string;
  status: string;
  tone: SemanticTone;
  href: string;
  actionLabel: string;
}

export interface SystemStatus {
  key: string;
  name: string;
  description: string;
  percent: number;
  status: string;
  tone: SemanticTone;
}
