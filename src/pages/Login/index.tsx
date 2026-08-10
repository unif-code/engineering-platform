import { history, useModel } from '@umijs/max';
import { App } from 'antd';
import { useEffect, useState } from 'react';
import { BrandMark } from '@/components/BrandMark';
import { fetchMe, LoginFlow } from '@/features/auth';
import { fetchNavigation } from '@/features/navigation';
import { ThemeSelector } from '@/features/theme';
import { DELIVERY_STAGES } from './constant';
import { useStyles } from './index.style';

export default function LoginPage() {
  const { styles } = useStyles();
  const [loginSucceeded, setLoginSucceeded] = useState(false);
  const { message } = App.useApp();
  const { setInitialState } = useModel('@@initialState');

  useEffect(() => {
    if (loginSucceeded) {
      history.push('/home');
    }
  }, [loginSucceeded]);

  const refreshSession = async () => {
    const [me, navigation] = await Promise.all([fetchMe(), fetchNavigation()]);
    if (me === null) {
      message.error('登录状态刷新失败');
      return;
    }
    await setInitialState({ me, navigation });
    setLoginSucceeded(true);
  };

  return (
    <main className={styles.page}>
      <section className={styles.hero} aria-labelledby="login-hero-title">
        <BrandMark className={styles.brand} />
        <p className={styles.eyebrow}>ENGINEERING DELIVERY PLATFORM</p>
        <h1 className={styles.heroTitle} id="login-hero-title">
          从需求到交付，一套可追溯的研发工作台
        </h1>
        <div className={styles.deliveryStages}>
          {DELIVERY_STAGES.map((stage) => (
            <span className={styles.stage} key={stage}>
              {stage}
            </span>
          ))}
        </div>
        <small className={styles.meta}>内部研发平台 · V0.1</small>
      </section>
      <section className={styles.formPane} aria-label="登录表单">
        <div className={styles.themeAction}>
          <ThemeSelector />
        </div>
        <div className={styles.formCard}>
          <LoginFlow onAuthenticated={refreshSession} />
        </div>
      </section>
    </main>
  );
}
