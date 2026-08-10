import { LoginForm, ProFormText } from '@ant-design/pro-components';
import { history, useModel } from '@umijs/max';
import { App } from 'antd';
import { useEffect, useState } from 'react';
import { BrandMark } from '@/components/BrandMark';
import { fetchMe, type LoginInput, login } from '@/features/auth';
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

  const submit = async (values: LoginInput) => {
    try {
      await login(values);
      const [me, navigation] = await Promise.all([
        fetchMe(),
        fetchNavigation(),
      ]);
      if (me === null) {
        message.error('登录状态刷新失败');
        return false;
      }
      await setInitialState({ me, navigation });
      setLoginSucceeded(true);
      return true;
    } catch (error) {
      message.error(error instanceof Error ? error.message : '登录失败');
      return false;
    }
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
          <LoginForm<LoginInput>
            onFinish={submit}
            subTitle="使用平台账号继续"
            title="欢迎回来"
          >
            <ProFormText
              label="员工编号"
              name="employeeId"
              rules={[
                { required: true, message: '请输入员工编号' },
                { pattern: /^\d{8}$/, message: '员工编号为 8 位数字' },
              ]}
            />
            <ProFormText.Password
              label="密码"
              name="password"
              rules={[{ required: true, message: '请输入密码' }]}
            />
            <ProFormText
              label="TOTP 动态码"
              name="totp"
              rules={[
                { required: true, message: '请输入动态码' },
                { pattern: /^\d{6}$/, message: '动态码为 6 位数字' },
              ]}
            />
          </LoginForm>
        </div>
      </section>
    </main>
  );
}
