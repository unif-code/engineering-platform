import type { ChartDatum } from '@/types/presentation';

export function formatChartValue(datum: ChartDatum): string | number {
  return datum.valueLabel ?? datum.value;
}
