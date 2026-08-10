import clsx from 'clsx';
import { useStyles } from './index.style';

export interface BrandMarkProps {
  collapsed?: boolean;
  size?: 'small' | 'default';
  className?: string;
}

export function BrandMark({
  collapsed = false,
  size = 'default',
  className,
}: BrandMarkProps) {
  const { styles } = useStyles();

  return (
    <span
      aria-label="内部研发平台"
      className={clsx(styles.root, collapsed && styles.collapsed, className)}
      role="img"
    >
      <span
        aria-hidden="true"
        className={clsx(
          styles.mark,
          size === 'small' ? styles.smallMark : styles.defaultMark,
        )}
      >
        IP
      </span>
      {collapsed ? null : (
        <span aria-hidden="true" className={styles.name}>
          内部研发平台
        </span>
      )}
    </span>
  );
}
