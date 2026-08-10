import clsx from 'clsx';
import type { SemanticTone } from '@/types/presentation';
import { useStyles } from './index.style';

export interface MiniBarDatum {
  key: string;
  label: string;
  value: number;
  valueLabel?: string;
  tone?: SemanticTone;
}

export interface MiniBarChartProps {
  ariaLabel: string;
  data: readonly MiniBarDatum[];
  height?: number;
  highlightKey?: string;
}

const DEFAULT_HEIGHT = 160;

export function MiniBarChart({
  ariaLabel,
  data,
  height = DEFAULT_HEIGHT,
  highlightKey,
}: MiniBarChartProps) {
  const { styles } = useStyles();
  const maximum = Math.max(1, ...data.map((datum) => datum.value));

  return (
    <figure aria-label={ariaLabel} className={styles.figure}>
      <ol
        aria-label={`${ariaLabel}数据`}
        className={styles.chart}
        style={{ height }}
      >
        {data.map((datum) => {
          const displayValue = datum.valueLabel ?? String(datum.value);
          const value = Math.max(0, datum.value);
          const isHighlighted = datum.key === highlightKey;

          return (
            <li className={styles.item} key={datum.key}>
              <div className={styles.valueGroup}>
                {isHighlighted ? (
                  <span className={styles.highlightLabel}>重点</span>
                ) : null}
                <strong className={styles.valueLabel}>{displayValue}</strong>
              </div>
              <meter
                aria-label={`${datum.label}：${displayValue}`}
                aria-valuetext={displayValue}
                className={clsx(
                  styles.bar,
                  styles[datum.tone ?? 'brand'],
                  isHighlighted && styles.highlighted,
                )}
                max={maximum}
                min={0}
                style={{ height: `${(value / maximum) * 100}%` }}
                value={value}
              />
              <span className={styles.label}>{datum.label}</span>
            </li>
          );
        })}
      </ol>
    </figure>
  );
}
