import clsx from 'clsx';
import type { SemanticTone } from '@/types/presentation';
import { useStyles } from './index.style';

export interface DistributionItem {
  key: string;
  label: string;
  value: number;
  tone: SemanticTone;
}

export interface DistributionBarProps {
  ariaLabel: string;
  items: readonly DistributionItem[];
  showLegend?: boolean;
}

export function DistributionBar({
  ariaLabel,
  items,
  showLegend = true,
}: DistributionBarProps) {
  const { styles } = useStyles();
  const total = Math.max(
    1,
    items.reduce((sum, item) => sum + Math.max(0, item.value), 0),
  );

  return (
    <figure aria-label={ariaLabel} className={styles.figure}>
      <fieldset aria-label={`${ariaLabel}比例`} className={styles.bar}>
        {items.map((item) => {
          const value = Math.max(0, item.value);

          return (
            <meter
              aria-label={`${item.label}：${item.value}`}
              className={clsx(styles.segment, styles[item.tone])}
              key={item.key}
              max={total}
              min={0}
              style={{ flexGrow: value }}
              value={value}
            />
          );
        })}
      </fieldset>

      {showLegend ? (
        <ul aria-label={`${ariaLabel}图例`} className={styles.legend}>
          {items.map((item) => (
            <li
              aria-label={`${item.label}：${item.value}`}
              className={styles.legendItem}
              key={item.key}
            >
              <span
                aria-hidden="true"
                className={clsx(styles.marker, styles[item.tone])}
              />
              <span className={styles.legendLabel}>{item.label}</span>
              <strong className={styles.legendValue}>{item.value}</strong>
            </li>
          ))}
        </ul>
      ) : null}
    </figure>
  );
}
