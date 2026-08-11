import clsx from 'clsx';
import { PLATFORM_NAME } from '@/constants/brand';
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
      aria-label={PLATFORM_NAME}
      className={clsx(styles.root, collapsed && styles.collapsed, className)}
      role="img"
    >
      <span
        aria-hidden="true"
        className={clsx(
          styles.mark,
          size === 'small' ? styles.smallMark : styles.defaultMark,
        )}
      />
      {collapsed ? null : (
        <span aria-hidden="true" className={styles.name}>
          {PLATFORM_NAME}
        </span>
      )}
    </span>
  );
}
