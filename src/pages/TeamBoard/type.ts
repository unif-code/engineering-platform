import type { ChartDatum, SemanticTone } from '@/types/presentation';

export type TeamName = '营销' | '交易' | '中台';

export interface TeamMetric {
  key: string;
  title: string;
  value: string | number;
  description: string;
  tone: SemanticTone;
}

export interface TeamMember {
  key: string;
  name: string;
  activeTasks: number;
  agentParticipation: number;
  overloaded?: boolean;
}

export interface TeamBlocker {
  key: string;
  title: string;
  description: string;
  status: string;
  tone: SemanticTone;
}

export interface TeamBoardFixture {
  name: TeamName;
  metrics: readonly TeamMetric[];
  throughput: readonly ChartDatum[];
  distribution: readonly ChartDatum[];
  members: readonly TeamMember[];
  mergeCycle: readonly ChartDatum[];
  mergeCycleAverage: string;
  blockers: readonly TeamBlocker[];
}

export interface TeamOption {
  label: TeamName;
  value: TeamName;
}
