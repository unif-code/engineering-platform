import {
  createChallengeToken,
  createEmployeeNo,
  createPassword,
  createTotpCode,
} from '@root/tests/auth-fixtures';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ConfigProvider } from 'antd';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { ApiError } from '@/services/transport';

const mocks = vi.hoisted(() => ({
  login: vi.fn(),
  onAuthenticated: vi.fn(),
  push: vi.fn(),
  verifyTotp: vi.fn(),
}));

vi.mock('@umijs/max', () => ({
  history: { push: mocks.push },
}));

vi.mock('./service', () => ({
  login: mocks.login,
  verifyTotp: mocks.verifyTotp,
}));

import { LoginFlow } from './LoginFlow';

function createLoginFixture() {
  const fixture = {
    challengeToken: createChallengeToken(),
    code: createTotpCode(),
    input: {
      employeeNo: createEmployeeNo(),
      password: createPassword(),
    },
  };
  mocks.login.mockResolvedValue({
    challengeToken: fixture.challengeToken,
    state: 'TOTP_REQUIRED',
  });
  mocks.verifyTotp.mockResolvedValue({ state: 'AUTHENTICATED' });
  return fixture;
}

async function fillCredentials(
  user: ReturnType<typeof userEvent.setup>,
  input: { employeeNo: string; password: string },
) {
  await user.type(screen.getByLabelText('员工编号'), input.employeeNo);
  await user.type(screen.getByLabelText('密码'), input.password);
}

beforeEach(() => {
  mocks.login.mockReset();
  mocks.onAuthenticated.mockReset();
  mocks.push.mockReset();
  mocks.verifyTotp.mockReset();
  mocks.onAuthenticated.mockResolvedValue(undefined);
});

describe('LoginFlow', () => {
  it('凭据步骤使用账号登录标题并保持两字段', () => {
    createLoginFixture();
    render(<LoginFlow onAuthenticated={mocks.onAuthenticated} />);

    expect(
      screen.getByRole('heading', { name: '账号登录' }),
    ).toBeInTheDocument();
    expect(screen.queryByText('使用平台账号继续')).not.toBeInTheDocument();
    expect(screen.getByLabelText('员工编号')).toBeInTheDocument();
    expect(screen.getByLabelText('密码')).toBeInTheDocument();
    expect(screen.queryByLabelText('TOTP 动态码')).not.toBeInTheDocument();
  });

  it('提交按钮继承根级 ConfigProvider 主题', async () => {
    const fixture = createLoginFixture();
    const user = userEvent.setup();
    render(
      <ConfigProvider theme={{ token: { colorPrimary: '#123456' } }}>
        <LoginFlow onAuthenticated={mocks.onAuthenticated} />
      </ConfigProvider>,
    );

    const credentialsButton = screen.getByRole('button', {
      name: /继\s*续/,
    });
    expect(getComputedStyle(credentialsButton).backgroundColor).toBe('#123456');

    await fillCredentials(user, fixture.input);
    await user.click(screen.getByRole('button', { name: /继\s*续/ }));

    const totpButton = await screen.findByRole('button', {
      name: /验\s*证\s*并\s*登\s*录/,
    });
    expect(getComputedStyle(totpButton).backgroundColor).toBe('#123456');
  });

  it('局部品牌色不会覆盖 LoginForm 的全宽提交按钮', async () => {
    const fixture = createLoginFixture();
    const user = userEvent.setup();
    render(<LoginFlow onAuthenticated={mocks.onAuthenticated} />);

    expect(screen.getByRole('button', { name: /继\s*续/ })).toHaveStyle({
      width: '100%',
    });

    await fillCredentials(user, fixture.input);
    await user.click(screen.getByRole('button', { name: /继\s*续/ }));

    expect(
      await screen.findByRole('button', { name: /验\s*证\s*并\s*登\s*录/ }),
    ).toHaveStyle({
      width: '100%',
    });
  });

  it('完成凭据与 TOTP 两步后才通知页面刷新 Session', async () => {
    const fixture = createLoginFixture();
    const user = userEvent.setup();
    render(<LoginFlow onAuthenticated={mocks.onAuthenticated} />);

    await fillCredentials(user, fixture.input);
    await user.click(screen.getByRole('button', { name: /继\s*续/ }));

    expect(mocks.login).toHaveBeenCalledWith(fixture.input);
    expect(mocks.onAuthenticated).not.toHaveBeenCalled();

    const totpInput = await screen.findByLabelText('TOTP 动态码');
    expect(
      screen.getByRole('heading', { name: '验证动态码' }),
    ).toBeInTheDocument();
    await waitFor(() => expect(totpInput).toHaveFocus());
    await user.click(totpInput);
    await user.paste(fixture.code);
    expect(totpInput).toHaveValue(fixture.code);

    await user.click(
      screen.getByRole('button', { name: /验\s*证\s*并\s*登\s*录/ }),
    );

    await waitFor(() =>
      expect(mocks.verifyTotp).toHaveBeenCalledWith({
        challengeToken: fixture.challengeToken,
        code: fixture.code,
      }),
    );
    expect(mocks.onAuthenticated).toHaveBeenCalledOnce();
    expect(mocks.push).not.toHaveBeenCalled();
  });

  it('密码错误时展示服务端 Problem detail 原文并留在凭据步骤', async () => {
    const fixture = createLoginFixture();
    const user = userEvent.setup();
    mocks.login.mockRejectedValue(
      new ApiError({
        detail: '员工号或密码错误',
        status: 401,
        title: 'INVALID_CREDENTIALS',
      }),
    );
    render(<LoginFlow onAuthenticated={mocks.onAuthenticated} />);

    await fillCredentials(user, fixture.input);
    await user.click(screen.getByRole('button', { name: /继\s*续/ }));

    expect(await screen.findByText('员工号或密码错误')).toBeInTheDocument();
    expect(screen.getByLabelText('员工编号')).toBeInTheDocument();
    expect(screen.queryByLabelText('TOTP 动态码')).not.toBeInTheDocument();
    expect(mocks.onAuthenticated).not.toHaveBeenCalled();
  });

  it('服务端仅返回通用认证标题时展示中文建议与请求编号', async () => {
    const fixture = createLoginFixture();
    const user = userEvent.setup();
    mocks.login.mockRejectedValue(
      new ApiError({
        requestId: 'req-login-generic',
        status: 401,
        title: 'Authentication failed',
      }),
    );
    render(<LoginFlow onAuthenticated={mocks.onAuthenticated} />);

    await fillCredentials(user, fixture.input);
    await user.click(screen.getByRole('button', { name: /继\s*续/ }));

    expect(
      await screen.findByText(
        '员工编号或密码错误，临时密码也可能已失效（请求编号：req-login-generic）',
      ),
    ).toBeInTheDocument();
    expect(screen.queryByText('Authentication failed')).not.toBeInTheDocument();
    expect(screen.getByLabelText('员工编号')).toBeInTheDocument();
    expect(screen.queryByLabelText('TOTP 动态码')).not.toBeInTheDocument();
  });

  it('429 时禁用凭据提交且只展示服务端等待文案', async () => {
    const fixture = createLoginFixture();
    const user = userEvent.setup();
    mocks.login.mockRejectedValue(
      new ApiError({
        detail: '登录失败次数过多，请在 30 秒后重试',
        status: 429,
        title: 'LOGIN_BACKOFF',
      }),
    );
    render(<LoginFlow onAuthenticated={mocks.onAuthenticated} />);

    await fillCredentials(user, fixture.input);
    const submit = screen.getByRole('button', { name: /继\s*续/ });
    await user.click(submit);

    expect(
      await screen.findByText('登录失败次数过多，请在 30 秒后重试'),
    ).toBeInTheDocument();
    expect(submit).toBeDisabled();
    expect(submit).toHaveStyle({ width: '100%' });
    expect(
      screen.queryByText(/倒计时|剩余\s*\d+\s*秒/),
    ).not.toBeInTheDocument();

    await user.click(
      screen.getByRole('button', {
        name: /切\s*换\s*账\s*号\s*\/\s*重\s*新\s*登\s*录/,
      }),
    );

    expect(
      screen.queryByText('登录失败次数过多，请在 30 秒后重试'),
    ).not.toBeInTheDocument();
    expect(screen.getByLabelText('员工编号')).toHaveValue('');
    expect(screen.getByLabelText('密码')).toHaveValue('');
    expect(screen.getByRole('button', { name: /继\s*续/ })).toBeEnabled();
  });

  it('BOOTSTRAP 状态通过 HttpOnly cookie 跳向初始化向导', async () => {
    const fixture = createLoginFixture();
    const user = userEvent.setup();
    mocks.login.mockResolvedValue({
      state: 'BOOTSTRAP_REQUIRED',
    });
    render(<LoginFlow onAuthenticated={mocks.onAuthenticated} />);

    await fillCredentials(user, fixture.input);
    await user.click(screen.getByRole('button', { name: /继\s*续/ }));

    await waitFor(() =>
      expect(mocks.push).toHaveBeenCalledWith('/bootstrap', {
        bootstrapSessionReady: true,
      }),
    );
    expect(mocks.login).toHaveBeenCalledOnce();
    expect(screen.queryByLabelText('TOTP 动态码')).not.toBeInTheDocument();
    expect(mocks.onAuthenticated).not.toHaveBeenCalled();
  });

  it('TOTP 错误时展示 Problem detail 原文并保留 challenge 步骤', async () => {
    const fixture = createLoginFixture();
    const user = userEvent.setup();
    mocks.verifyTotp.mockRejectedValue(
      new ApiError({
        detail: 'TOTP 验证码错误，剩余 4 次',
        status: 401,
        title: 'INVALID_TOTP',
      }),
    );
    render(<LoginFlow onAuthenticated={mocks.onAuthenticated} />);

    await fillCredentials(user, fixture.input);
    await user.click(screen.getByRole('button', { name: /继\s*续/ }));
    const totpInput = await screen.findByLabelText('TOTP 动态码');
    await user.type(totpInput, fixture.code);
    await user.click(
      screen.getByRole('button', { name: /验\s*证\s*并\s*登\s*录/ }),
    );

    expect(
      await screen.findByText('TOTP 验证码错误，剩余 4 次'),
    ).toBeInTheDocument();
    expect(totpInput).toHaveValue(fixture.code);
    expect(
      screen.getByRole('button', { name: /验\s*证\s*并\s*登\s*录/ }),
    ).toBeEnabled();
    expect(
      screen.queryByRole('button', { name: /重\s*新\s*登\s*录/ }),
    ).not.toBeInTheDocument();
    expect(mocks.onAuthenticated).not.toHaveBeenCalled();
  });

  it('TOTP challenge 失效时禁用提交并可重新登录清空状态', async () => {
    const fixture = createLoginFixture();
    const user = userEvent.setup();
    mocks.verifyTotp.mockRejectedValue(
      new ApiError({
        challengeExpired: true,
        detail: 'TOTP challenge 已失效，请等待 30 秒后重新登录',
        status: 401,
        title: 'TOTP_CHALLENGE_EXPIRED',
      }),
    );
    render(<LoginFlow onAuthenticated={mocks.onAuthenticated} />);

    await fillCredentials(user, fixture.input);
    await user.click(screen.getByRole('button', { name: /继\s*续/ }));
    const totpInput = await screen.findByLabelText('TOTP 动态码');
    await user.type(totpInput, fixture.code);
    const submit = screen.getByRole('button', {
      name: /验\s*证\s*并\s*登\s*录/,
    });
    await user.click(submit);

    expect(
      await screen.findByText('TOTP challenge 已失效，请等待 30 秒后重新登录'),
    ).toBeInTheDocument();
    expect(submit).toBeDisabled();

    await user.click(screen.getByRole('button', { name: /重\s*新\s*登\s*录/ }));

    expect(screen.getByLabelText('员工编号')).toHaveValue('');
    expect(screen.getByLabelText('密码')).toHaveValue('');
    expect(screen.queryByLabelText('TOTP 动态码')).not.toBeInTheDocument();
    expect(
      screen.queryByText('TOTP challenge 已失效，请等待 30 秒后重新登录'),
    ).not.toBeInTheDocument();
  });
});
