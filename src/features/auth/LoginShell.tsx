import clsx from 'clsx';
import type { ReactNode } from 'react';
import { BrandMark } from '@/components/BrandMark';
import {
  PLATFORM_COPYRIGHT,
  PLATFORM_EYEBROW,
  PLATFORM_RELEASE_LABEL,
} from '@/constants/brand';
import { usePlatformTheme } from '@/features/theme';
import { DELIVERY_STAGES } from './login.constant';
import { useLoginStyles } from './login.style';

export interface LoginShellProps {
  children: ReactNode;
  headerAction: ReactNode;
}

export function LoginShell({ children, headerAction }: LoginShellProps) {
  const { resolvedTheme } = usePlatformTheme();
  const { styles } = useLoginStyles({
    isLightTheme: resolvedTheme === 'light',
  });

  return (
    <main className={styles.page}>
      <header className={styles.header}>
        <BrandMark />
        <div className={styles.headerActions}>
          <span className={styles.version}>{PLATFORM_RELEASE_LABEL}</span>
          {headerAction}
        </div>
      </header>

      <section className={styles.hero} aria-labelledby="login-hero-title">
        <p className={styles.eyebrow}>{PLATFORM_EYEBROW}</p>
        <h1 className={styles.heroTitle} id="login-hero-title">
          需求到合并，
          <br />
          一条<span className={styles.heroAccent}>可治理</span>的
          <br />
          AI 交付链路。
        </h1>
        <ol className={styles.deliveryStages} aria-label="研发交付链路">
          {DELIVERY_STAGES.map((stage, index) => (
            <li className={styles.stageItem} key={stage}>
              <span
                className={clsx(
                  styles.stage,
                  index === DELIVERY_STAGES.length - 1 && styles.terminalStage,
                )}
              >
                {stage}
              </span>
              {index < DELIVERY_STAGES.length - 1 ? (
                <span aria-hidden="true" className={styles.stageArrow}>
                  →
                </span>
              ) : null}
            </li>
          ))}
        </ol>
        <small className={styles.meta}>{PLATFORM_COPYRIGHT}</small>
      </section>

      <section className={styles.formPane} aria-label="登录表单">
        <div className={styles.formCard}>{children}</div>
      </section>
    </main>
  );
}
