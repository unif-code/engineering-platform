import {
  createChallengeToken,
  createEmployeeNo,
  createPassword,
  createProvisioningUri,
  createTotpCode,
  createTotpSecret,
} from '@root/tests/auth-fixtures';
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
  useLocation: vi.fn(),
}));

vi.mock('@umijs/max', () => ({
  history: { push: mocks.push, replace: mocks.replace },
  useLocation: mocks.useLocation,
}));

vi.mock('./service', () => ({
  confirmBootstrapTotp: mocks.confirmBootstrapTotp,
  enrollBootstrapTotp: mocks.enrollBootstrapTotp,
  login: mocks.login,
  setBootstrapPassword: mocks.setBootstrapPassword,
}));

import { BootstrapWizard } from './BootstrapWizard';

function createBootstrapFixture() {
  const employeeNo = createEmployeeNo();
  const secret = createTotpSecret();
  const fixture = {
    code: createTotpCode(),
    employeeNo,
    password: createPassword(),
    provisioningUri: createProvisioningUri(employeeNo, secret),
    secret,
    temporaryPassword: createPassword(),
  };
  mocks.enrollBootstrapTotp.mockResolvedValue({
    provisioningUri: fixture.provisioningUri,
  });
  return fixture;
}

async function submitTemporaryCredentials(
  user: ReturnType<typeof userEvent.setup>,
  credentials: { employeeNo: string; temporaryPassword: string },
) {
  await user.type(screen.getByLabelText('员工编号'), credentials.employeeNo);
  await user.type(
    screen.getByLabelText('临时密码'),
    credentials.temporaryPassword,
  );
  await user.click(screen.getByRole('button', { name: '验证临时密码' }));
}

async function advanceToPassword(
  user: ReturnType<typeof userEvent.setup>,
  credentials: { employeeNo: string; temporaryPassword: string },
) {
  await submitTemporaryCredentials(user, credentials);
  return screen.findByLabelText('正式密码');
}

async function submitPermanentPassword(
  user: ReturnType<typeof userEvent.setup>,
  password: string,
) {
  await user.type(screen.getByLabelText('正式密码'), password);
  await user.type(screen.getByLabelText('确认密码'), password);
  await user.click(screen.getByRole('button', { name: '设置正式密码' }));
}

async function revealManualSecret(
  user: ReturnType<typeof userEvent.setup>,
  region: HTMLElement,
) {
  await user.click(
    within(region).getByRole('button', {
      name: '无法扫码？显示手动密钥',
    }),
  );
}

beforeEach(() => {
  for (const mock of Object.values(mocks)) {
    mock.mockReset();
  }
  mocks.login.mockResolvedValue({ state: 'BOOTSTRAP_REQUIRED' });
  mocks.setBootstrapPassword.mockResolvedValue({ state: 'PASSWORD_SET' });
  mocks.confirmBootstrapTotp.mockResolvedValue({ state: 'AUTHENTICATED' });
  mocks.useLocation.mockReturnValue({ state: undefined });
});

describe('BootstrapWizard', () => {
  it('账号初始化页使用中文标识', () => {
    createBootstrapFixture();
    render(<BootstrapWizard />);

    expect(screen.getByText('账号初始化')).toBeInTheDocument();
    expect(screen.queryByText('ACCOUNT BOOTSTRAP')).not.toBeInTheDocument();
  });

  it('登录已建立 bootstrap Session 时直接设置正式密码且不重复消费临时密码', async () => {
    const fixture = createBootstrapFixture();
    const user = userEvent.setup();
    mocks.useLocation.mockReturnValue({
      state: { bootstrapSessionReady: true },
    });

    render(<BootstrapWizard />);

    expect(screen.getByLabelText('正式密码')).toBeInTheDocument();
    expect(screen.queryByLabelText('临时密码')).not.toBeInTheDocument();
    expect(mocks.login).not.toHaveBeenCalled();
    await waitFor(() =>
      expect(mocks.replace).toHaveBeenCalledWith('/bootstrap'),
    );

    await submitPermanentPassword(user, fixture.password);
    expect(
      await screen.findByRole('region', { name: 'TOTP 绑定二维码' }),
    ).toBeInTheDocument();
    await user.type(screen.getByLabelText('TOTP 动态码'), fixture.code);
    await user.click(screen.getByRole('button', { name: '确认并完成' }));

    await waitFor(() =>
      expect(mocks.confirmBootstrapTotp).toHaveBeenCalledWith({
        code: fixture.code,
      }),
    );
    expect(mocks.setBootstrapPassword).toHaveBeenCalledWith({
      password: fixture.password,
    });
    expect(mocks.login).not.toHaveBeenCalled();
  });

  it('确认密码与正式密码不一致时阻止提交', async () => {
    const fixture = createBootstrapFixture();
    const user = userEvent.setup();
    mocks.useLocation.mockReturnValue({
      state: { bootstrapSessionReady: true },
    });

    render(<BootstrapWizard />);

    await user.type(screen.getByLabelText('正式密码'), fixture.password);
    await user.type(
      screen.getByLabelText('确认密码'),
      `${fixture.password}-different`,
    );
    await user.click(screen.getByRole('button', { name: '设置正式密码' }));

    expect(await screen.findByText('两次输入的密码不一致')).toBeInTheDocument();
    expect(mocks.setBootstrapPassword).not.toHaveBeenCalled();
  });

  it('使用 HttpOnly bootstrap Session 完成密码、TOTP 与重新登录', async () => {
    const fixture = createBootstrapFixture();
    const user = userEvent.setup();
    render(<BootstrapWizard />);

    await advanceToPassword(user, fixture);
    expect(mocks.login).toHaveBeenCalledWith({
      employeeNo: fixture.employeeNo,
      password: fixture.temporaryPassword,
    });
    expect(mocks.replace).toHaveBeenCalledWith('/bootstrap');

    await submitPermanentPassword(user, fixture.password);

    await waitFor(() =>
      expect(mocks.setBootstrapPassword).toHaveBeenCalledWith({
        password: fixture.password,
      }),
    );
    expect(mocks.enrollBootstrapTotp).toHaveBeenCalledWith();
    const qrRegion = await screen.findByRole('region', {
      name: 'TOTP 绑定二维码',
    });
    await revealManualSecret(user, qrRegion);
    expect(within(qrRegion).getByText(fixture.secret)).toBeInTheDocument();

    await user.type(screen.getByLabelText('TOTP 动态码'), fixture.code);
    await user.click(screen.getByRole('button', { name: '确认并完成' }));

    await waitFor(() =>
      expect(mocks.confirmBootstrapTotp).toHaveBeenCalledWith({
        code: fixture.code,
      }),
    );
    await user.click(await screen.findByRole('button', { name: '重新登录' }));
    expect(mocks.push).toHaveBeenCalledWith('/login');
  });

  it('密码更新要求重新登录时不再使用已失效的 bootstrap Session 绑定 TOTP', async () => {
    const fixture = createBootstrapFixture();
    const user = userEvent.setup();
    mocks.setBootstrapPassword.mockResolvedValue({
      state: 'PASSWORD_UPDATED_LOGIN_REQUIRED',
    });
    render(<BootstrapWizard />);

    await advanceToPassword(user, fixture);
    await submitPermanentPassword(user, fixture.password);

    await waitFor(() => expect(mocks.replace).toHaveBeenCalledWith('/login'));
    expect(mocks.enrollBootstrapTotp).not.toHaveBeenCalled();
  });

  it('刷新后不从 URL 恢复 bootstrap 状态，避免泄露会话凭据', () => {
    createBootstrapFixture();
    render(<BootstrapWizard />);

    expect(screen.getByLabelText('员工编号')).toBeInTheDocument();
    expect(screen.queryByLabelText('正式密码')).not.toBeInTheDocument();
  });

  it('临时凭据返回非 BOOTSTRAP 状态时留在步骤一并显示错误', async () => {
    const fixture = createBootstrapFixture();
    const user = userEvent.setup();
    mocks.login.mockResolvedValue({
      challengeToken: createChallengeToken(),
      state: 'TOTP_REQUIRED',
    });
    render(<BootstrapWizard />);

    await submitTemporaryCredentials(user, fixture);

    expect(
      await screen.findByText('当前账号未进入初始化阶段，请返回登录'),
    ).toBeInTheDocument();
    expect(screen.getByLabelText('员工编号')).toBeInTheDocument();
  });

  it('临时凭据网络失败时展示可恢复详情并停留在验证步骤', async () => {
    const fixture = createBootstrapFixture();
    const user = userEvent.setup();
    mocks.login.mockRejectedValue(new Error('认证服务暂时不可用'));
    render(<BootstrapWizard />);

    await submitTemporaryCredentials(user, fixture);

    expect(await screen.findByText('认证服务暂时不可用')).toBeInTheDocument();
    expect(screen.getByLabelText('临时密码')).toBeInTheDocument();
  });

  it('正式密码实时校验 Security Floor', async () => {
    const fixture = createBootstrapFixture();
    const user = userEvent.setup();
    render(<BootstrapWizard />);
    await advanceToPassword(user, fixture);

    await user.type(
      screen.getByLabelText('正式密码'),
      crypto.randomUUID().slice(0, 4).toLowerCase(),
    );

    expect(await screen.findByText('密码至少 15 位')).toBeInTheDocument();
    expect(screen.getByText('密码必须包含大写字母')).toBeInTheDocument();
    expect(screen.getByText('密码必须包含特殊字符')).toBeInTheDocument();
    expect(mocks.setBootstrapPassword).not.toHaveBeenCalled();
  });

  it('服务端 422 字段错误显示在正式密码字段并停留在步骤二', async () => {
    const fixture = createBootstrapFixture();
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
    await advanceToPassword(user, fixture);

    await submitPermanentPassword(user, fixture.password);

    expect(
      await screen.findByText(
        '密码需为 15～64 位，并包含大写字母、小写字母和特殊字符',
      ),
    ).toBeInTheDocument();
    expect(screen.getByLabelText('正式密码')).toBeInTheDocument();
    expect(mocks.enrollBootstrapTotp).not.toHaveBeenCalled();
  });

  it('422 errors 不是数组时只展示 Problem detail，不伪造字段错误', async () => {
    const fixture = createBootstrapFixture();
    const user = userEvent.setup();
    mocks.setBootstrapPassword.mockRejectedValue(
      new ApiError({
        detail: '密码策略响应格式无效',
        errors: { password: 'invalid' },
        status: 422,
      }),
    );
    render(<BootstrapWizard />);
    await advanceToPassword(user, fixture);

    await submitPermanentPassword(user, fixture.password);

    expect(await screen.findByText('密码策略响应格式无效')).toBeInTheDocument();
    expect(screen.queryByText('invalid')).not.toBeInTheDocument();
    expect(screen.getByLabelText('正式密码')).toBeInTheDocument();
  });

  it('422 errors 中非 password/string 条目被忽略', async () => {
    const fixture = createBootstrapFixture();
    const user = userEvent.setup();
    mocks.setBootstrapPassword.mockRejectedValue(
      new ApiError({
        detail: '正式密码未通过校验',
        errors: [
          null,
          { field: 'employeeNo', reason: '员工号不可修改' },
          { field: 'password', reason: 422 },
        ],
        status: 422,
      }),
    );
    render(<BootstrapWizard />);
    await advanceToPassword(user, fixture);

    await submitPermanentPassword(user, fixture.password);

    expect(await screen.findByText('正式密码未通过校验')).toBeInTheDocument();
    expect(screen.queryByText('员工号不可修改')).not.toBeInTheDocument();
    expect(screen.getByLabelText('正式密码')).toBeInTheDocument();
  });

  it('TOTP confirm 错误保留二维码并允许原地重试', async () => {
    const fixture = createBootstrapFixture();
    const user = userEvent.setup();
    mocks.confirmBootstrapTotp.mockRejectedValue(
      new ApiError({
        detail: 'TOTP 验证码错误',
        status: 401,
        title: 'INVALID_TOTP',
      }),
    );
    render(<BootstrapWizard />);
    await advanceToPassword(user, fixture);
    await submitPermanentPassword(user, fixture.password);
    await screen.findByRole('region', { name: 'TOTP 绑定二维码' });

    await user.type(screen.getByLabelText('TOTP 动态码'), fixture.code);
    await user.click(screen.getByRole('button', { name: '确认并完成' }));

    expect(await screen.findByText('TOTP 验证码错误')).toBeInTheDocument();
    expect(
      screen.getByRole('region', { name: 'TOTP 绑定二维码' }),
    ).toBeInTheDocument();
    expect(screen.getByLabelText('TOTP 动态码')).toHaveValue(fixture.code);
  });

  it('TOTP 手动密钥默认隐藏且只在用户请求后显示', async () => {
    const fixture = createBootstrapFixture();
    const user = userEvent.setup();
    render(<BootstrapWizard />);
    await advanceToPassword(user, fixture);
    await submitPermanentPassword(user, fixture.password);

    const qrRegion = await screen.findByRole('region', {
      name: 'TOTP 绑定二维码',
    });
    expect(
      within(qrRegion).queryByText(fixture.secret),
    ).not.toBeInTheDocument();

    await revealManualSecret(user, qrRegion);

    expect(within(qrRegion).getByText(fixture.secret)).toBeInTheDocument();
    expect(
      within(qrRegion).getByRole('button', { name: '隐藏手动密钥' }),
    ).toHaveAttribute('aria-expanded', 'true');
  });

  it('TOTP enroll 失败后独立重试，不重复提交正式密码', async () => {
    const fixture = createBootstrapFixture();
    const user = userEvent.setup();
    mocks.enrollBootstrapTotp
      .mockRejectedValueOnce(new Error('绑定信息暂时不可用'))
      .mockResolvedValueOnce({ provisioningUri: fixture.provisioningUri });
    render(<BootstrapWizard />);
    await advanceToPassword(user, fixture);

    await submitPermanentPassword(user, fixture.password);

    expect(await screen.findByText('绑定信息暂时不可用')).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: '重新获取绑定信息' }));
    expect(
      await screen.findByRole('region', { name: 'TOTP 绑定二维码' }),
    ).toBeInTheDocument();
    expect(mocks.setBootstrapPassword).toHaveBeenCalledOnce();
    expect(mocks.enrollBootstrapTotp).toHaveBeenCalledTimes(2);
  });

  it('TOTP enroll 重试再次失败时更新可见错误且不重复提交密码', async () => {
    const fixture = createBootstrapFixture();
    const user = userEvent.setup();
    mocks.enrollBootstrapTotp
      .mockRejectedValueOnce(new Error('首次绑定失败'))
      .mockRejectedValueOnce(new Error('重试绑定仍失败'));
    render(<BootstrapWizard />);
    await advanceToPassword(user, fixture);

    await submitPermanentPassword(user, fixture.password);
    expect(await screen.findByText('首次绑定失败')).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: '重新获取绑定信息' }));

    expect(await screen.findByText('重试绑定仍失败')).toBeInTheDocument();
    expect(mocks.setBootstrapPassword).toHaveBeenCalledOnce();
    expect(mocks.enrollBootstrapTotp).toHaveBeenCalledTimes(2);
  });

  it('provisioning URI 无 secret 或无法解析时显示完整 URI 作为手工输入值', async () => {
    const fixture = createBootstrapFixture();
    const user = userEvent.setup();
    const malformedProvisioningUri = `invalid-${crypto.randomUUID()}`;
    mocks.enrollBootstrapTotp.mockResolvedValue({
      provisioningUri: malformedProvisioningUri,
    });
    render(<BootstrapWizard />);
    await advanceToPassword(user, fixture);

    await submitPermanentPassword(user, fixture.password);

    const qrRegion = await screen.findByRole('region', {
      name: 'TOTP 绑定二维码',
    });
    await revealManualSecret(user, qrRegion);
    expect(
      within(qrRegion).getByText(malformedProvisioningUri),
    ).toBeInTheDocument();
  });

  it('合法 provisioning URI 缺少 secret 时也显示完整 URI', async () => {
    const fixture = createBootstrapFixture();
    const user = userEvent.setup();
    const provisioningUri = `otpauth://totp/platform-${crypto.randomUUID()}?issuer=EngineeringPlatform`;
    mocks.enrollBootstrapTotp.mockResolvedValue({ provisioningUri });
    render(<BootstrapWizard />);
    await advanceToPassword(user, fixture);

    await submitPermanentPassword(user, fixture.password);

    const qrRegion = await screen.findByRole('region', {
      name: 'TOTP 绑定二维码',
    });
    await revealManualSecret(user, qrRegion);
    expect(within(qrRegion).getByText(provisioningUri)).toBeInTheDocument();
  });

  it('bootstrap Session 失效时提示联系管理员重新签发临时密码', async () => {
    const fixture = createBootstrapFixture();
    const user = userEvent.setup();
    mocks.setBootstrapPassword.mockRejectedValue(
      new ApiError({
        detail: 'Bootstrap Session 已失效',
        status: 401,
        title: 'BOOTSTRAP_SESSION_EXPIRED',
      }),
    );
    render(<BootstrapWizard />);
    await advanceToPassword(user, fixture);

    await submitPermanentPassword(user, fixture.password);

    expect(
      await screen.findByText('联系管理员重新签发临时密码'),
    ).toBeInTheDocument();
  });

  it('正式密码提交收到通用认证失败时展示中文恢复建议与请求编号', async () => {
    const fixture = createBootstrapFixture();
    const user = userEvent.setup();
    mocks.setBootstrapPassword.mockRejectedValue(
      new ApiError({
        requestId: 'req-bootstrap-generic',
        status: 401,
        title: 'Authentication failed',
      }),
    );
    render(<BootstrapWizard />);
    await advanceToPassword(user, fixture);

    await submitPermanentPassword(user, fixture.password);

    expect(
      await screen.findByText(
        '初始化会话已失效，请联系管理员重新签发临时密码（请求编号：req-bootstrap-generic）',
      ),
    ).toBeInTheDocument();
    expect(screen.queryByText('Authentication failed')).not.toBeInTheDocument();
    expect(screen.getByLabelText('正式密码')).toBeInTheDocument();
    expect(mocks.enrollBootstrapTotp).not.toHaveBeenCalled();
  });
});
