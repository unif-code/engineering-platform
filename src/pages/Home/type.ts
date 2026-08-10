import type { SemanticTone } from '@/types/presentation';

export interface WorkbenchMetric {
  title: string;
  value: string | number;
  description: string;
}

export interface WorkbenchListItem {
  key: string;
  code?: string;
  title: string;
  description: string;
  status: string;
  tone: SemanticTone;
  href: string;
  actionLabel: string;
}
