import { history, useLocation } from '@umijs/max';
import { Button, Form, Input, QRCode, Steps } from 'antd';
import { useEffect, useState } from 'react';
import { ApiError } from '@/services/transport';
import { getAuthErrorMessage } from './error';
import { useBootstrapStyles } from './index.style';
import {
  confirmBootstrapTotp,
  enrollBootstrapTotp,
  login,
  setBootstrapPassword,
} from './service';
import type { LoginInput } from './type';

const CONTACT_ADMIN_MESSAGE = '联系管理员重新签发临时密码';

const BOOTSTRAP_TITLE_MESSAGES = {
  BOOTSTRAP_SESSION_EXPIRED: CONTACT_ADMIN_MESSAGE,
  BOOTSTRAP_TOKEN_EXPIRED: CONTACT_ADMIN_MESSAGE,
};

const STEP_ITEMS = [
  { title: '验证临时密码' },
  { title: '设置正式密码' },
  { title: '绑定认证器' },
  { title: '完成' },
];

interface PasswordFormValues {
  confirmPassword: string;
  password: string;
}

interface TotpFormValues {
  code: string;
}

const getErrorDetail = (error: unknown, fallback: string): string => {
  return getAuthErrorMessage(error, fallback, BOOTSTRAP_TITLE_MESSAGES);
};

const getPasswordFieldErrors = (error: unknown): string[] => {
  if (!(error instanceof ApiError) || error.problem.status !== 422) {
    return [];
  }
  const errors = error.problem.errors;
  if (!Array.isArray(errors)) {
    return [];
  }
  return errors.flatMap((entry) => {
    if (
      typeof entry === 'object' &&
      entry !== null &&
      'field' in entry &&
      entry.field === 'password' &&
      'reason' in entry &&
      typeof entry.reason === 'string'
    ) {
      return [entry.reason];
    }
    return [];
  });
};

const getProvisioningSecret = (provisioningUri: string): string => {
  try {
    return new URL(provisioningUri).searchParams.get('secret') ?? '';
  } catch {
    return '';
  }
};

const hasBootstrapSessionHandoff = (state: unknown): boolean =>
  typeof state === 'object' &&
  state !== null &&
  'bootstrapSessionReady' in state &&
  state.bootstrapSessionReady === true;

export function BootstrapWizard() {
  const { styles } = useBootstrapStyles();
  const location = useLocation();
  const bootstrapSessionReady = hasBootstrapSessionHandoff(location.state);
  const [currentStep, setCurrentStep] = useState(() =>
    bootstrapSessionReady ? 1 : 0,
  );
  const [passwordFieldErrors, setPasswordFieldErrors] = useState<string[]>([]);
  const [problemDetail, setProblemDetail] = useState<string>();
  const [provisioningUri, setProvisioningUri] = useState<string>();
  const [showManualSecret, setShowManualSecret] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (bootstrapSessionReady) {
      history.replace('/bootstrap');
    }
  }, [bootstrapSessionReady]);

  const submitTemporaryCredentials = async (values: LoginInput) => {
    setProblemDetail(undefined);
    setSubmitting(true);
    try {
      const result = await login(values);
      if (result.state !== 'BOOTSTRAP_REQUIRED') {
        setProblemDetail('当前账号未进入初始化阶段，请返回登录');
        return;
      }
      setCurrentStep(1);
      history.replace('/bootstrap');
    } catch (error) {
      setProblemDetail(
        getErrorDetail(error, '员工编号或临时密码错误，临时密码也可能已失效'),
      );
    } finally {
      setSubmitting(false);
    }
  };

  const submitPassword = async ({ password }: PasswordFormValues) => {
    setProblemDetail(undefined);
    setPasswordFieldErrors([]);
    setSubmitting(true);
    try {
      try {
        const result = await setBootstrapPassword({ password });
        if (result.state === 'PASSWORD_UPDATED_LOGIN_REQUIRED') {
          history.replace('/login');
          return;
        }
      } catch (error) {
        const fieldErrors = getPasswordFieldErrors(error);
        if (fieldErrors.length > 0) {
          setPasswordFieldErrors(fieldErrors);
        }
        setProblemDetail(
          getErrorDetail(
            error,
            '初始化会话已失效，请联系管理员重新签发临时密码',
          ),
        );
        return;
      }
      setCurrentStep(2);
      try {
        const enrollment = await enrollBootstrapTotp();
        setShowManualSecret(false);
        setProvisioningUri(enrollment.provisioningUri);
      } catch (error) {
        setProblemDetail(
          getErrorDetail(
            error,
            '初始化会话已失效，请联系管理员重新签发临时密码',
          ),
        );
      }
    } finally {
      setSubmitting(false);
    }
  };

  const retryTotpEnrollment = async () => {
    setProblemDetail(undefined);
    setSubmitting(true);
    try {
      const enrollment = await enrollBootstrapTotp();
      setShowManualSecret(false);
      setProvisioningUri(enrollment.provisioningUri);
    } catch (error) {
      setProblemDetail(
        getErrorDetail(error, '初始化会话已失效，请联系管理员重新签发临时密码'),
      );
    } finally {
      setSubmitting(false);
    }
  };

  const submitTotp = async ({ code }: TotpFormValues) => {
    setProblemDetail(undefined);
    setSubmitting(true);
    try {
      await confirmBootstrapTotp({ code });
      setCurrentStep(3);
    } catch (error) {
      setProblemDetail(
        getErrorDetail(error, '动态码验证失败，请检查动态码后重试'),
      );
    } finally {
      setSubmitting(false);
    }
  };

  const renderStep = () => {
    if (currentStep === 0) {
      return (
        <>
          <h2 className={styles.heading}>验证临时密码</h2>
          <p className={styles.description}>
            输入员工编号和管理员签发的临时密码开始初始化。
          </p>
          <Form<LoginInput>
            disabled={submitting}
            key="temporary-credentials"
            layout="vertical"
            onFinish={submitTemporaryCredentials}
          >
            <Form.Item
              label="员工编号"
              name="employeeNo"
              rules={[
                { required: true, message: '请输入员工编号' },
                { pattern: /^\d{8}$/, message: '员工编号为 8 位数字' },
              ]}
            >
              <Input autoComplete="username" inputMode="numeric" />
            </Form.Item>
            <Form.Item
              label="临时密码"
              name="password"
              rules={[{ required: true, message: '请输入临时密码' }]}
            >
              <Input.Password autoComplete="current-password" />
            </Form.Item>
            <Button htmlType="submit" loading={submitting} type="primary">
              验证临时密码
            </Button>
          </Form>
        </>
      );
    }

    if (currentStep === 1) {
      return (
        <>
          <h2 className={styles.heading}>设置正式密码</h2>
          <p className={styles.description}>
            密码需为 15～64 位，并包含大写字母、小写字母和特殊字符。
          </p>
          <Form<PasswordFormValues>
            disabled={submitting}
            key="permanent-password"
            layout="vertical"
            onFinish={submitPassword}
            onValuesChange={() => setPasswordFieldErrors([])}
            validateTrigger="onChange"
          >
            <Form.Item
              help={
                passwordFieldErrors.length > 0
                  ? passwordFieldErrors.map((error) => (
                      <div key={error}>{error}</div>
                    ))
                  : undefined
              }
              label="正式密码"
              name="password"
              rules={[
                { required: true, message: '请输入正式密码' },
                { min: 15, message: '密码至少 15 位' },
                { max: 64, message: '密码最多 64 位' },
                { pattern: /[A-Z]/, message: '密码必须包含大写字母' },
                { pattern: /[a-z]/, message: '密码必须包含小写字母' },
                {
                  pattern: /[^A-Za-z0-9]/,
                  message: '密码必须包含特殊字符',
                },
              ]}
              validateStatus={
                passwordFieldErrors.length > 0 ? 'error' : undefined
              }
            >
              <Input.Password autoComplete="new-password" showCount />
            </Form.Item>
            <Form.Item
              dependencies={['password']}
              label="确认密码"
              name="confirmPassword"
              rules={[
                { required: true, message: '请再次输入正式密码' },
                ({ getFieldValue }) => ({
                  validator(_, value) {
                    if (!value || getFieldValue('password') === value) {
                      return Promise.resolve();
                    }
                    return Promise.reject(new Error('两次输入的密码不一致'));
                  },
                }),
              ]}
            >
              <Input.Password autoComplete="new-password" />
            </Form.Item>
            <Button htmlType="submit" loading={submitting} type="primary">
              设置正式密码
            </Button>
          </Form>
        </>
      );
    }

    if (currentStep === 2) {
      const secret =
        provisioningUri === undefined
          ? undefined
          : getProvisioningSecret(provisioningUri);
      return (
        <>
          <h2 className={styles.heading}>绑定认证器</h2>
          <p className={styles.description}>
            使用认证器扫描二维码，再填写 6 位动态码。
          </p>
          {provisioningUri === undefined ? (
            <Button
              loading={submitting}
              onClick={() => void retryTotpEnrollment()}
              type="primary"
            >
              重新获取绑定信息
            </Button>
          ) : (
            <>
              <section aria-label="TOTP 绑定二维码" className={styles.qrRegion}>
                <QRCode type="svg" value={provisioningUri} />
                <p className={styles.secretLabel}>
                  <Button
                    aria-expanded={showManualSecret}
                    onClick={() => setShowManualSecret((visible) => !visible)}
                    type="link"
                  >
                    {showManualSecret
                      ? '隐藏手动密钥'
                      : '无法扫码？显示手动密钥'}
                  </Button>
                  {showManualSecret ? (
                    <code className={styles.secret}>
                      {secret || provisioningUri}
                    </code>
                  ) : null}
                </p>
              </section>
              <Form<TotpFormValues>
                disabled={submitting}
                key="totp-confirmation"
                layout="vertical"
                onFinish={submitTotp}
              >
                <Form.Item
                  label="TOTP 动态码"
                  name="code"
                  rules={[
                    { required: true, message: '请输入动态码' },
                    { pattern: /^\d{6}$/, message: '动态码为 6 位数字' },
                  ]}
                >
                  <Input
                    autoComplete="one-time-code"
                    inputMode="numeric"
                    maxLength={6}
                  />
                </Form.Item>
                <Button htmlType="submit" loading={submitting} type="primary">
                  确认并完成
                </Button>
              </Form>
            </>
          )}
        </>
      );
    }

    return (
      <div className={styles.complete}>
        <h2 className={styles.heading}>初始化完成</h2>
        <p className={styles.description}>
          正式密码与 TOTP 已设置，请使用新凭据重新登录。
        </p>
        <Button onClick={() => history.push('/login')} type="primary">
          重新登录
        </Button>
      </div>
    );
  };

  return (
    <section aria-labelledby="bootstrap-title" className={styles.page}>
      <div className={styles.panel}>
        <p className={styles.eyebrow}>账号初始化</p>
        <h1 className={styles.title} id="bootstrap-title">
          初始化平台账号
        </h1>
        <Steps
          className={styles.steps}
          current={currentStep}
          items={STEP_ITEMS}
          responsive
        />
        <div className={styles.content}>
          {problemDetail ? (
            <div aria-live="polite" className={styles.alert} role="alert">
              {problemDetail}
            </div>
          ) : null}
          {renderStep()}
        </div>
      </div>
    </section>
  );
}
