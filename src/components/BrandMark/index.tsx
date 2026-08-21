import clsx from 'clsx';
import { PLATFORM_NAME } from '@/constants/brand';
import { useStyles } from './index.style';

export interface BrandMarkProps {
  collapsed?: boolean;
  size?: 'small' | 'default';
  className?: string;
  inverse?: boolean;
}

export function BrandMark({
  collapsed = false,
  size = 'default',
  className,
  inverse = false,
}: BrandMarkProps) {
  const { styles } = useStyles();

  return (
    <span
      aria-label={PLATFORM_NAME}
      className={clsx(
        styles.root,
        size === 'small' ? styles.smallRoot : styles.defaultRoot,
        collapsed && styles.collapsed,
        inverse && styles.inverse,
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
          d="M10 7h14c11 0 20 7.6 20 17s-9 17-20 17H10V7Zm9 9v16h5c5.9 0 10.5-3.6 10.5-8S29.9 16 24 16h-5Z"
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
