import type { SemanticTone } from '@/types/presentation';

export interface ModelRow {
  id: string;
  name: string;
  deployment: string;
  use: string;
  access: string;
  context: string;
  rateLimit: number;
  status: 'active' | 'inactive';
  capabilityTags: string;
  routeWeight: number;
}

export type ModelStatus = ModelRow['status'];

export interface ModelQueryParams {
  current?: number;
  pageSize?: number;
}

export interface ModelCreateFormValues {
  name: string;
  deployment: string;
  use: string;
  access: string;
  context: string;
  rateLimit: number;
  initialStatus: 'active' | 'evaluation' | 'inactive';
}

export interface ModelEditFormValues {
  rateLimit: number;
  context: string;
  status: 'active' | 'evaluation' | 'inactive';
}

export interface ModelUsageMetric {
  key: string;
  title: string;
  value: string | number;
  description: string;
  tone: SemanticTone;
}

export interface ModelEvaluationRow {
  id: string;
  type: string;
  deployment: string;
  snapshot: string;
  conclusion: string;
  status: 'passed' | 'review';
  evaluatedAt: string;
}

export interface ModelEvaluationJob {
  key: string;
  name: string;
  version: string;
  use: string;
  mode: string;
  latest: string;
}

export type ModelEvaluationQueryParams = Record<string, never>;
