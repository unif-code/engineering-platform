import {
  createAccountId,
  createChallengeToken,
  createEmployeeNo,
  createPassword,
  createTotpCode,
  createWorkspaceId,
} from '@root/tests/auth-fixtures';
import {
  fireEvent,
  render,
  screen,
  waitFor,
  within,
} from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { ThemeProvider } from '@/features/theme';

const mocks = vi.hoisted(() => ({
  committedMe: null as null | {
    accountId: string | null;
    employeeId: string;
    name: string;
  },
  fetchNavigation: vi.fn(),
  getCurrentUser: vi.fn(),
  locationSearch: '',
  messageError: vi.fn(),
  push: vi.fn(),
  pushObservedMe: vi.fn(),
  setInitialState: vi.fn(),
  startLogin: vi.fn(),
  verifyTotp: vi.fn(),
}));

vi.mock('@/services/auth', () => ({
  getCurrentUser: mocks.getCurrentUser,
  startLogin: mocks.startLogin,
  verifyTotp: mocks.verifyTotp,
}));

vi.mock('@/features/navigation', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@/features/navigation')>()),
  fetchNavigation: mocks.fetchNavigation,
}));

vi.mock('@umijs/max', async () => {
  const { useCallback, useEffect, useState } = await import('react');
  type InitialState = {
    capabilities: string[];
    navigation: Array<{
      meta: Record<string, unknown>;
      name: string;
      order: number;
      routeKey: string;
    }>;
    principal: null | {
      accountId: string | null;
      employeeId: string;
      name: string;
    };
    scopedCapabilities: Array<{
      capability: string;
      scopeId: string | null;
      scopeType: 'PLATFORM' | 'WORKSPACE';
    }>;
    workspaces: Array<{ id: string; name: string; ownerId: string }>;
  };

  return {
    history: {
      push: (path: string) => {
        mocks.push(path);
        mocks.pushObservedMe(mocks.committedMe);
      },
    },
    useModel: () => {
      const [initialState, commitInitialState] = useState<InitialState>();
      useEffect(() => {
        mocks.committedMe = initialState?.principal ?? null;
      }, [initialState]);
      const setInitialState = useCallback(async (nextState: InitialState) => {
        const completion = mocks.setInitialState(nextState);
        commitInitialState(nextState);
        await completion;
      }, []);
      return { initialState, setInitialState };
    },
    useLocation: () => ({
      hash: '',
      pathname: '/login',
      search: mocks.locationSearch,
    }),
    useAntdConfigSetter: () => vi.fn(),
  };
});

vi.mock('antd', async (importOriginal) => {
  const actual = await importOriginal<typeof import('antd')>();
  return {
    ...actual,
    App: Object.assign(actual.App, {
      useApp: () => ({ message: { error: mocks.messageError } }),
    }),
  };
});

import LoginPage from './index';

const navigation = [
  {
    meta: {},
    name: '首页',
    order: 1,
    routeKey: 'home',
  },
  {
    meta: {},
    name: '管理后台',
    order: 2,
    routeKey: 'admin',
  },
];
function createLoginFixture() {
  const accountId = createAccountId();
  const employeeNo = createEmployeeNo();
  const workspaceId = createWorkspaceId();
  const me = {
    accountId,
    capabilities: ['identity.account.manage', 'audit.read'],
    employeeId: employeeNo,
    name: '平台管理员',
    scopedCapabilities: [
      {
        capability: 'requirement.create',
        scopeId: workspaceId,
        scopeType: 'WORKSPACE' as const,
      },
    ],
    workspaces: [{ id: workspaceId, name: '研发一组', ownerId: accountId }],
  };
  const fixture = {
    challengeToken: createChallengeToken(),
    code: createTotpCode(),
    initialState: {
      capabilities: me.capabilities,
      navigation,
      principal: {
        accountId: me.accountId,
        employeeId: me.employeeId,
        name: me.name,
      },
      scopedCapabilities: me.scopedCapabilities,
      workspaces: me.workspaces,
    },
    loginInput: { employeeNo, password: createPassword() },
    me,
  };
  mocks.startLogin.mockResolvedValue({
    challengeToken: fixture.challengeToken,
    state: 'TOTP_REQUIRED',
  });
  mocks.verifyTotp.mockResolvedValue({ state: 'AUTHENTICATED' });
  mocks.getCurrentUser.mockResolvedValue(fixture.me);
  mocks.fetchNavigation.mockResolvedValue(navigation);
  return fixture;
}

function createDeferred() {
  let resolve!: () => void;
  const promise = new Promise<void>((resolvePromise) => {
    resolve = resolvePromise;
  });
  return { promise, resolve };
}

function renderLoginPage() {
  return render(
    <ThemeProvider>
      <LoginPage />
    </ThemeProvider>,
  );
}

function submitCredentials(input: { employeeNo: string; password: string }) {
  fireEvent.change(screen.getByLabelText('员工编号'), {
    target: { value: input.employeeNo },
  });
  fireEvent.change(screen.getByLabelText('密码'), {
    target: { value: input.password },
  });
  fireEvent.click(screen.getByRole('button', { name: /继\s*续/ }));
}

async function submitForm(
  input: { employeeNo: string; password: string },
  totp: string,
) {
  submitCredentials(input);
  const totpInput = await screen.findByLabelText('TOTP 动态码');
  fireEvent.change(totpInput, { target: { value: totp } });
  fireEvent.click(
    screen.getByRole('button', { name: /验\s*证\s*并\s*登\s*录/ }),
  );
}

beforeEach(() => {
  for (const mock of [
    mocks.fetchNavigation,
    mocks.getCurrentUser,
    mocks.messageError,
    mocks.push,
    mocks.pushObservedMe,
    mocks.setInitialState,
    mocks.startLogin,
    mocks.verifyTotp,
  ]) {
    mock.mockReset();
  }
  mocks.committedMe = null;
  mocks.locationSearch = '';
  mocks.setInitialState.mockResolvedValue(undefined);
});

describe('LoginPage', () => {
  it('按原型呈现品牌、Hero、交付链路和版本', () => {
    createLoginFixture();
    renderLoginPage();

    expect(
      screen.getByRole('img', { name: '研发协作平台' }),
    ).toBeInTheDocument();
    expect(screen.queryByText('IP')).not.toBeInTheDocument();
    expect(screen.getByText('集团内网 · V0.2')).toBeInTheDocument();

    const heading = screen.getByRole('heading', {
      name: /需求到合并，\s*一条\s*可治理\s*的\s*AI 交付链路。/,
    });
    expect(within(heading).getByText('可治理')).toBeInTheDocument();

    const deliveryFlow = screen.getByRole('list', {
      name: '研发交付链路',
    });
    for (const label of [
      '需求对齐',
      'Spec / Plan 规格计划',
      '开发',
      'Review 评审',
      'MR 合并',
    ]) {
      expect(within(deliveryFlow).getByText(label)).toBeInTheDocument();
    }

    expect(
      screen.getByText('© 2026 集团企业开发部 · 仅限内网使用'),
    ).toBeInTheDocument();
    expect(
      screen.queryByRole('button', { name: '主题设置' }),
    ).not.toBeInTheDocument();
  });

  it('分步呈现既有认证字段且不同时暴露凭据与动态码', async () => {
    const fixture = createLoginFixture();
    renderLoginPage();

    expect(screen.getByLabelText('员工编号')).toBeInTheDocument();
    expect(screen.getByLabelText('密码')).toBeInTheDocument();
    expect(screen.queryByLabelText('TOTP 动态码')).not.toBeInTheDocument();
    expect(
      Array.from(document.querySelectorAll('form label'), (label) =>
        label.textContent?.trim(),
      ),
    ).toEqual(['员工编号', '密码']);

    submitCredentials(fixture.loginInput);

    expect(await screen.findByLabelText('TOTP 动态码')).toBeInTheDocument();
    expect(screen.queryByLabelText('员工编号')).not.toBeInTheDocument();
    expect(screen.queryByLabelText('密码')).not.toBeInTheDocument();
    expect(screen.queryByText(/重置密码/)).not.toBeInTheDocument();
  });

  it('渲染凭据步骤与继续按钮', () => {
    createLoginFixture();
    renderLoginPage();

    expect(screen.getByLabelText('员工编号')).toBeInTheDocument();
    expect(screen.getByLabelText('密码')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /继\s*续/ })).toBeInTheDocument();
  });

  it('合法提交刷新完整初始状态后才进入首页', async () => {
    const fixture = createLoginFixture();
    const stateRefresh = createDeferred();
    mocks.setInitialState.mockReturnValueOnce(stateRefresh.promise);
    renderLoginPage();

    await submitForm(fixture.loginInput, fixture.code);

    await waitFor(() =>
      expect(mocks.startLogin).toHaveBeenCalledWith(fixture.loginInput),
    );
    expect(mocks.verifyTotp).toHaveBeenCalledWith({
      challengeToken: fixture.challengeToken,
      code: fixture.code,
    });
    await waitFor(() => {
      expect(mocks.getCurrentUser).toHaveBeenCalledOnce();
      expect(mocks.fetchNavigation).toHaveBeenCalledOnce();
      expect(mocks.setInitialState).toHaveBeenCalledWith(fixture.initialState);
    });
    expect(mocks.verifyTotp.mock.invocationCallOrder[0]).toBeLessThan(
      mocks.getCurrentUser.mock.invocationCallOrder[0],
    );
    expect(mocks.verifyTotp.mock.invocationCallOrder[0]).toBeLessThan(
      mocks.fetchNavigation.mock.invocationCallOrder[0],
    );
    expect(mocks.push).not.toHaveBeenCalled();

    stateRefresh.resolve();

    await waitFor(() => expect(mocks.push).toHaveBeenCalledWith('/home'));
  });

  it('只在 initialState 已完成 React commit 后进入首页', async () => {
    const fixture = createLoginFixture();
    renderLoginPage();

    await submitForm(fixture.loginInput, fixture.code);

    await waitFor(() => expect(mocks.push).toHaveBeenCalledWith('/home'));
    expect(mocks.pushObservedMe).toHaveBeenCalledWith(
      fixture.initialState.principal,
    );
  });

  it('登录后只接受经过校验的站内 redirect', async () => {
    const fixture = createLoginFixture();
    mocks.locationSearch =
      '?redirect=%2Fadmin%2Fusers%3Fstatus%3Denabled%23member';
    renderLoginPage();

    await submitForm(fixture.loginInput, fixture.code);

    await waitFor(() =>
      expect(mocks.push).toHaveBeenCalledWith(
        '/admin/users?status=enabled#member',
      ),
    );
  });

  it('initialState 提交失败时展示原始错误并 fail closed', async () => {
    const fixture = createLoginFixture();
    mocks.setInitialState.mockRejectedValueOnce(new Error('初始状态提交失败'));
    renderLoginPage();

    await submitForm(fixture.loginInput, fixture.code);

    expect(await screen.findByText('初始状态提交失败')).toBeInTheDocument();
    expect(mocks.push).not.toHaveBeenCalledWith('/home');
  });

  it('登录失败展示原始错误且不刷新状态、不导航', async () => {
    const fixture = createLoginFixture();
    mocks.startLogin.mockRejectedValueOnce(new Error('账号或凭据错误'));
    renderLoginPage();

    submitCredentials(fixture.loginInput);

    expect(await screen.findByText('账号或凭据错误')).toBeInTheDocument();
    expect(mocks.messageError).not.toHaveBeenCalled();
    expect(mocks.getCurrentUser).not.toHaveBeenCalled();
    expect(mocks.fetchNavigation).not.toHaveBeenCalled();
    expect(mocks.setInitialState).not.toHaveBeenCalled();
    expect(mocks.push).not.toHaveBeenCalled();
  });

  it('登录后无法取得当前用户时 fail closed', async () => {
    const fixture = createLoginFixture();
    mocks.getCurrentUser.mockResolvedValueOnce(null);
    renderLoginPage();

    await submitForm(fixture.loginInput, fixture.code);

    await waitFor(() =>
      expect(mocks.messageError).toHaveBeenCalledWith('登录状态刷新失败'),
    );
    expect(mocks.fetchNavigation).toHaveBeenCalledOnce();
    expect(mocks.setInitialState).not.toHaveBeenCalled();
    expect(mocks.push).not.toHaveBeenCalled();
  });

  it.each([
    {
      caseName: '8 位非数字员工编号',
      invalidEmployeeNo: true,
      message: '员工编号为 8 位数字',
    },
    {
      caseName: '6 位非数字动态码',
      message: '动态码为 6 位数字',
      invalidEmployeeNo: false,
    },
  ])(
    '$caseName由真实表单拦截且不调用对应 service',
    async ({ invalidEmployeeNo, message }) => {
      const fixture = createLoginFixture();
      const input = invalidEmployeeNo
        ? { ...fixture.loginInput, employeeNo: 'abcdefgh' }
        : fixture.loginInput;
      renderLoginPage();

      if (invalidEmployeeNo) {
        submitCredentials(input);
      } else {
        await submitForm(input, 'abcdef');
      }

      expect(await screen.findByText(message)).toBeInTheDocument();
      if (invalidEmployeeNo) {
        expect(mocks.startLogin).not.toHaveBeenCalled();
      } else {
        expect(mocks.startLogin).toHaveBeenCalledWith(input);
        expect(mocks.verifyTotp).not.toHaveBeenCalled();
      }
    },
  );
});
