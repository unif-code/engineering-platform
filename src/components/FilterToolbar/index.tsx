import type React from 'react';
import { useStyles } from './index.style';

export interface FilterToolbarProps {
  ariaLabel: string;
  filters?: React.ReactNode;
  search?: React.ReactNode;
  summary?: React.ReactNode;
  actions?: React.ReactNode;
}

export function FilterToolbar({
  ariaLabel,
  filters,
  search,
  summary,
  actions,
}: FilterToolbarProps) {
  const { styles } = useStyles();

  return (
    <div aria-label={ariaLabel} className={styles.toolbar} role="toolbar">
      <div className={styles.context}>
        {filters}
        {summary}
      </div>
      <div className={styles.controls}>
        {search}
        {actions}
      </div>
    </div>
  );
}
