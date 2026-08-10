import { Tag } from 'antd';
import clsx from 'clsx';
import type React from 'react';
import type { SemanticTone } from '@/types/presentation';
import { useStyles } from './index.style';

export interface SemanticTagProps {
  label: string;
  tone: SemanticTone;
  icon?: React.ReactNode;
  monospace?: boolean;
}

export function SemanticTag({
  label,
  tone,
  icon,
  monospace = false,
}: SemanticTagProps) {
  const { styles } = useStyles();

  return (
    <Tag
      className={clsx(styles.tag, styles[tone], monospace && styles.monospace)}
      icon={icon}
      variant="outlined"
    >
      {label}
    </Tag>
  );
}
