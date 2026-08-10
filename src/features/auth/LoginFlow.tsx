import { LoginForm, ProFormText } from '@ant-design/pro-components';
import { history } from '@umijs/max';
import { Alert, Button } from 'antd';
import { useState } from 'react';
import { ApiError } from '@/services/transport';
import { login, verifyTotp } from './service';
import type { LoginInput } from './type';

interface TotpFormValues {
  code: string;
}

export interface LoginFlowProps {
  onAuthenticated: () => Promise<void> | void;
}

const getErrorDetail = (error: unknown): string => {
  if (error instanceof ApiError) {
    return error.problem.detail ?? error.message;
  }
  return error instanceof Error ? error.message : '登录失败';
};

export function LoginFlow({ onAuthenticated }: LoginFlowProps) {
  const [challengeToken, setChallengeToken] = useState<string>();
  const [challengeExpired, setChallengeExpired] = useState(false);
  const [formVersion, setFormVersion] = useState(0);
  const [problemDetail, setProblemDetail] = useState<string>();
  const [rateLimited, setRateLimited] = useState(false);

  const resetLogin = () => {
    setChallengeToken(undefined);
    setChallengeExpired(false);
    setProblemDetail(undefined);
    setRateLimited(false);
    setFormVersion((version) => version + 1);
  };

  const submitCredentials = async (values: LoginInput) => {
    setProblemDetail(undefined);
    try {
      const result = await login(values);
      if (result.stage === 'BOOTSTRAP') {
        history.push(
          `/bootstrap?token=${encodeURIComponent(result.bootstrapToken)}`,
        );
        return true;
      }
      setChallengeExpired(false);
      setChallengeToken(result.challengeToken);
      return true;
    } catch (error) {
      setProblemDetail(getErrorDetail(error));
      if (error instanceof ApiError && error.problem.status === 429) {
        setRateLimited(true);
      }
      return false;
    }
  };

  const submitTotp = async ({ code }: TotpFormValues) => {
    if (challengeToken === undefined) {
      return false;
    }
    setProblemDetail(undefined);
    try {
      await verifyTotp({ challengeToken, code });
      await onAuthenticated();
      return true;
    } catch (error) {
      setProblemDetail(getErrorDetail(error));
      if (
        error instanceof ApiError &&
        error.problem.challengeExpired === true
      ) {
        setChallengeExpired(true);
      }
      return false;
    }
  };

  const recoveryAction = rateLimited ? (
    <Button onClick={resetLogin} size="small" type="link">
      切换账号 / 重新登录
    </Button>
  ) : challengeExpired ? (
    <Button onClick={resetLogin} size="small" type="link">
      重新登录
    </Button>
  ) : undefined;

  const errorMessage = problemDetail ? (
    <Alert
      action={recoveryAction}
      showIcon
      title={problemDetail}
      type="error"
    />
  ) : (
    false
  );

  if (challengeToken !== undefined) {
    return (
      <LoginForm<TotpFormValues>
        autoFocusFirstInput={false}
        key={`totp-${formVersion}`}
        message={errorMessage}
        onFinish={submitTotp}
        subTitle="输入认证器生成的 6 位动态码"
        submitter={{
          resetButtonProps: false,
          searchConfig: { submitText: '验证并登录' },
          submitButtonProps: { disabled: challengeExpired },
        }}
        title="验证动态码"
      >
        <ProFormText
          fieldProps={{
            autoComplete: 'one-time-code',
            autoFocus: true,
            inputMode: 'numeric',
            maxLength: 6,
          }}
          label="TOTP 动态码"
          name="code"
          rules={[
            { required: true, message: '请输入动态码' },
            { pattern: /^\d{6}$/, message: '动态码为 6 位数字' },
          ]}
        />
      </LoginForm>
    );
  }

  return (
    <LoginForm<LoginInput>
      key={`credentials-${formVersion}`}
      message={errorMessage}
      onFinish={submitCredentials}
      subTitle="使用平台账号继续"
      submitter={{
        resetButtonProps: false,
        searchConfig: { submitText: '继续' },
        submitButtonProps: { disabled: rateLimited },
      }}
      title="欢迎回来"
    >
      <ProFormText
        fieldProps={{ autoComplete: 'username', inputMode: 'numeric' }}
        label="员工编号"
        name="employeeNo"
        rules={[
          { required: true, message: '请输入员工编号' },
          { pattern: /^\d{8}$/, message: '员工编号为 8 位数字' },
        ]}
      />
      <ProFormText.Password
        fieldProps={{ autoComplete: 'current-password' }}
        label="密码"
        name="password"
        rules={[{ required: true, message: '请输入密码' }]}
      />
    </LoginForm>
  );
}
