import {
  act,
  fireEvent,
  render,
  screen,
  waitFor,
  within,
} from '@testing-library/react';
import userEvent, { type UserEvent } from '@testing-library/user-event';
import { App, ConfigProvider } from 'antd';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const requestMock = vi.hoisted(() => vi.fn());

vi.mock('@umijs/max', () => ({
  defineMock: <T,>(routes: T) => routes,
  request: requestMock,
}));

import { createAdminAccountsMock } from '../../../mock/adminAccounts';
import AdminUsersPage from '.';

const PRO_TABLE_INITIAL_ROW_WAIT_OPTIONS = { timeout: 5_000 };

interface MockRequest {
  body?: unknown;
  headers: Record<string, string>;
  params: Record<string, string>;
  query: Record<string, string>;
}

interface MockResponse {
  body?: unknown;
  ended: boolean;
  headers: Headers;
  statusCode: number;
  end: () => MockResponse;
  json: (body: unknown) => MockResponse;
  setHeader: (name: string, value: string) => MockResponse;
  status: (statusCode: number) => MockResponse;
}

type MockRouteHandler = (
  request: MockRequest,
  response: MockResponse,
) => Promise<void> | void;

type MockRoutes = Record<string, unknown>;

let routes: MockRoutes;

interface MockRouteMatch {
  key: string;
  params: Record<string, string>;
}

const routeFor = (method: string, path: string): MockRouteMatch => {
  const exact = `${method} ${path}`;
  if (typeof routes[exact] === 'function') {
    return { key: exact, params: {} };
  }

  for (const key of Object.keys(routes)) {
    const [routeMethod, routePath] = key.split(' ');
    if (routeMethod !== method || !routePath?.includes(':id')) {
      continue;
    }
    const pattern = new RegExp(
      `^${routePath.replace(':id', '([^/]+)').replaceAll('/', '\\/')}$`,
    );
    const match = path.match(pattern);
    if (match?.[1]) {
      return { key, params: { id: decodeURIComponent(match[1]) } };
    }
  }
  throw new Error(`Missing admin account mock route: ${exact}`);
};

async function requestThroughMock(
  path: string,
  options: {
    data?: unknown;
    headers?: Record<string, string>;
    method?: string;
    params?: Record<string, unknown>;
  } = {},
) {
  const method = options.method ?? 'GET';
  const route = routeFor(method, path);
  const response: MockResponse = {
    ended: false,
    headers: new Headers(),
    statusCode: 200,
    end() {
      this.ended = true;
      return this;
    },
    json(body) {
      this.body = body;
      return this;
    },
    setHeader(name, value) {
      this.headers.set(name, value);
      return this;
    },
    status(statusCode) {
      this.statusCode = statusCode;
      return this;
    },
  };
  const query = Object.fromEntries(
    Object.entries(options.params ?? {}).flatMap(([key, value]) =>
      value === undefined ? [] : [[key, String(value)]],
    ),
  );

  await (routes[route.key] as MockRouteHandler)(
    {
      body: options.data,
      headers: options.headers ?? {},
      params: route.params,
      query,
    },
    response,
  );

  if (response.statusCode >= 400) {
    throw {
      response: {
        data: response.body,
        status: response.statusCode,
        statusText: String(response.statusCode),
      },
    };
  }
  return response.ended ? undefined : response.body;
}

function renderPage() {
  return render(
    <ConfigProvider theme={{ token: { motion: false } }}>
      <App>
        <AdminUsersPage />
      </App>
    </ConfigProvider>,
  );
}

async function selectOption(
  user: UserEvent,
  label: string,
  option: string,
  container?: HTMLElement,
) {
  const query = container === undefined ? screen : within(container);
  await user.click(query.getByRole('combobox', { name: label }));
  await user.click(await screen.findByRole('option', { name: option }));
}

async function fillCreateForm(
  user: UserEvent,
  values: {
    displayName: string;
    employeeNo: string;
    profession?: string;
    reason: string;
  },
) {
  await screen.findByText('共 6 个账号', undefined, {
    timeout: PRO_TABLE_INITIAL_ROW_WAIT_OPTIONS.timeout,
  });
  const createButton = screen.getByRole('button', { name: '新增账号' });
  await user.click(createButton);
  expect(createButton).toHaveAttribute('aria-expanded', 'true');
  const dialog = await screen.findByRole('dialog', { name: '新增账号' });
  expect(dialog).toBeVisible();
  await user.type(
    within(dialog).getByRole('textbox', { name: '员工编号' }),
    values.employeeNo,
  );
  await user.type(
    within(dialog).getByRole('textbox', { name: '姓名' }),
    values.displayName,
  );
  if (values.profession) {
    await selectOption(user, '专业分类', values.profession, dialog);
  }
  await user.type(
    within(dialog).getByRole('textbox', { name: '创建原因' }),
    values.reason,
  );
  return dialog;
}

async function submitAction(
  user: UserEvent,
  rowName: RegExp,
  buttonName: string,
  dialogName: string,
  reason: string,
) {
  await screen.findByText('共 6 个账号', undefined, {
    timeout: PRO_TABLE_INITIAL_ROW_WAIT_OPTIONS.timeout,
  });
  const row = await screen.findByRole(
    'row',
    { name: rowName },
    PRO_TABLE_INITIAL_ROW_WAIT_OPTIONS,
  );
  await user.click(within(row).getByRole('button', { name: buttonName }));
  const dialog = await screen.findByRole('dialog', { name: dialogName });
  await user.type(
    within(dialog).getByRole('textbox', { name: '操作原因' }),
    reason,
  );
  await user.click(
    within(dialog).getByRole('button', {
      name: new RegExp(`确认${buttonName}`),
    }),
  );
}

beforeEach(() => {
  routes = createAdminAccountsMock();
  requestMock.mockReset();
  requestMock.mockImplementation(requestThroughMock);
});

describe('AdminUsersPage', () => {
  it('呈现服务端账号、筛选工具栏和 1120px 横向表格', async () => {
    renderPage();

    expect(
      screen.getByRole('toolbar', { name: '账号筛选与操作' }),
    ).toBeInTheDocument();
    expect(
      await screen.findByRole(
        'row',
        { name: /示例用户甲/ },
        PRO_TABLE_INITIAL_ROW_WAIT_OPTIONS,
      ),
    ).toBeInTheDocument();
    expect(screen.getByRole('row', { name: /示例用户乙/ })).toBeInTheDocument();
    expect(screen.getByRole('row', { name: /示例用户丙/ })).toBeInTheDocument();
    expect(screen.getByRole('row', { name: /示例用户丁/ })).toBeInTheDocument();
    expect(screen.getByRole('row', { name: /示例用户戊/ })).toHaveTextContent(
      '受限',
    );
    expect(screen.getByRole('row', { name: /示例用户己/ })).toHaveTextContent(
      '待初始化',
    );

    const table = screen.getByRole('table');
    expect(table).toHaveStyle({ width: '1120px' });
    expect(within(table).getAllByRole('row')).toHaveLength(7);
    expect(screen.getByText('共 6 个账号')).toBeInTheDocument();
    expect(screen.queryByText(/静态原型操作/)).not.toBeInTheDocument();
  });

  it('可组合员工号、姓名、状态与专业分类服务端筛选', async () => {
    const user = userEvent.setup();
    renderPage();
    await screen.findByRole(
      'row',
      { name: /示例用户甲/ },
      PRO_TABLE_INITIAL_ROW_WAIT_OPTIONS,
    );

    await user.type(
      screen.getByRole('searchbox', { name: '搜索员工编号' }),
      '10000004',
    );
    await user.keyboard('{Enter}');
    await user.type(
      screen.getByRole('searchbox', { name: '搜索姓名' }),
      '示例用户丁',
    );
    await user.keyboard('{Enter}');
    await selectOption(user, '账号状态', '已启用');
    await selectOption(user, '专业分类', '研发');

    await waitFor(() => {
      expect(
        screen.getByRole('row', { name: /示例用户丁/ }),
      ).toBeInTheDocument();
      expect(
        screen.queryByRole('row', { name: /示例用户甲/ }),
      ).not.toBeInTheDocument();
    });
    expect(screen.getByText('共 1 个账号')).toBeInTheDocument();

    await user.clear(screen.getByRole('searchbox', { name: '搜索员工编号' }));
    await user.clear(screen.getByRole('searchbox', { name: '搜索姓名' }));
    await selectOption(user, '账号状态', '全部状态');
    await selectOption(user, '专业分类', '全部专业分类');
    expect(await screen.findByText('共 6 个账号')).toBeInTheDocument();
  });

  it('较慢的旧请求返回后不会覆盖最新筛选结果与 total', async () => {
    const user = userEvent.setup();
    const initialPage = await requestThroughMock('/api/v1/admin/accounts', {
      params: { page: 1, pageSize: 10 },
    });
    let resolveInitialRequest: (value: unknown) => void = () => {
      throw new Error('initial account request was not started');
    };
    requestMock.mockImplementationOnce(
      () =>
        new Promise((resolve) => {
          resolveInitialRequest = resolve;
        }),
    );
    renderPage();

    await user.type(
      screen.getByRole('searchbox', { name: '搜索员工编号' }),
      '10000004',
    );
    await user.keyboard('{Enter}');
    expect(
      await screen.findByRole(
        'row',
        { name: /示例用户丁/ },
        PRO_TABLE_INITIAL_ROW_WAIT_OPTIONS,
      ),
    ).toBeInTheDocument();
    expect(screen.getByText('共 1 个账号')).toBeInTheDocument();

    await act(async () => {
      resolveInitialRequest(initialPage);
    });
    await waitFor(() => {
      expect(screen.getByText('共 1 个账号')).toBeInTheDocument();
      expect(
        screen.queryByRole('row', { name: /示例用户甲/ }),
      ).not.toBeInTheDocument();
    });
  });

  it('筛选已提交但新请求尚未启动时忽略旧请求的 Problem', async () => {
    const user = userEvent.setup();
    let rejectInitialRequest: (reason: unknown) => void = () => {
      throw new Error('initial account request was not started');
    };
    requestMock.mockImplementationOnce(
      () =>
        new Promise((_resolve, reject) => {
          rejectInitialRequest = reject;
        }),
    );
    renderPage();

    const employeeNoSearch = screen.getByRole('searchbox', {
      name: '搜索员工编号',
    });
    await user.type(employeeNoSearch, '10000004');
    fireEvent.keyDown(employeeNoSearch, { code: 'Enter', key: 'Enter' });
    expect(requestMock).toHaveBeenCalledTimes(1);

    await act(async () => {
      rejectInitialRequest({
        response: {
          data: {
            type: 'https://engineering-platform.example/problems/forbidden',
            title: 'FORBIDDEN',
            status: 403,
            detail: '旧筛选请求已失效',
            requestId: 'stale-admin-account-request',
          },
          status: 403,
          statusText: '403',
        },
      });
    });

    expect(
      await screen.findByRole(
        'row',
        { name: /示例用户丁/ },
        PRO_TABLE_INITIAL_ROW_WAIT_OPTIONS,
      ),
    ).toBeInTheDocument();
    expect(screen.getByText('共 1 个账号')).toBeInTheDocument();
    expect(screen.queryByText(/旧筛选请求已失效/)).not.toBeInTheDocument();
  });

  it('页面卸载后忽略仍在途请求的 Problem', async () => {
    let rejectPendingRequest: (reason: unknown) => void = () => {
      throw new Error('pending account request was not started');
    };
    requestMock.mockImplementationOnce(
      () =>
        new Promise((_resolve, reject) => {
          rejectPendingRequest = reject;
        }),
    );
    const pageShell = (showPage: boolean) => (
      <ConfigProvider theme={{ token: { motion: false } }}>
        <App>{showPage ? <AdminUsersPage /> : null}</App>
      </ConfigProvider>
    );
    const view = render(pageShell(true));
    await waitFor(() => {
      expect(requestMock).toHaveBeenCalledTimes(1);
    });

    view.rerender(pageShell(false));
    await act(async () => {
      rejectPendingRequest({
        response: {
          data: {
            type: 'https://engineering-platform.example/problems/forbidden',
            title: 'FORBIDDEN',
            status: 403,
            detail: '页面卸载后的旧请求',
            requestId: 'unmounted-admin-account-request',
          },
          status: 403,
          statusText: '403',
        },
      });
    });

    expect(screen.queryByText(/页面卸载后的旧请求/)).not.toBeInTheDocument();
  });

  it('新增成功展示仅一次临时密码，复制后关闭即不可再取', async () => {
    const user = userEvent.setup();
    const writeText = vi.fn().mockResolvedValue(undefined);
    Object.defineProperty(navigator, 'clipboard', {
      configurable: true,
      value: { writeText },
    });
    renderPage();
    await screen.findByRole('table');

    const drawer = await fillCreateForm(user, {
      displayName: '临时用户',
      employeeNo: '00000009',
      profession: '测试',
      reason: '项目入职',
    });
    await user.click(within(drawer).getByRole('button', { name: /创\s*建/ }));

    const receipt = await screen.findByRole('dialog', {
      name: '账号创建成功',
    });
    expect(receipt).toHaveTextContent('仅此一次，请立即传达');
    expect(receipt).toHaveTextContent('00000009');
    const temporaryPassword =
      within(receipt).getByText(/^Temp![\da-f-]{36}$/).textContent;
    expect(temporaryPassword).toBeTruthy();
    await user.click(
      within(receipt).getByRole('button', { name: '复制临时密码' }),
    );
    expect(writeText).toHaveBeenCalledWith(temporaryPassword);

    await user.click(
      within(receipt).getByRole('button', { name: '我已安全记录' }),
    );
    await waitFor(() => {
      expect(screen.queryByText(/^Temp![\da-f-]{36}$/)).not.toBeInTheDocument();
    });
    expect(
      await screen.findByRole('row', { name: /临时用户/ }),
    ).toHaveTextContent('00000009');
  });

  it('重复员工号保留创建抽屉并展示 409 detail 与 requestId', async () => {
    const user = userEvent.setup();
    renderPage();
    await screen.findByRole('table');

    const drawer = await fillCreateForm(user, {
      displayName: '重复用户',
      employeeNo: '10000001',
      reason: '重复测试',
    });
    await user.click(within(drawer).getByRole('button', { name: /创\s*建/ }));

    expect(await screen.findByText(/员工号 10000001 已存在/)).toHaveTextContent(
      /requestId: mock-admin-account-/,
    );
    expect(
      screen.getByRole('dialog', { name: '新增账号' }),
    ).toBeInTheDocument();
    expect(
      screen.queryByRole('dialog', { name: '账号创建成功' }),
    ).not.toBeInTheDocument();
  });

  it('服务端返回 422 时保留创建抽屉并展示 detail 与 requestId 原文', async () => {
    const user = userEvent.setup();
    routes = {
      ...routes,
      'POST /api/v1/admin/accounts': (
        _request: MockRequest,
        response: MockResponse,
      ) => {
        response.status(422);
        response.setHeader('Content-Type', 'application/problem+json');
        response.json({
          type: 'https://engineering-platform.example/problems/validation_error',
          title: 'VALIDATION_ERROR',
          status: 422,
          detail: '该专业分类当前不可用于新账号',
          requestId: 'mock-admin-account-page-422',
        });
      },
    };
    renderPage();
    await screen.findByRole('table');

    const drawer = await fillCreateForm(user, {
      displayName: '服务端校验用户',
      employeeNo: '10000009',
      profession: '测试',
      reason: '验证服务端校验失败',
    });
    await user.click(within(drawer).getByRole('button', { name: /创\s*建/ }));

    expect(
      await screen.findByText(/该专业分类当前不可用于新账号/),
    ).toHaveTextContent('requestId: mock-admin-account-page-422');
    expect(
      screen.getByRole('dialog', { name: '新增账号' }),
    ).toBeInTheDocument();
    expect(
      screen.queryByRole('dialog', { name: '账号创建成功' }),
    ).not.toBeInTheDocument();
  });

  it('停用必须确认并填写 reason，成功后刷新为已停用', async () => {
    const user = userEvent.setup();
    renderPage();
    const userRow = await screen.findByRole(
      'row',
      { name: /示例用户甲/ },
      PRO_TABLE_INITIAL_ROW_WAIT_OPTIONS,
    );
    await user.click(within(userRow).getByRole('button', { name: '停用' }));
    const dialog = await screen.findByRole('dialog', {
      name: '确认停用账号',
    });
    await user.click(within(dialog).getByRole('button', { name: '确认停用' }));
    expect(await within(dialog).findByText('请输入操作原因')).toBeVisible();
    expect(userRow).toHaveTextContent('已启用');

    await user.type(
      within(dialog).getByRole('textbox', { name: '操作原因' }),
      '人员离职',
    );
    await user.click(within(dialog).getByRole('button', { name: '确认停用' }));

    expect(await screen.findByText('账号已停用')).toBeInTheDocument();
    await waitFor(() => {
      expect(screen.getByRole('row', { name: /示例用户甲/ })).toHaveTextContent(
        '已停用',
      );
    });
  });

  it('重置密码确认后展示一次性临时密码，关闭后不可再取', async () => {
    const user = userEvent.setup();
    renderPage();

    await submitAction(
      user,
      /示例用户甲/,
      '重置密码',
      '确认重置密码',
      '用户忘记密码',
    );

    const receipt = await screen.findByRole('dialog', {
      name: '密码重置成功',
    });
    expect(receipt).toHaveTextContent('仅此一次，请立即传达');
    expect(
      within(receipt).getByText(/^Reset![\da-f-]{36}$/),
    ).toBeInTheDocument();
    await user.click(
      within(receipt).getByRole('button', { name: '我已安全记录' }),
    );
    await waitFor(() => {
      expect(
        screen.queryByText(/^Reset![\da-f-]{36}$/),
      ).not.toBeInTheDocument();
    });
  });

  it('启用与 TOTP 重置均经过确认和 reason，并产生可观察反馈', async () => {
    const user = userEvent.setup();
    renderPage();

    await submitAction(
      user,
      /示例用户丙/,
      '启用',
      '确认启用账号',
      '恢复账号访问',
    );
    expect(await screen.findByText('账号已启用')).toBeInTheDocument();
    await waitFor(() => {
      expect(screen.getByRole('row', { name: /示例用户丙/ })).toHaveTextContent(
        '已启用',
      );
    });

    await submitAction(
      user,
      /示例用户丙/,
      '重置 TOTP',
      '确认重置 TOTP',
      '用户更换认证设备',
    );
    expect(await screen.findByText('TOTP 已重置')).toBeInTheDocument();
  });

  it('403 列表拒绝展示服务端 detail 原文与 requestId', async () => {
    routes = createAdminAccountsMock({ authorize: () => false });
    renderPage();

    expect(await screen.findByText(/无账号治理权限/)).toHaveTextContent(
      /requestId: mock-admin-account-/,
    );
  });

  it('列表成功后权限被撤销会清除旧账号并展示 403 Problem', async () => {
    const user = userEvent.setup();
    let authorized = true;
    routes = createAdminAccountsMock({ authorize: () => authorized });
    renderPage();

    expect(
      await screen.findByRole(
        'row',
        { name: /示例用户甲/ },
        PRO_TABLE_INITIAL_ROW_WAIT_OPTIONS,
      ),
    ).toBeInTheDocument();
    authorized = false;

    await user.type(
      screen.getByRole('searchbox', { name: '搜索姓名' }),
      '权限撤销后刷新',
    );
    await user.keyboard('{Enter}');

    expect(await screen.findByText(/无账号治理权限/)).toHaveTextContent(
      /requestId: mock-admin-account-/,
    );
    await waitFor(() => {
      expect(
        screen.queryByRole('row', { name: /示例用户甲/ }),
      ).not.toBeInTheDocument();
      expect(screen.getByText('共 0 个账号')).toBeInTheDocument();
    });
  });
});
