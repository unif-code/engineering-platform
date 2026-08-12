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
      className={clsx(
        styles.root,
        size === 'small' ? styles.smallRoot : styles.defaultRoot,
        collapsed && styles.collapsed,
        className,
      )}
      role="img"
    >
      <svg
        aria-hidden="true"
        className={clsx(
          styles.mark,
          size === 'small' ? styles.smallMark : styles.defaultMark,
        )}
        focusable="false"
        viewBox="0 0 48 48"
      >
        <path
          d="M16,10 h16 a10,10 0 0 1 10,10 v8 a10,10 0 0 1 -10,10 h-16 a10,10 0 0 1 -10,-10 v-8 a10,10 0 0 1 10,-10 Z M16,20 h16 a4,4 0 0 1 0,8 h-16 a4,4 0 0 1 0,-8 Z M27.8,24 a2.2,2.2 0 1 0 4.4,0 a2.2,2.2 0 1 0 -4.4,0 Z"
          fill="currentColor"
          fillRule="evenodd"
        />
      </svg>
      {collapsed ? null : (
        <span
          aria-hidden="true"
          className={clsx(
            styles.name,
            size === 'small' ? styles.smallName : styles.defaultName,
          )}
        >
          {PLATFORM_NAME}
        </span>
      )}
    </span>
  );
}
