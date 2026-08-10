import { StatisticCard } from '@ant-design/pro-components';
import clsx from 'clsx';
import type React from 'react';
import type { SemanticTone } from '@/types/presentation';
import { useStyles } from './index.style';

export interface MetricCardProps {
  title: string;
  value: string | number;
  description?: React.ReactNode;
  tone?: SemanticTone;
  extra?: React.ReactNode;
}

export function MetricCard({
  title,
  value,
  description,
  tone = 'neutral',
  extra,
}: MetricCardProps) {
  const { styles } = useStyles();

  return (
    <StatisticCard
      className={clsx(styles.card, styles[tone])}
      extra={extra}
      statistic={{ description, title, value }}
    />
  );
}
