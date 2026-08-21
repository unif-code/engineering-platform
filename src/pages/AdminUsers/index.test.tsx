import { act, render, screen, waitFor, within } from '@testing-library/react';
import userEvent, { type UserEvent } from '@testing-library/user-event';
import { App, ConfigProvider } from 'antd';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type {
  AccountCredentialReceipt,
  AccountListResponse,
  AccountSummary,
} from '@/features/administration';
import { ApiError } from '@/services/transport';

const administrationMocks = vi.hoisted(() => ({
  createAccount: vi.fn(),
  disableAccount: vi.fn(),
  enableAccount: vi.fn(),
  listAccounts: vi.fn(),
  resetAccountPassword: vi.fn(),
  resetAccountTotp: vi.fn(),
}));

vi.mock('@/features/administration', () => administrationMocks);

import AdminUsersPage from '.';

const PRO_TABLE_INITIAL_ROW_WAIT_OPTIONS = { timeout: 5_000 };
const INTERACTION_TEST_TIMEOUT = 30_000;

const enabledAccount = {
  displayName: '何山',
  employeeNo: '00002002',
  etag: '"v4"',
  id: 'account-9',
  profession: '研发',
  status: 'ENABLED',
} satisfies AccountSummary;

const disabledAccount = {
  displayName: '徐蕾',
  employeeNo: '00001006',
  etag: '"v2"',
  id: 'account-6',
  profession: '研发',
  status: 'DISABLED',
} satisfies AccountSummary;

const accountPage = (
  items: AccountSummary[] = [enabledAccount, disabledAccount],
): AccountListResponse => ({
  items,
  nextCursor: null,
  total: items.length,
});

function renderPage() {
  return render(
    <ConfigProvider theme={{ token: { motion: false } }}>
      <App>
        <AdminUsersPage />
      </App>
    </ConfigProvider>,
  );
}

async function fillCreateForm(
  user: UserEvent,
  values: {
    displayName: string;
    employeeNo: string;
  },
) {
  await screen.findByRole(
    'row',
    { name: /00002002.*何山/ },
    PRO_TABLE_INITIAL_ROW_WAIT_OPTIONS,
  );
  const createButton = screen.getByRole('button', { name: '新增用户' });
  await user.click(createButton);
  const dialog = await screen.findByRole('dialog', { name: '新增用户' });
  await user.type(
    within(dialog).getByRole('textbox', { name: '工号' }),
    values.employeeNo,
  );
  await user.type(
    within(dialog).getByRole('textbox', { name: '姓名' }),
    values.displayName,
  );
  return dialog;
}

async function openAccountAction(
  user: UserEvent,
  rowName: RegExp,
  buttonName: string,
  dialogName: string,
) {
  const row = await screen.findByRole(
    'row',
    { name: rowName },
    PRO_TABLE_INITIAL_ROW_WAIT_OPTIONS,
  );
  await user.click(within(row).getByRole('button', { name: buttonName }));
  return screen.findByRole('dialog', { name: dialogName });
}

beforeEach(() => {
  for (const mock of Object.values(administrationMocks)) {
    mock.mockReset();
  }
  administrationMocks.listAccounts.mockResolvedValue(accountPage());
  administrationMocks.disableAccount.mockResolvedValue(undefined);
  administrationMocks.enableAccount.mockResolvedValue(undefined);
  administrationMocks.resetAccountTotp.mockResolvedValue(undefined);
});

describe('AdminUsersPage', () => {
  it('展示账号契约支持的操作且不暴露编辑或删除', async () => {
    renderPage();

    const enabledRow = await screen.findByRole(
      'row',
      { name: /00002002.*何山/ },
      PRO_TABLE_INITIAL_ROW_WAIT_OPTIONS,
    );
    expect(
      within(enabledRow).getByRole('button', { name: '重置密码' }),
    ).toBeVisible();
    expect(
      within(enabledRow).getByRole('button', { name: '重置 TOTP' }),
    ).toBeVisible();
    expect(
      within(enabledRow).getByRole('button', { name: '停用' }),
    ).toBeVisible();
    expect(
      within(enabledRow).queryByRole('button', { name: '编辑' }),
    ).toBeNull();
    expect(
      within(enabledRow).queryByRole('button', { name: '删除' }),
    ).toBeNull();

    const disabledRow = screen.getByRole('row', { name: /00001006.*徐蕾/ });
    expect(
      within(disabledRow).getByRole('button', { name: '启用' }),
    ).toBeVisible();
    expect(
      screen.getByText(
        '禁用即时失效 Session 与访问权；历史业务 actor 与 Audit 保留 · 超级管理员账号受平台保护',
      ),
    ).toBeInTheDocument();
  });

  it('只把公开 Feature 返回的账号字段投影到最终七列表格', async () => {
    renderPage();

    const row = await screen.findByRole(
      'row',
      { name: /00002002.*何山/ },
      PRO_TABLE_INITIAL_ROW_WAIT_OPTIONS,
    );
    expect(within(row).getAllByText('—')).toHaveLength(3);
    expect(row).not.toHaveTextContent('交易');
    expect(row).not.toHaveTextContent('前端开发');
    expect(row).not.toHaveTextContent('08-06 10:44');
  });

  it(
    '通过公开 feature 重置密码，展示一次性凭据并刷新列表',
    async () => {
      const user = userEvent.setup();
      const temporaryPassword = `Temp!${crypto.randomUUID()}`;
      const receipt: AccountCredentialReceipt = {
        account: { ...enabledAccount, etag: '"v5"' },
        temporaryPassword,
      };
      administrationMocks.resetAccountPassword.mockResolvedValueOnce(receipt);
      renderPage();

      const dialog = await openAccountAction(
        user,
        /00002002.*何山/,
        '重置密码',
        '确认重置密码',
      );
      await user.click(
        within(dialog).getByRole('button', { name: '确认重置密码' }),
      );
      expect(await within(dialog).findByText('请输入操作原因')).toBeVisible();
      await user.type(
        within(dialog).getByRole('textbox', { name: '操作原因' }),
        '用户忘记密码',
      );
      await user.click(
        within(dialog).getByRole('button', { name: '确认重置密码' }),
      );

      await waitFor(() => {
        expect(administrationMocks.resetAccountPassword).toHaveBeenCalledWith(
          enabledAccount.id,
          { reason: '用户忘记密码' },
          enabledAccount.etag,
        );
      });
      const credentialDialog = await screen.findByRole('dialog', {
        name: '密码重置成功',
      });
      expect(credentialDialog).toHaveTextContent(temporaryPassword);
      expect(
        screen.queryByRole('dialog', { name: '确认重置密码' }),
      ).not.toBeInTheDocument();
      await waitFor(() => {
        expect(administrationMocks.listAccounts).toHaveBeenCalledTimes(2);
      });

      await user.click(
        within(credentialDialog).getByRole('button', { name: '我已安全记录' }),
      );
      await waitFor(() => {
        expect(screen.queryByText(temporaryPassword)).not.toBeInTheDocument();
      });
    },
    INTERACTION_TEST_TIMEOUT,
  );

  it.each([
    {
      detail: '禁止重置该账号',
      requestId: 'req-reset-403',
      status: 403,
    },
    {
      detail: '账号状态不允许重置密码',
      requestId: 'req-reset-422',
      status: 422,
    },
  ])(
    '$status 重置失败保留确认框并展示 detail 与 requestId',
    async ({ detail, requestId, status }) => {
      const user = userEvent.setup();
      administrationMocks.resetAccountPassword.mockRejectedValueOnce(
        new ApiError({ detail, requestId, status }),
      );
      renderPage();

      const dialog = await openAccountAction(
        user,
        /00002002.*何山/,
        '重置密码',
        '确认重置密码',
      );
      await user.type(
        within(dialog).getByRole('textbox', { name: '操作原因' }),
        '账号持有人申请重置',
      );
      await user.click(
        within(dialog).getByRole('button', { name: '确认重置密码' }),
      );

      expect(await screen.findByText(new RegExp(detail))).toHaveTextContent(
        `requestId: ${requestId}`,
      );
      expect(
        screen.getByRole('dialog', { name: '确认重置密码' }),
      ).toBeInTheDocument();
      expect(
        screen.queryByRole('dialog', { name: '密码重置成功' }),
      ).not.toBeInTheDocument();
      expect(administrationMocks.listAccounts).toHaveBeenCalledTimes(1);
    },
    INTERACTION_TEST_TIMEOUT,
  );

  it(
    '停用与启用使用账号 etag 并在成功后刷新状态',
    async () => {
      const user = userEvent.setup();
      administrationMocks.listAccounts
        .mockResolvedValueOnce(accountPage())
        .mockResolvedValueOnce(
          accountPage([
            { ...enabledAccount, status: 'DISABLED' },
            disabledAccount,
          ]),
        )
        .mockResolvedValueOnce(
          accountPage([
            enabledAccount,
            { ...disabledAccount, status: 'ENABLED' },
          ]),
        );
      renderPage();

      const disableDialog = await openAccountAction(
        user,
        /00002002.*何山/,
        '停用',
        '确认停用账号',
      );
      await user.type(
        within(disableDialog).getByRole('textbox', { name: '操作原因' }),
        '人员离职',
      );
      await user.click(
        within(disableDialog).getByRole('button', { name: '确认停用' }),
      );
      expect(administrationMocks.disableAccount).toHaveBeenCalledWith(
        enabledAccount.id,
        { reason: '人员离职' },
        enabledAccount.etag,
      );
      await waitFor(() => {
        expect(
          screen.getByRole('row', { name: /00002002.*何山/ }),
        ).toHaveTextContent('已停用');
      });

      const enableDialog = await openAccountAction(
        user,
        /00001006.*徐蕾/,
        '启用',
        '确认启用账号',
      );
      await user.type(
        within(enableDialog).getByRole('textbox', { name: '操作原因' }),
        '恢复账号访问',
      );
      await user.click(
        within(enableDialog).getByRole('button', { name: '确认启用' }),
      );
      expect(administrationMocks.enableAccount).toHaveBeenCalledWith(
        disabledAccount.id,
        { reason: '恢复账号访问' },
        disabledAccount.etag,
      );
      await waitFor(() => {
        expect(administrationMocks.listAccounts).toHaveBeenCalledTimes(3);
      });
      expect(
        screen.getByRole('row', { name: /00001006.*徐蕾/ }),
      ).toHaveTextContent('已启用');
    },
    INTERACTION_TEST_TIMEOUT,
  );

  it(
    '行动作成功后列表权限被撤销会清除旧账号并展示 403 Problem',
    async () => {
      const user = userEvent.setup();
      administrationMocks.listAccounts
        .mockResolvedValueOnce(accountPage())
        .mockRejectedValueOnce(
          new ApiError({
            detail: '账号列表权限已撤销',
            requestId: 'req-account-reload-403',
            status: 403,
          }),
        );
      renderPage();

      const dialog = await openAccountAction(
        user,
        /00002002.*何山/,
        '停用',
        '确认停用账号',
      );
      await user.type(
        within(dialog).getByRole('textbox', { name: '操作原因' }),
        '权限撤销验证',
      );
      await user.click(
        within(dialog).getByRole('button', { name: '确认停用' }),
      );

      expect(await screen.findByText(/账号列表权限已撤销/)).toHaveTextContent(
        'requestId: req-account-reload-403',
      );
      await waitFor(() => {
        expect(
          screen.queryByRole('row', { name: /00002002.*何山/ }),
        ).not.toBeInTheDocument();
        expect(
          screen.queryByRole('row', { name: /00001006.*徐蕾/ }),
        ).not.toBeInTheDocument();
      });
      expect(screen.getByText('暂无数据', { selector: 'div' })).toBeVisible();
      expect(administrationMocks.listAccounts).toHaveBeenCalledTimes(2);
    },
    INTERACTION_TEST_TIMEOUT,
  );

  it('重置 TOTP 使用公开 feature 并刷新列表', async () => {
    const user = userEvent.setup();
    renderPage();

    const dialog = await openAccountAction(
      user,
      /00002002.*何山/,
      '重置 TOTP',
      '确认重置 TOTP',
    );
    await user.type(
      within(dialog).getByRole('textbox', { name: '操作原因' }),
      '用户更换认证设备',
    );
    await user.click(
      within(dialog).getByRole('button', { name: '确认重置 TOTP' }),
    );

    expect(administrationMocks.resetAccountTotp).toHaveBeenCalledWith(
      enabledAccount.id,
      { reason: '用户更换认证设备' },
      enabledAccount.etag,
    );
    expect(await screen.findByText('TOTP 已重置')).toBeInTheDocument();
    await waitFor(() => {
      expect(administrationMocks.listAccounts).toHaveBeenCalledTimes(2);
    });
  });

  it(
    '创建成功展示运行时生成的一次性凭据并刷新账号列表',
    async () => {
      const user = userEvent.setup();
      const temporaryPassword = `Temp!${crypto.randomUUID()}`;
      const createdAccount: AccountSummary = {
        displayName: '临时用户',
        employeeNo: '00000009',
        etag: '"v1"',
        id: crypto.randomUUID(),
        profession: null,
        status: 'PENDING_INIT',
      };
      administrationMocks.createAccount.mockResolvedValueOnce({
        account: createdAccount,
        temporaryPassword,
      } satisfies AccountCredentialReceipt);
      administrationMocks.listAccounts
        .mockResolvedValueOnce(accountPage())
        .mockResolvedValueOnce(
          accountPage([enabledAccount, disabledAccount, createdAccount]),
        );
      renderPage();

      const drawer = await fillCreateForm(user, {
        displayName: '临时用户',
        employeeNo: '00000009',
      });
      expect(within(drawer).getByText('当前版本暂未接入')).toBeVisible();
      expect(within(drawer).queryByRole('combobox')).toBeNull();
      await user.click(within(drawer).getByRole('button', { name: /创\s*建/ }));

      expect(administrationMocks.createAccount).toHaveBeenCalledWith({
        displayName: '临时用户',
        employeeNo: '00000009',
        reason: '通过用户管理新增用户',
      });
      const credentialDialog = await screen.findByRole('dialog', {
        name: '账号创建成功',
      });
      expect(credentialDialog).toHaveTextContent(temporaryPassword);
      await waitFor(() => {
        expect(administrationMocks.listAccounts).toHaveBeenCalledTimes(2);
      });
      expect(
        await screen.findByRole('row', { name: /00000009.*临时用户/ }),
      ).toHaveTextContent('—');
    },
    INTERACTION_TEST_TIMEOUT,
  );

  it.each([
    {
      detail: '员工号 00002002 已存在',
      requestId: 'req-account-create-409',
      status: 409,
    },
    {
      detail: '该专业分类当前不可用于新账号',
      requestId: 'req-account-create-422',
      status: 422,
    },
  ])(
    '$status 创建失败保留抽屉且不展示凭据或刷新列表',
    async ({ detail, requestId, status }) => {
      const user = userEvent.setup();
      administrationMocks.createAccount.mockRejectedValueOnce(
        new ApiError({ detail, requestId, status }),
      );
      renderPage();

      const drawer = await fillCreateForm(user, {
        displayName: '创建失败用户',
        employeeNo: '00002002',
      });
      await user.click(within(drawer).getByRole('button', { name: /创\s*建/ }));

      expect(await screen.findByText(new RegExp(detail))).toHaveTextContent(
        `requestId: ${requestId}`,
      );
      expect(screen.getByRole('dialog', { name: '新增用户' })).toBeVisible();
      expect(
        screen.queryByRole('dialog', { name: '账号创建成功' }),
      ).not.toBeInTheDocument();
      expect(
        screen.queryByText('仅此一次，请立即传达'),
      ).not.toBeInTheDocument();
      expect(administrationMocks.listAccounts).toHaveBeenCalledTimes(1);
    },
    INTERACTION_TEST_TIMEOUT,
  );

  it('列表 403 展示服务端 detail 与 requestId', async () => {
    administrationMocks.listAccounts.mockRejectedValueOnce(
      new ApiError({
        detail: '无账号治理权限',
        requestId: 'req-account-list-403',
        status: 403,
      }),
    );
    renderPage();

    expect(await screen.findByText(/无账号治理权限/)).toHaveTextContent(
      'requestId: req-account-list-403',
    );
    expect(screen.getByRole('button', { name: '重试加载账号' })).toBeVisible();
    expect(screen.queryByRole('row', { name: /00002002.*何山/ })).toBeNull();
  });

  it('后端返回未知账号时安全展示缺省组织、角色和登录时间', async () => {
    administrationMocks.listAccounts.mockResolvedValueOnce(
      accountPage([
        {
          displayName: '运行时账号',
          employeeNo: 'runtime-account',
          etag: '"runtime-v1"',
          id: 'runtime-account-id',
          profession: null,
          status: 'ENABLED',
        },
      ]),
    );
    renderPage();

    const row = await screen.findByRole(
      'row',
      { name: /runtime-account.*运行时账号/ },
      PRO_TABLE_INITIAL_ROW_WAIT_OPTIONS,
    );
    expect(within(row).getAllByText('—')).toHaveLength(3);
  });

  it('页面卸载后忽略仍在途请求的成功结果', async () => {
    let resolvePendingRequest: (value: AccountListResponse) => void = () => {
      throw new Error('pending account request was not started');
    };
    administrationMocks.listAccounts.mockImplementationOnce(
      () =>
        new Promise((resolve) => {
          resolvePendingRequest = resolve;
        }),
    );
    const pageShell = (showPage: boolean) => (
      <ConfigProvider theme={{ token: { motion: false } }}>
        <App>{showPage ? <AdminUsersPage /> : null}</App>
      </ConfigProvider>
    );
    const view = render(pageShell(true));
    await waitFor(() => {
      expect(administrationMocks.listAccounts).toHaveBeenCalledTimes(1);
    });

    view.rerender(pageShell(false));
    await act(async () => {
      resolvePendingRequest(accountPage());
    });

    expect(screen.queryByRole('row', { name: /00002002.*何山/ })).toBeNull();
  });

  it('页面卸载后忽略仍在途请求的 Problem', async () => {
    let rejectPendingRequest: (reason: unknown) => void = () => {
      throw new Error('pending account request was not started');
    };
    administrationMocks.listAccounts.mockImplementationOnce(
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
      expect(administrationMocks.listAccounts).toHaveBeenCalledTimes(1);
    });

    view.rerender(pageShell(false));
    await act(async () => {
      rejectPendingRequest(
        new ApiError({
          detail: '页面卸载后的旧请求',
          requestId: 'unmounted-admin-account-request',
          status: 403,
        }),
      );
    });

    expect(screen.queryByText(/页面卸载后的旧请求/)).not.toBeInTheDocument();
  });
});
