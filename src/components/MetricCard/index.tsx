import { StatisticCard } from '@ant-design/pro-components';
import { theme } from 'antd';
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
  const { token } = theme.useToken();
  const toneColor: Record<SemanticTone, string> = {
    brand: token.colorPrimary,
    danger: token.colorError,
    info: token.colorInfo,
    neutral: token.colorText,
    purple: token.purple6,
    success: token.colorSuccess,
    warning: token.colorWarning,
  };

  return (
    <StatisticCard
      className={styles.card}
      extra={extra}
      statistic={{
        description,
        styles: { content: { color: toneColor[tone] } },
        title,
        value,
      }}
    />
  );
}
