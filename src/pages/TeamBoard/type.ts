import type { DistributionItem } from '@/components/DistributionBar';
import type { MiniBarDatum } from '@/components/MiniBarChart';
import type { SemanticTone } from '@/types/presentation';

export type TeamName = 'Platform' | 'Agent Runtime' | 'Delivery Governance';

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
  role: string;
  load: number;
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
  summary: string;
  metrics: readonly TeamMetric[];
  throughput: readonly MiniBarDatum[];
  distribution: readonly DistributionItem[];
  members: readonly TeamMember[];
  blockers: readonly TeamBlocker[];
}

export interface TeamOption {
  label: TeamName;
  value: TeamName;
}
