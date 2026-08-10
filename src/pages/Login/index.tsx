import { LoginForm, ProFormText } from '@ant-design/pro-components';
import { history, useModel } from '@umijs/max';
import { App } from 'antd';
import { useEffect, useState } from 'react';
import { fetchMe, type LoginInput, login } from '@/features/auth';
import { fetchNavigation } from '@/features/navigation';

export default function LoginPage() {
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
    <div className="flex min-h-screen items-center justify-center">
      <LoginForm<LoginInput>
        onFinish={submit}
        subTitle="V0.1 骨架：登录为技术性 stub，V0.2 接入真实认证"
        title="内部研发平台"
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
  );
}
