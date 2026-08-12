import { useLoginStepStyles } from './login.style';

interface LoginStepHeaderProps {
  description?: string;
  title: string;
}

/**
 * LoginForm 的 title 槽会被普通 span 包裹，因此在表单内容区提供原生标题结构。
 */
export function LoginStepHeader({ description, title }: LoginStepHeaderProps) {
  const { styles } = useLoginStepStyles();

  return (
    <header className={styles.stepHeader}>
      <h2 className={styles.stepTitle}>{title}</h2>
      {description ? (
        <p className={styles.stepDescription}>{description}</p>
      ) : null}
    </header>
  );
}
