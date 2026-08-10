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
  search: '',
  setBootstrapPassword: vi.fn(),
}));

vi.mock('@umijs/max', () => ({
  history: { push: mocks.push, replace: mocks.replace },
  useLocation: () => ({ search: mocks.search }),
}));

vi.mock('./service', () => ({
  confirmBootstrapTotp: mocks.confirmBootstrapTotp,
  enrollBootstrapTotp: mocks.enrollBootstrapTotp,
  login: mocks.login,
  setBootstrapPassword: mocks.setBootstrapPassword,
}));

import { BootstrapWizard } from './BootstrapWizard';

const bootstrapToken = 'bootstrap-00000009';
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

async function submitPermanentPassword(
  user: ReturnType<typeof userEvent.setup>,
  password = validPassword,
) {
  await user.type(screen.getByLabelText('正式密码'), password);
  await user.click(screen.getByRole('button', { name: '设置正式密码' }));
}

beforeEach(() => {
  mocks.confirmBootstrapTotp.mockReset();
  mocks.enrollBootstrapTotp.mockReset();
  mocks.login.mockReset();
  mocks.push.mockReset();
  mocks.replace.mockReset();
  mocks.setBootstrapPassword.mockReset();
  mocks.search = '';
  mocks.replace.mockImplementation((path: string) => {
    const queryStart = path.indexOf('?');
    mocks.search = queryStart >= 0 ? path.slice(queryStart) : '';
  });

  mocks.login.mockResolvedValue({ bootstrapToken, stage: 'BOOTSTRAP' });
  mocks.setBootstrapPassword.mockResolvedValue({ ok: true });
  mocks.enrollBootstrapTotp.mockResolvedValue({ provisioningUri });
  mocks.confirmBootstrapTotp.mockResolvedValue({ ok: true });
});

describe('BootstrapWizard', () => {
  it('无 URL token 时由临时凭据换取 BOOTSTRAP token，再完成密码、TOTP 与重新登录', async () => {
    const user = userEvent.setup();
    render(<BootstrapWizard />);

    expect(screen.getByLabelText('员工编号')).toBeInTheDocument();
    expect(screen.queryByLabelText('正式密码')).not.toBeInTheDocument();

    await submitTemporaryCredentials(user);

    await waitFor(() =>
      expect(mocks.login).toHaveBeenCalledWith({
        employeeNo: '00000009',
        password: 'Temporary-Password!2026',
      }),
    );
    expect(await screen.findByLabelText('正式密码')).toBeInTheDocument();

    await submitPermanentPassword(user);

    await waitFor(() =>
      expect(mocks.setBootstrapPassword).toHaveBeenCalledWith({
        bootstrapToken,
        password: validPassword,
      }),
    );
    expect(mocks.enrollBootstrapTotp).toHaveBeenCalledWith({ bootstrapToken });
    const qrRegion = await screen.findByRole('region', {
      name: 'TOTP 绑定二维码',
    });
    expect(qrRegion).toBeInTheDocument();
    expect(within(qrRegion).getByText('JBSWY3DPEHPK3PXP')).toBeInTheDocument();

    await user.type(screen.getByLabelText('TOTP 动态码'), '123456');
    await user.click(screen.getByRole('button', { name: '确认并完成' }));

    await waitFor(() =>
      expect(mocks.confirmBootstrapTotp).toHaveBeenCalledWith({
        bootstrapToken,
        code: '123456',
      }),
    );
    expect(
      await screen.findByRole('button', { name: '重新登录' }),
    ).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: '重新登录' }));
    expect(mocks.push).toHaveBeenCalledWith('/login');
  });

  it('URL token 从步骤二开始，且刷新后不依赖持久化状态', () => {
    mocks.search = `?token=${bootstrapToken}`;

    render(<BootstrapWizard />);

    expect(screen.getByLabelText('正式密码')).toBeInTheDocument();
    expect(screen.queryByLabelText('员工编号')).not.toBeInTheDocument();
    expect(mocks.login).not.toHaveBeenCalled();
  });

  it('临时凭据换得 token 后更新 URL，刷新仍从步骤二继续', async () => {
    const user = userEvent.setup();
    const view = render(<BootstrapWizard />);

    await submitTemporaryCredentials(user);

    await waitFor(() =>
      expect(mocks.replace).toHaveBeenCalledWith(
        '/bootstrap?token=bootstrap-00000009',
      ),
    );
    view.unmount();
    render(<BootstrapWizard />);

    expect(screen.getByLabelText('正式密码')).toBeInTheDocument();
    expect(screen.queryByLabelText('员工编号')).not.toBeInTheDocument();
    expect(mocks.login).toHaveBeenCalledOnce();
  });

  it('临时凭据返回非 BOOTSTRAP 阶段时留在步骤一并显示错误', async () => {
    const user = userEvent.setup();
    mocks.login.mockResolvedValue({
      challengeToken: 'challenge-00000009',
      stage: 'TOTP',
    });
    render(<BootstrapWizard />);

    await submitTemporaryCredentials(user);

    expect(
      await screen.findByText('当前账号未进入初始化阶段，请返回登录'),
    ).toBeInTheDocument();
    expect(screen.getByLabelText('员工编号')).toBeInTheDocument();
    expect(screen.queryByLabelText('正式密码')).not.toBeInTheDocument();
  });

  it('正式密码在输入时实时校验 15～64 位、大小写与特殊字符', async () => {
    const user = userEvent.setup();
    mocks.search = `?token=${bootstrapToken}`;
    render(<BootstrapWizard />);

    await user.type(screen.getByLabelText('正式密码'), 'weak');

    expect(await screen.findByText('密码至少 15 位')).toBeInTheDocument();
    expect(screen.getByText('密码必须包含大写字母')).toBeInTheDocument();
    expect(screen.getByText('密码必须包含特殊字符')).toBeInTheDocument();
    expect(mocks.setBootstrapPassword).not.toHaveBeenCalled();
  });

  it('正式密码超过 64 位或缺少小写字母时在输入阶段提示对应规则', async () => {
    const user = userEvent.setup();
    mocks.search = `?token=${bootstrapToken}`;
    render(<BootstrapWizard />);
    const passwordInput = screen.getByLabelText('正式密码');

    await user.type(passwordInput, `${'A'.repeat(65)}a!`);
    expect(await screen.findByText('密码最多 64 位')).toBeInTheDocument();

    await user.clear(passwordInput);
    await user.type(passwordInput, `${'A'.repeat(15)}!`);
    expect(await screen.findByText('密码必须包含小写字母')).toBeInTheDocument();
    expect(mocks.setBootstrapPassword).not.toHaveBeenCalled();
  });

  it('服务端 422 字段错误显示在正式密码字段并停留在步骤二', async () => {
    const user = userEvent.setup();
    mocks.search = `?token=${bootstrapToken}`;
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

    await submitPermanentPassword(user);

    expect(
      await screen.findByText(
        '密码需为 15～64 位，并包含大写字母、小写字母和特殊字符',
      ),
    ).toBeInTheDocument();
    expect(screen.getByLabelText('正式密码')).toBeInTheDocument();
    expect(mocks.enrollBootstrapTotp).not.toHaveBeenCalled();
  });

  it('TOTP confirm 错误保留二维码与步骤三，允许原地重试', async () => {
    const user = userEvent.setup();
    mocks.search = `?token=${bootstrapToken}`;
    mocks.confirmBootstrapTotp.mockRejectedValue(
      new ApiError({
        detail: 'TOTP 验证码错误',
        status: 401,
        title: 'INVALID_TOTP',
      }),
    );
    render(<BootstrapWizard />);

    await submitPermanentPassword(user);
    await screen.findByRole('region', { name: 'TOTP 绑定二维码' });
    await user.type(screen.getByLabelText('TOTP 动态码'), '000000');
    await user.click(screen.getByRole('button', { name: '确认并完成' }));

    expect(await screen.findByText('TOTP 验证码错误')).toBeInTheDocument();
    expect(
      screen.getByRole('region', { name: 'TOTP 绑定二维码' }),
    ).toBeInTheDocument();
    expect(screen.getByLabelText('TOTP 动态码')).toHaveValue('000000');
    expect(
      screen.queryByRole('button', { name: '重新登录' }),
    ).not.toBeInTheDocument();
  });

  it('TOTP enroll 失败后独立重试，不重复提交已成功的正式密码', async () => {
    const user = userEvent.setup();
    mocks.search = `?token=${bootstrapToken}`;
    mocks.enrollBootstrapTotp
      .mockRejectedValueOnce(new Error('绑定信息暂时不可用'))
      .mockResolvedValueOnce({ provisioningUri });
    render(<BootstrapWizard />);

    await submitPermanentPassword(user);

    expect(await screen.findByText('绑定信息暂时不可用')).toBeInTheDocument();
    expect(mocks.setBootstrapPassword).toHaveBeenCalledOnce();
    expect(mocks.enrollBootstrapTotp).toHaveBeenCalledOnce();

    await user.click(screen.getByRole('button', { name: '重新获取绑定信息' }));

    expect(
      await screen.findByRole('region', { name: 'TOTP 绑定二维码' }),
    ).toBeInTheDocument();
    expect(mocks.setBootstrapPassword).toHaveBeenCalledOnce();
    expect(mocks.enrollBootstrapTotp).toHaveBeenCalledTimes(2);
  });

  it('bootstrap token 失效时提示联系管理员重新签发临时密码', async () => {
    const user = userEvent.setup();
    mocks.search = `?token=${bootstrapToken}`;
    mocks.setBootstrapPassword.mockRejectedValue(
      new ApiError({
        detail: 'Bootstrap token 已失效',
        status: 401,
        title: 'BOOTSTRAP_TOKEN_EXPIRED',
      }),
    );
    render(<BootstrapWizard />);

    await submitPermanentPassword(user);

    expect(
      await screen.findByText('联系管理员重新签发临时密码'),
    ).toBeInTheDocument();
    expect(screen.getByLabelText('正式密码')).toBeInTheDocument();
  });
});
