import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  committedMe: null as null | { employeeId: string; name: string },
  fetchMe: vi.fn(),
  fetchNavigation: vi.fn(),
  login: vi.fn(),
  messageError: vi.fn(),
  push: vi.fn(),
  pushObservedMe: vi.fn(),
  setInitialState: vi.fn(),
}));

vi.mock('@/features/auth', () => ({
  fetchMe: mocks.fetchMe,
  login: mocks.login,
}));

vi.mock('@/features/navigation', () => ({
  fetchNavigation: mocks.fetchNavigation,
}));

vi.mock('@umijs/max', async () => {
  const { useCallback, useEffect, useState } = await import('react');
  type InitialState = {
    me: null | { employeeId: string; name: string };
    navigation: Array<{ routeKey: string; name: string; order: number }>;
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
        mocks.committedMe = initialState?.me ?? null;
      }, [initialState]);
      const setInitialState = useCallback(async (nextState: InitialState) => {
        const completion = mocks.setInitialState(nextState);
        commitInitialState(nextState);
        await completion;
      }, []);
      return { initialState, setInitialState };
    },
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

const me = { employeeId: '00000000', name: 'V0.1 Stub' };
const navigation = [
  { routeKey: 'home', name: '首页', order: 1 },
  { routeKey: 'admin', name: '管理后台', order: 2 },
];
const loginInput = {
  employeeId: '00000000',
  password: 'secret',
  totp: '123456',
};

function createDeferred() {
  let resolve!: () => void;
  const promise = new Promise<void>((resolvePromise) => {
    resolve = resolvePromise;
  });
  return { promise, resolve };
}

function submitForm(input = loginInput) {
  fireEvent.change(screen.getByLabelText('员工编号'), {
    target: { value: input.employeeId },
  });
  fireEvent.change(screen.getByLabelText('密码'), {
    target: { value: input.password },
  });
  fireEvent.change(screen.getByLabelText('TOTP 动态码'), {
    target: { value: input.totp },
  });
  fireEvent.click(screen.getByRole('button', { name: /登\s*录/ }));
}

beforeEach(() => {
  for (const mock of [
    mocks.fetchMe,
    mocks.fetchNavigation,
    mocks.login,
    mocks.messageError,
    mocks.push,
    mocks.pushObservedMe,
    mocks.setInitialState,
  ]) {
    mock.mockReset();
  }
  mocks.committedMe = null;
  mocks.login.mockResolvedValue(undefined);
  mocks.fetchMe.mockResolvedValue(me);
  mocks.fetchNavigation.mockResolvedValue(navigation);
  mocks.setInitialState.mockResolvedValue(undefined);
});

describe('LoginPage', () => {
  it('渲染三个带标签的字段与登录按钮', () => {
    render(<LoginPage />);

    expect(screen.getByLabelText('员工编号')).toBeInTheDocument();
    expect(screen.getByLabelText('密码')).toBeInTheDocument();
    expect(screen.getByLabelText('TOTP 动态码')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /登\s*录/ })).toBeInTheDocument();
  });

  it('合法提交刷新完整初始状态后才进入首页', async () => {
    const stateRefresh = createDeferred();
    mocks.setInitialState.mockReturnValueOnce(stateRefresh.promise);
    render(<LoginPage />);

    submitForm();

    await waitFor(() => expect(mocks.login).toHaveBeenCalledWith(loginInput));
    await waitFor(() => {
      expect(mocks.fetchMe).toHaveBeenCalledOnce();
      expect(mocks.fetchNavigation).toHaveBeenCalledOnce();
      expect(mocks.setInitialState).toHaveBeenCalledWith({ me, navigation });
    });
    expect(mocks.login.mock.invocationCallOrder[0]).toBeLessThan(
      mocks.fetchMe.mock.invocationCallOrder[0],
    );
    expect(mocks.login.mock.invocationCallOrder[0]).toBeLessThan(
      mocks.fetchNavigation.mock.invocationCallOrder[0],
    );
    expect(mocks.push).not.toHaveBeenCalled();

    stateRefresh.resolve();

    await waitFor(() => expect(mocks.push).toHaveBeenCalledWith('/home'));
  });

  it('只在 initialState 已完成 React commit 后进入首页', async () => {
    render(<LoginPage />);

    submitForm();

    await waitFor(() => expect(mocks.push).toHaveBeenCalledWith('/home'));
    expect(mocks.pushObservedMe).toHaveBeenCalledWith(me);
  });

  it('登录失败展示原始错误且不刷新状态、不导航', async () => {
    mocks.login.mockRejectedValueOnce(new Error('账号或凭据错误'));
    render(<LoginPage />);

    submitForm();

    await waitFor(() =>
      expect(mocks.messageError).toHaveBeenCalledWith('账号或凭据错误'),
    );
    expect(mocks.fetchMe).not.toHaveBeenCalled();
    expect(mocks.fetchNavigation).not.toHaveBeenCalled();
    expect(mocks.setInitialState).not.toHaveBeenCalled();
    expect(mocks.push).not.toHaveBeenCalled();
  });

  it('登录后无法取得当前用户时 fail closed', async () => {
    mocks.fetchMe.mockResolvedValueOnce(null);
    render(<LoginPage />);

    submitForm();

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
      input: { ...loginInput, employeeId: 'abcdefgh' },
      message: '员工编号为 8 位数字',
    },
    {
      caseName: '6 位非数字动态码',
      input: { ...loginInput, totp: 'abcdef' },
      message: '动态码为 6 位数字',
    },
  ])('$caseName由真实表单拦截且不调用 login', async ({ input, message }) => {
    render(<LoginPage />);

    submitForm(input);

    expect(await screen.findByText(message)).toBeInTheDocument();
    expect(mocks.login).not.toHaveBeenCalled();
  });
});
