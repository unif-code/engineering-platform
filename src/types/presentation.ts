export type SemanticTone =
  | 'neutral'
  | 'brand'
  | 'info'
  | 'success'
  | 'warning'
  | 'danger'
  | 'purple';

export interface ChartDatum {
  key: string;
  label: string;
  value: number;
  valueLabel?: string;
  tone?: SemanticTone;
}
