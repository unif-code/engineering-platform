import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { ApiError } from '@/services/transport';

const mocks = vi.hoisted(() => ({
  confirmBootstrapTotp: vi.fn(),
  enrollBootstrapTotp: vi.fn(),
  login: vi.fn(),
  push: vi.fn(),
  replace: vi.fn(),
  setBootstrapPassword: vi.fn(),
}));

vi.mock('@umijs/max', () => ({
  history: { push: mocks.push, replace: mocks.replace },
}));

vi.mock('./service', () => ({
  confirmBootstrapTotp: mocks.confirmBootstrapTotp,
  enrollBootstrapTotp: mocks.enrollBootstrapTotp,
  login: mocks.login,
  setBootstrapPassword: mocks.setBootstrapPassword,
}));

import { BootstrapWizard } from './BootstrapWizard';

const provisioningUri =
  'otpauth://totp/EP:00000009?secret=JBSWY3DPEHPK3PXP&issuer=EP';
const validPassword = 'New-Valid-Password!2026';

async function submitTemporaryCredentials(
  user: ReturnType<typeof userEvent.setup>,
) {
  await user.type(screen.getByLabelText('员工编号'), '00000009');
  await user.type(screen.getByLabelText('临时密码'), 'Temporary-Password!2026');
  await user.click(screen.getByRole('button', { name: '验证临时密码' }));
}

async function advanceToPassword(user: ReturnType<typeof userEvent.setup>) {
  await submitTemporaryCredentials(user);
  return screen.findByLabelText('正式密码');
}

async function submitPermanentPassword(
  user: ReturnType<typeof userEvent.setup>,
  password = validPassword,
) {
  await user.type(screen.getByLabelText('正式密码'), password);
  await user.click(screen.getByRole('button', { name: '设置正式密码' }));
}

beforeEach(() => {
  for (const mock of Object.values(mocks)) {
    mock.mockReset();
  }
  mocks.login.mockResolvedValue({ state: 'BOOTSTRAP_REQUIRED' });
  mocks.setBootstrapPassword.mockResolvedValue({ state: 'PASSWORD_SET' });
  mocks.enrollBootstrapTotp.mockResolvedValue({ provisioningUri });
  mocks.confirmBootstrapTotp.mockResolvedValue({ state: 'AUTHENTICATED' });
});

describe('BootstrapWizard', () => {
  it('使用 HttpOnly bootstrap Session 完成密码、TOTP 与重新登录', async () => {
    const user = userEvent.setup();
    render(<BootstrapWizard />);

    await advanceToPassword(user);
    expect(mocks.login).toHaveBeenCalledWith({
      employeeNo: '00000009',
      password: 'Temporary-Password!2026',
    });
    expect(mocks.replace).toHaveBeenCalledWith('/bootstrap');

    await submitPermanentPassword(user);

    await waitFor(() =>
      expect(mocks.setBootstrapPassword).toHaveBeenCalledWith({
        password: validPassword,
      }),
    );
    expect(mocks.enrollBootstrapTotp).toHaveBeenCalledWith();
    const qrRegion = await screen.findByRole('region', {
      name: 'TOTP 绑定二维码',
    });
    expect(within(qrRegion).getByText('JBSWY3DPEHPK3PXP')).toBeInTheDocument();

    await user.type(screen.getByLabelText('TOTP 动态码'), '123456');
    await user.click(screen.getByRole('button', { name: '确认并完成' }));

    await waitFor(() =>
      expect(mocks.confirmBootstrapTotp).toHaveBeenCalledWith({
        code: '123456',
      }),
    );
    await user.click(await screen.findByRole('button', { name: '重新登录' }));
    expect(mocks.push).toHaveBeenCalledWith('/login');
  });

  it('刷新后不从 URL 恢复 bootstrap 状态，避免泄露会话凭据', () => {
    render(<BootstrapWizard />);

    expect(screen.getByLabelText('员工编号')).toBeInTheDocument();
    expect(screen.queryByLabelText('正式密码')).not.toBeInTheDocument();
  });

  it('临时凭据返回非 BOOTSTRAP 状态时留在步骤一并显示错误', async () => {
    const user = userEvent.setup();
    mocks.login.mockResolvedValue({
      challengeToken: 'challenge-00000009',
      state: 'TOTP_REQUIRED',
    });
    render(<BootstrapWizard />);

    await submitTemporaryCredentials(user);

    expect(
      await screen.findByText('当前账号未进入初始化阶段，请返回登录'),
    ).toBeInTheDocument();
    expect(screen.getByLabelText('员工编号')).toBeInTheDocument();
  });

  it('正式密码实时校验 Security Floor', async () => {
    const user = userEvent.setup();
    render(<BootstrapWizard />);
    await advanceToPassword(user);

    await user.type(screen.getByLabelText('正式密码'), 'weak');

    expect(await screen.findByText('密码至少 15 位')).toBeInTheDocument();
    expect(screen.getByText('密码必须包含大写字母')).toBeInTheDocument();
    expect(screen.getByText('密码必须包含特殊字符')).toBeInTheDocument();
    expect(mocks.setBootstrapPassword).not.toHaveBeenCalled();
  });

  it('服务端 422 字段错误显示在正式密码字段并停留在步骤二', async () => {
    const user = userEvent.setup();
    mocks.setBootstrapPassword.mockRejectedValue(
      new ApiError({
        detail: '正式密码不满足 Security Floor',
        errors: [
          {
            field: 'password',
            reason: '密码需为 15～64 位，并包含大写字母、小写字母和特殊字符',
          },
        ],
        status: 422,
        title: 'VALIDATION_ERROR',
      }),
    );
    render(<BootstrapWizard />);
    await advanceToPassword(user);

    await submitPermanentPassword(user);

    expect(
      await screen.findByText(
        '密码需为 15～64 位，并包含大写字母、小写字母和特殊字符',
      ),
    ).toBeInTheDocument();
    expect(screen.getByLabelText('正式密码')).toBeInTheDocument();
    expect(mocks.enrollBootstrapTotp).not.toHaveBeenCalled();
  });

  it('TOTP confirm 错误保留二维码并允许原地重试', async () => {
    const user = userEvent.setup();
    mocks.confirmBootstrapTotp.mockRejectedValue(
      new ApiError({
        detail: 'TOTP 验证码错误',
        status: 401,
        title: 'INVALID_TOTP',
      }),
    );
    render(<BootstrapWizard />);
    await advanceToPassword(user);
    await submitPermanentPassword(user);
    await screen.findByRole('region', { name: 'TOTP 绑定二维码' });

    await user.type(screen.getByLabelText('TOTP 动态码'), '000000');
    await user.click(screen.getByRole('button', { name: '确认并完成' }));

    expect(await screen.findByText('TOTP 验证码错误')).toBeInTheDocument();
    expect(
      screen.getByRole('region', { name: 'TOTP 绑定二维码' }),
    ).toBeInTheDocument();
    expect(screen.getByLabelText('TOTP 动态码')).toHaveValue('000000');
  });

  it('TOTP enroll 失败后独立重试，不重复提交正式密码', async () => {
    const user = userEvent.setup();
    mocks.enrollBootstrapTotp
      .mockRejectedValueOnce(new Error('绑定信息暂时不可用'))
      .mockResolvedValueOnce({ provisioningUri });
    render(<BootstrapWizard />);
    await advanceToPassword(user);

    await submitPermanentPassword(user);

    expect(await screen.findByText('绑定信息暂时不可用')).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: '重新获取绑定信息' }));
    expect(
      await screen.findByRole('region', { name: 'TOTP 绑定二维码' }),
    ).toBeInTheDocument();
    expect(mocks.setBootstrapPassword).toHaveBeenCalledOnce();
    expect(mocks.enrollBootstrapTotp).toHaveBeenCalledTimes(2);
  });

  it('bootstrap Session 失效时提示联系管理员重新签发临时密码', async () => {
    const user = userEvent.setup();
    mocks.setBootstrapPassword.mockRejectedValue(
      new ApiError({
        detail: 'Bootstrap Session 已失效',
        status: 401,
        title: 'BOOTSTRAP_SESSION_EXPIRED',
      }),
    );
    render(<BootstrapWizard />);
    await advanceToPassword(user);

    await submitPermanentPassword(user);

    expect(
      await screen.findByText('联系管理员重新签发临时密码'),
    ).toBeInTheDocument();
  });
});
