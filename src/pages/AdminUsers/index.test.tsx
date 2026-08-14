import { act, render, screen, waitFor, within } from '@testing-library/react';
import userEvent, { type UserEvent } from '@testing-library/user-event';
import { App, ConfigProvider } from 'antd';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const { fetchMock, requestMock } = vi.hoisted(() => {
  const fetchMock = vi.fn();
  vi.stubGlobal('fetch', fetchMock);
  return { fetchMock, requestMock: vi.fn() };
});

vi.mock('@umijs/max', () => ({
  defineMock: <T,>(routes: T) => routes,
}));

import { createAdminAccountsMock } from '../../../mock/adminAccounts';
import { createRequesterFetch } from '../../../tests/mockRequestHarness';
import AdminUsersPage from '.';

const PRO_TABLE_INITIAL_ROW_WAIT_OPTIONS = { timeout: 5_000 };
const PRO_TABLE_UPDATE_WAIT_OPTIONS = { timeout: 5_000 };
const INTERACTION_TEST_TIMEOUT = 30_000;
const PROTOTYPE_USERS = [
  ['E1001', '王悦'],
  ['E1002', '吴桐'],
  ['E1003', '李强'],
  ['E1004', '陈晓'],
  ['E1005', '郑楠'],
  ['E1006', '徐蕾'],
  ['E1007', '赵敏'],
  ['E2001', '刘洋'],
  ['E2002', '何山'],
  ['E2003', '秦岚'],
  ['E3001', '罗成'],
  ['E3002', '康宁'],
  ['E0001', '孙杰'],
  ['E0000', '周天'],
] as const;

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
const fetchThroughRequester = createRequesterFetch((path, options) =>
  requestMock(path, options),
);

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
    role?: string;
    superior?: string;
    team?: string;
  },
) {
  await screen.findByRole(
    'row',
    { name: /E1001.*王悦/ },
    PRO_TABLE_INITIAL_ROW_WAIT_OPTIONS,
  );
  const createButton = screen.getByRole('button', { name: '新增用户' });
  await user.click(createButton);
  expect(createButton).toHaveAttribute('aria-expanded', 'true');
  const dialog = await screen.findByRole('dialog', { name: '新增用户' });
  expect(dialog).toBeVisible();
  await user.type(
    within(dialog).getByRole('textbox', { name: '工号' }),
    values.employeeNo,
  );
  await user.type(
    within(dialog).getByRole('textbox', { name: '姓名' }),
    values.displayName,
  );
  await selectOption(user, '所属 Team', values.team ?? '营销', dialog);
  await user.click(within(dialog).getByRole('combobox', { name: '角色' }));
  expect(
    screen.queryByRole('option', { name: '超级管理员' }),
  ).not.toBeInTheDocument();
  await user.click(
    await screen.findByRole('option', { name: values.role ?? '前端开发' }),
  );
  await selectOption(user, '直属上级', values.superior ?? '无', dialog);
  return dialog;
}

async function submitAction(
  user: UserEvent,
  rowName: RegExp,
  buttonName: string,
  dialogName: string,
  reason: string,
) {
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
  fetchMock.mockReset();
  fetchMock.mockImplementation(fetchThroughRequester);
});

describe('AdminUsersPage', () => {
  it('账号 mock 列表只返回冻结的 AccountSummary 契约字段', async () => {
    const page = (await requestThroughMock('/api/v1/admin/accounts', {
      params: { page: 1, pageSize: 20 },
    })) as { items: Array<Record<string, unknown>> };

    expect(page.items).toHaveLength(14);
    for (const account of page.items) {
      expect(Object.keys(account).sort()).toEqual([
        'displayName',
        'employeeNo',
        'etag',
        'id',
        'profession',
        'status',
      ]);
    }
  });

  it('按原型呈现 14 条用户 fixture、七列表格与新增入口', async () => {
    renderPage();

    expect(
      screen.getByText(
        '单一用户表，平台端 / 管理端不区分账号；菜单与操作按角色能力动态渲染 · 本地账号 + TOTP 双因素',
      ),
    ).toBeInTheDocument();
    expect(
      screen.getByRole('button', { name: '新增用户' }),
    ).toBeInTheDocument();
    expect(
      await screen.findByRole(
        'row',
        { name: /E1001.*王悦/ },
        PRO_TABLE_INITIAL_ROW_WAIT_OPTIONS,
      ),
    ).toBeInTheDocument();
    for (const [employeeNo, displayName] of PROTOTYPE_USERS) {
      expect(
        screen.getByRole('row', {
          name: new RegExp(`${employeeNo}.*${displayName}`),
        }),
      ).toBeInTheDocument();
    }
    expect(screen.getByRole('row', { name: /E1006.*徐蕾/ })).toHaveTextContent(
      '已停用',
    );
    expect(screen.getByRole('row', { name: /E2002.*何山/ })).toHaveTextContent(
      '前端开发 · 后端开发',
    );
    const firstUserRow = screen.getByRole('row', { name: /E1001.*王悦/ });
    expect(firstUserRow).toHaveTextContent('营销');
    expect(firstUserRow).toHaveTextContent('产品');
    expect(firstUserRow).toHaveTextContent('08-06 09:02');

    const table = screen.getByRole('table');
    expect(table).toHaveStyle({ width: '1120px' });
    expect(
      within(table)
        .getAllByRole('columnheader')
        .map((header) => header.textContent),
    ).toEqual(['工号', '姓名', 'Team', '角色标签', '状态', '最近登录', '操作']);
    expect(within(table).getAllByRole('row')).toHaveLength(15);
    expect(screen.queryByText(/静态原型操作/)).not.toBeInTheDocument();
    expect(
      screen.queryByText('管理平台账号、初始化状态与凭据治理操作'),
    ).not.toBeInTheDocument();
  });

  it(
    '编辑用户只使用原型四字段并保持静态预览语义',
    async () => {
      const user = userEvent.setup();
      renderPage();
      const row = await screen.findByRole(
        'row',
        { name: /E2002.*何山/ },
        PRO_TABLE_INITIAL_ROW_WAIT_OPTIONS,
      );

      await user.click(within(row).getByRole('button', { name: '编辑' }));
      const dialog = await screen.findByRole('dialog', { name: '编辑用户' });

      expect(within(dialog).getByRole('textbox', { name: '姓名' })).toHaveValue(
        '何山',
      );
      expect(
        within(dialog).getByRole('combobox', { name: '所属 Team' }),
      ).toBeInTheDocument();
      expect(
        within(dialog).getByRole('combobox', { name: '角色' }),
      ).toBeInTheDocument();
      expect(dialog).toHaveTextContent('前端开发');
      expect(
        within(dialog).getByRole('combobox', { name: '状态' }),
      ).toBeInTheDocument();
      expect(
        within(dialog).queryByRole('combobox', { name: '直属上级' }),
      ).not.toBeInTheDocument();
      expect(
        within(dialog).queryByRole('combobox', { name: '专业分类' }),
      ).not.toBeInTheDocument();
      expect(dialog).toHaveTextContent('正常');

      const nameInput = within(dialog).getByRole('textbox', { name: '姓名' });
      await user.clear(nameInput);
      await user.type(nameInput, '不会保存的姓名');
      await user.click(within(dialog).getByRole('button', { name: /保\s*存/ }));

      expect(
        await screen.findByText(
          '静态原型操作：编辑用户 何山，未保存任何业务数据。',
        ),
      ).toBeInTheDocument();
      expect(
        screen.getByRole('row', { name: /E2002.*何山/ }),
      ).not.toHaveTextContent('不会保存的姓名');
    },
    INTERACTION_TEST_TIMEOUT,
  );

  it('不显示原型没有的账号搜索、筛选与汇总', async () => {
    renderPage();
    await screen.findByRole(
      'row',
      { name: /E1001.*王悦/ },
      PRO_TABLE_INITIAL_ROW_WAIT_OPTIONS,
    );

    expect(screen.queryByRole('searchbox')).not.toBeInTheDocument();
    expect(screen.queryByRole('combobox')).not.toBeInTheDocument();
    expect(screen.queryByText('共 14 个账号')).not.toBeInTheDocument();
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
      role: '前端开发',
      superior: '李强 · 开发Leader · 营销',
      team: '营销',
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
    expect(screen.getByRole('row', { name: /临时用户/ })).toHaveTextContent(
      '营销',
    );
    expect(screen.getByRole('row', { name: /临时用户/ })).toHaveTextContent(
      '前端开发',
    );
  }, 45_000);

  it(
    '重复员工号保留创建抽屉并展示 409 detail 与 requestId',
    async () => {
      const user = userEvent.setup();
      renderPage();
      await screen.findByRole('table');

      const drawer = await fillCreateForm(user, {
        displayName: '重复用户',
        employeeNo: 'E1001',
        team: '营销',
      });
      await user.click(within(drawer).getByRole('button', { name: /创\s*建/ }));

      expect(await screen.findByText(/员工号 E1001 已存在/)).toHaveTextContent(
        /requestId: mock-admin-account-/,
      );
      expect(
        screen.getByRole('dialog', { name: '新增用户' }),
      ).toBeInTheDocument();
      expect(
        screen.queryByRole('dialog', { name: '账号创建成功' }),
      ).not.toBeInTheDocument();
      await user.click(within(drawer).getByRole('button', { name: /取\s*消/ }));
      await waitFor(() => {
        expect(
          screen.queryByRole('dialog', { name: '新增用户' }),
        ).not.toBeInTheDocument();
      });
    },
    INTERACTION_TEST_TIMEOUT,
  );

  it(
    '服务端返回 422 时保留创建抽屉并展示 detail 与 requestId 原文',
    async () => {
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
        team: '营销',
      });
      await user.click(within(drawer).getByRole('button', { name: /创\s*建/ }));

      expect(
        await screen.findByText(/该专业分类当前不可用于新账号/),
      ).toHaveTextContent('requestId: mock-admin-account-page-422');
      expect(
        screen.getByRole('dialog', { name: '新增用户' }),
      ).toBeInTheDocument();
      expect(
        screen.queryByRole('dialog', { name: '账号创建成功' }),
      ).not.toBeInTheDocument();
      await user.click(within(drawer).getByRole('button', { name: /取\s*消/ }));
      await waitFor(() => {
        expect(
          screen.queryByRole('dialog', { name: '新增用户' }),
        ).not.toBeInTheDocument();
      });
    },
    INTERACTION_TEST_TIMEOUT,
  );

  it(
    '停用必须确认并填写 reason，成功后刷新为已停用',
    async () => {
      const user = userEvent.setup();
      renderPage();
      const userRow = await screen.findByRole(
        'row',
        { name: /E1001.*王悦/ },
        PRO_TABLE_INITIAL_ROW_WAIT_OPTIONS,
      );
      await user.click(within(userRow).getByRole('button', { name: '停用' }));
      const dialog = await screen.findByRole('dialog', {
        name: '确认停用账号',
      });
      await user.click(
        within(dialog).getByRole('button', { name: '确认停用' }),
      );
      expect(await within(dialog).findByText('请输入操作原因')).toBeVisible();
      expect(userRow).toHaveTextContent('已启用');

      await user.type(
        within(dialog).getByRole('textbox', { name: '操作原因' }),
        '人员离职',
      );
      await user.click(
        within(dialog).getByRole('button', { name: '确认停用' }),
      );

      expect(await screen.findByText('账号已停用')).toBeInTheDocument();
      await waitFor(() => {
        expect(
          screen.getByRole('row', { name: /E1001.*王悦/ }),
        ).toHaveTextContent('已停用');
      });
    },
    INTERACTION_TEST_TIMEOUT,
  );

  it('原型用户操作不额外暴露重置密码入口', async () => {
    const user = userEvent.setup();
    renderPage();

    const row = await screen.findByRole(
      'row',
      { name: /E1001.*王悦/ },
      PRO_TABLE_INITIAL_ROW_WAIT_OPTIONS,
    );
    expect(within(row).queryByRole('button', { name: '重置密码' })).toBeNull();
    await user.click(within(row).getByRole('button', { name: '编辑' }));
    expect(
      within(
        await screen.findByRole('dialog', { name: '编辑用户' }),
      ).queryByRole('button', { name: '重置密码' }),
    ).toBeNull();
  });

  it(
    '启用经过确认和 reason，并刷新账号状态',
    async () => {
      const user = userEvent.setup();
      renderPage();

      await submitAction(
        user,
        /E1006.*徐蕾/,
        '启用',
        '确认启用账号',
        '恢复账号访问',
      );
      expect(await screen.findByText('账号已启用')).toBeInTheDocument();
      await waitFor(() => {
        expect(
          screen.getByRole('row', { name: /E1006.*徐蕾/ }),
        ).toHaveTextContent('已启用');
      });
    },
    INTERACTION_TEST_TIMEOUT,
  );

  it('TOTP 重置经过确认和 reason，并产生可观察反馈', async () => {
    const user = userEvent.setup();
    renderPage();

    await submitAction(
      user,
      /E1001.*王悦/,
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

  it('行动作成功后列表权限被撤销会清除旧账号并展示 403 Problem', async () => {
    const user = userEvent.setup();
    let authorizationChecks = 0;
    routes = createAdminAccountsMock({
      authorize: () => {
        authorizationChecks += 1;
        return authorizationChecks <= 2;
      },
    });
    renderPage();

    await submitAction(
      user,
      /E1001.*王悦/,
      '停用',
      '确认停用账号',
      '权限撤销验证',
    );

    expect(await screen.findByText(/无账号治理权限/)).toHaveTextContent(
      /requestId: mock-admin-account-/,
    );
    await waitFor(() => {
      expect(
        screen.queryByRole('row', { name: /E1001.*王悦/ }),
      ).not.toBeInTheDocument();
    }, PRO_TABLE_UPDATE_WAIT_OPTIONS);
  });
});
