import type { SemanticTone } from '@/types/presentation';

export interface ModelRow {
  id: string;
  name: string;
  provider: string;
  contextWindow: number;
  status: 'active' | 'evaluation' | 'disabled';
  purpose: string;
  updatedAt: string;
}

export type ModelStatus = ModelRow['status'];

export interface ModelQueryParams {
  current?: number;
  pageSize?: number;
  keyword?: string;
  status?: ModelStatus | 'all';
}

export interface ModelFormValues {
  name: string;
  provider: string;
  contextWindow: number;
  status: ModelStatus;
  purpose: string;
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
  modelName: string;
  benchmark: string;
  score: number;
  status: 'passed' | 'review';
  evaluatedAt: string;
}
