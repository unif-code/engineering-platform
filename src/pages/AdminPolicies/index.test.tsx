import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { act, render, screen, waitFor, within } from '@testing-library/react';
import userEvent, { type UserEvent } from '@testing-library/user-event';
import { App, ConfigProvider } from 'antd';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { mutationHeaders } from '@/services/transport';
import { createAdminPoliciesMock } from '../../../mock/adminPolicies';
import {
  createMockRequester,
  type MockRoutes,
} from '../../../tests/mockRequestHarness';

const requestMock = vi.hoisted(() => vi.fn());

vi.mock('@umijs/max', async () => ({
  ...(await import('@tanstack/react-query')),
  defineMock: <T,>(routes: T) => routes,
  request: requestMock,
}));

import AdminPoliciesPage from '.';

const INITIAL_WAIT = { timeout: 5_000 };
const PAGE_INTERACTION_TEST_TIMEOUT = 30_000;
const PREVIEW_BUTTON_NAME = /预\s*览/;
const PUBLISH_BUTTON_NAME = /发\s*布/;
const VALIDATE_BUTTON_NAME = /校\s*验/;
let routes: MockRoutes;
const requestThroughMock = createMockRequester(() => routes);

interface SeedDraft {
  content: Record<string, number | string>;
  etag: string;
  id: string;
}

async function seedPublishedVersion(idleMinutes: number, reason: string) {
  const draftsPath = '/api/v1/admin/policies/identity/drafts';
  const created = (await requestThroughMock(draftsPath, {
    data: { scope: 'PLATFORM' },
    headers: mutationHeaders(),
    method: 'POST',
  })) as SeedDraft;
  await requestThroughMock(`${draftsPath}/${created.id}`, {
    data: {
      content: {
        ...created.content,
        'identity.session_idle_minutes': idleMinutes,
      },
    },
    headers: mutationHeaders({ etag: created.etag }),
    method: 'PATCH',
  });
  await requestThroughMock(`${draftsPath}/${created.id}/publish`, {
    data: { reason, totpCode: '123456' },
    headers: mutationHeaders(),
    method: 'POST',
  });
}

function renderPage() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return render(
    <QueryClientProvider client={queryClient}>
      <ConfigProvider theme={{ token: { motion: false } }}>
        <App>
          <AdminPoliciesPage />
        </App>
      </ConfigProvider>
    </QueryClientProvider>,
  );
}

async function findPolicySettings() {
  await screen.findByText(
    '改动先落草稿，经校验与预览后整批发布；每次发布都记录原因与操作人，可按版本回滚',
    {},
    INITIAL_WAIT,
  );
  const settings = await screen.findByRole(
    'region',
    { name: 'Policy 设置' },
    INITIAL_WAIT,
  );
  await screen.findByRole(
    'spinbutton',
    { name: 'Session 空闲期限' },
    INITIAL_WAIT,
  );
  return settings;
}

async function setIdleMinutes(user: UserEvent, value: string) {
  const input = screen.getByRole('spinbutton', { name: 'Session 空闲期限' });
  await user.clear(input);
  await user.type(input, value);
}

async function validateDraft(user: UserEvent) {
  await user.click(screen.getByRole('button', { name: VALIDATE_BUTTON_NAME }));
  await screen.findByText('校验通过', {}, INITIAL_WAIT);
}

async function publishVersionTwo(user: UserEvent) {
  await findPolicySettings();
  await setIdleMinutes(user, '30');
  await validateDraft(user);
  await user.click(screen.getByRole('button', { name: PUBLISH_BUTTON_NAME }));
  const dialog = await screen.findByRole('dialog', { name: '发布 Policy' });
  await user.type(
    within(dialog).getByRole('textbox', { name: '发布原因' }),
    '收紧 Session 空闲期限',
  );
  await user.type(
    within(dialog).getByRole('textbox', { name: 'TOTP 验证码' }),
    '123456',
  );
  await user.click(within(dialog).getByRole('button', { name: '确认发布' }));
  await screen.findByText('Policy 已发布', {}, INITIAL_WAIT);
}

beforeEach(() => {
  routes = createAdminPoliciesMock();
  requestMock.mockReset();
  requestMock.mockImplementation(requestThroughMock);
});

describe('AdminPoliciesPage', {
  timeout: PAGE_INTERACTION_TEST_TIMEOUT,
}, () => {
  it('按新版原型呈现七个策略分类、当前值和待发布草稿区', async () => {
    const user = userEvent.setup();
    renderPage();

    await findPolicySettings();
    expect(screen.queryByText('当前版本 1')).not.toBeInTheDocument();
    expect(
      screen.getByRole('radiogroup', { name: 'Policy 分类' }),
    ).toBeVisible();
    for (const category of [
      '会话与登录策略',
      'Agent 执行限制',
      '模型调用配额',
      'Gate 审批规则',
      '代码仓库与 MR 策略',
      '审计与留存',
      '通知与消息',
    ]) {
      expect(
        within(
          screen.getByRole('radiogroup', { name: 'Policy 分类' }),
        ).getByText(category),
      ).toBeVisible();
    }
    expect(
      screen.getByRole('region', { name: 'Session 空闲期限策略' }),
    ).toBeVisible();
    expect(
      screen.getByRole('region', { name: '待发布草稿' }),
    ).toHaveTextContent('当前没有改动');
    expect(
      screen.getByRole('spinbutton', { name: 'Session 空闲期限' }),
    ).toHaveValue('60');
    expect(
      screen.getByRole('combobox', { name: '密码过期周期' }),
    ).toBeInTheDocument();
    expect(
      screen.queryByRole('button', { name: '新建草稿' }),
    ).not.toBeInTheDocument();
    expect(
      screen.queryByRole('button', { name: '保存草稿' }),
    ).not.toBeInTheDocument();

    await setIdleMinutes(user, '30');
    expect(
      await screen.findByRole('region', { name: 'Draft 编辑' }, INITIAL_WAIT),
    ).toHaveTextContent('60 分钟 → 30 分钟');
  });

  it('校验前自动创建并保存 Draft，PATCH 带当前 If-Match 与新的 Idempotency-Key', async () => {
    const user = userEvent.setup();
    renderPage();
    await findPolicySettings();
    const input = screen.getByRole('spinbutton', {
      name: 'Session 空闲期限',
    });
    const validate = screen.getByRole('button', {
      name: VALIDATE_BUTTON_NAME,
    });

    await user.clear(input);
    expect(validate).toBeDisabled();
    await user.click(validate);
    expect(
      requestMock.mock.calls.filter(
        ([path, options]) =>
          path === '/api/v1/admin/policies/identity/drafts/draft-1' &&
          options?.method === 'PATCH',
      ),
    ).toHaveLength(0);

    await user.type(input, '30');
    expect(validate).toBeEnabled();
    expect(
      screen.getByRole('button', { name: PUBLISH_BUTTON_NAME }),
    ).toBeDisabled();

    await validateDraft(user);
    expect(
      screen.getByRole('button', { name: PUBLISH_BUTTON_NAME }),
    ).toBeEnabled();

    expect(requestMock).toHaveBeenCalledWith(
      '/api/v1/admin/policies/identity/drafts/draft-1',
      {
        data: {
          content: expect.objectContaining({
            'identity.session_idle_minutes': 30,
          }),
        },
        headers: {
          'Idempotency-Key': expect.stringMatching(/^[0-9a-f-]{36}$/),
          'If-Match': '"draft-1-r1"',
        },
        method: 'PATCH',
      },
    );
  });

  it('保存后再次编辑时可撤销本地编辑并恢复服务端候选', async () => {
    const user = userEvent.setup();
    renderPage();
    await findPolicySettings();
    await setIdleMinutes(user, '30');
    await validateDraft(user);

    const patchCountAfterSave = requestMock.mock.calls.filter(
      ([path, options]) =>
        path === '/api/v1/admin/policies/identity/drafts/draft-1' &&
        options?.method === 'PATCH',
    ).length;
    await setIdleMinutes(user, '45');

    const undo = screen.getByRole('button', { name: '撤销本地编辑' });
    expect(undo).toBeEnabled();
    await user.click(undo);

    expect(
      screen.getByRole('spinbutton', { name: 'Session 空闲期限' }),
    ).toHaveValue('30');
    expect(
      screen.getByRole('region', { name: '待发布草稿' }),
    ).toHaveTextContent('60 分钟 → 30 分钟');
    expect(undo).toBeDisabled();
    expect(
      screen.getByRole('button', { name: VALIDATE_BUTTON_NAME }),
    ).toBeEnabled();
    expect(
      screen.getByRole('button', { name: PUBLISH_BUTTON_NAME }),
    ).toBeDisabled();

    await validateDraft(user);
    expect(
      requestMock.mock.calls.filter(
        ([path, options]) =>
          path === '/api/v1/admin/policies/identity/drafts/draft-1' &&
          options?.method === 'PATCH',
      ),
    ).toHaveLength(patchCountAfterSave);
    expect(
      screen.getByRole('button', { name: PUBLISH_BUTTON_NAME }),
    ).toBeEnabled();
  });

  it('Draft ETag 409 展示固定并发冲突提示并保留编辑态', async () => {
    const user = userEvent.setup();
    requestMock.mockImplementation(async (path, options) => {
      if (
        path === '/api/v1/admin/policies/identity/drafts/draft-1' &&
        options?.method === 'PATCH'
      ) {
        throw {
          response: {
            data: {
              detail: '已被并发修改，刷新后重试',
              requestId: 'req-policy-conflict',
              status: 409,
              title: 'DRAFT_CONFLICT',
            },
            status: 409,
            statusText: 'Conflict',
          },
        };
      }
      return requestThroughMock(path, options);
    });
    renderPage();
    await findPolicySettings();
    await setIdleMinutes(user, '30');

    await user.click(
      screen.getByRole('button', { name: VALIDATE_BUTTON_NAME }),
    );

    expect(
      await screen.findByText(/已被并发修改，刷新后重试/, {}, INITIAL_WAIT),
    ).toBeVisible();
    expect(
      screen.getByRole('region', { name: 'Draft 编辑' }),
    ).toBeInTheDocument();
  });

  it('Validate 展示越界 issue，修正后通过校验', async () => {
    const user = userEvent.setup();
    renderPage();
    await findPolicySettings();
    await setIdleMinutes(user, '10');
    await user.click(
      screen.getByRole('button', { name: VALIDATE_BUTTON_NAME }),
    );
    expect(requestMock).toHaveBeenCalledWith(
      '/api/v1/admin/policies/identity/drafts/draft-1',
      expect.objectContaining({
        data: {
          content: expect.objectContaining({
            'identity.session_idle_minutes': 10,
          }),
        },
        method: 'PATCH',
      }),
    );

    expect(
      await screen.findByText(/Session 空闲期限必须在 15～240 之间/),
    ).toBeVisible();

    await setIdleMinutes(user, '30');
    await validateDraft(user);
  });

  it('编辑发生在 Validate 请求之后时丢弃旧候选结果', async () => {
    let resolveValidation:
      | ((value: { issues: []; valid: true }) => void)
      | undefined;
    const validationResponse = new Promise<{ issues: []; valid: true }>(
      (resolve) => {
        resolveValidation = resolve;
      },
    );
    requestMock.mockImplementation((path, options) =>
      path === '/api/v1/admin/policies/identity/drafts/draft-1/validate'
        ? validationResponse
        : requestThroughMock(path, options),
    );
    const user = userEvent.setup();
    renderPage();
    await findPolicySettings();
    await setIdleMinutes(user, '30');

    await user.click(
      screen.getByRole('button', { name: VALIDATE_BUTTON_NAME }),
    );
    await waitFor(() => {
      expect(requestMock).toHaveBeenCalledWith(
        '/api/v1/admin/policies/identity/drafts/draft-1/validate',
        expect.any(Object),
      );
    });
    await setIdleMinutes(user, '45');
    await act(async () => {
      resolveValidation?.({ issues: [], valid: true });
      await validationResponse;
    });

    expect(screen.queryByText('校验通过')).not.toBeInTheDocument();
  });

  it('Preview 呈现 Draft 前后值与生效语义', async () => {
    const user = userEvent.setup();
    renderPage();
    await findPolicySettings();
    await setIdleMinutes(user, '30');
    await user.click(screen.getByRole('button', { name: PREVIEW_BUTTON_NAME }));
    const preview = await screen.findByRole(
      'region',
      { name: 'Policy Preview' },
      INITIAL_WAIT,
    );

    expect(preview).toHaveAttribute('data-density', 'compact');

    expect(
      await within(preview).findByRole(
        'row',
        { name: /Session 空闲期限.*60.*30.*认证 API 的空闲 Session 判定/ },
        INITIAL_WAIT,
      ),
    ).toBeInTheDocument();
  });

  it('Publish 原因或 TOTP 不完整时不可提交，错误 TOTP 展示服务端 detail', async () => {
    const user = userEvent.setup();
    renderPage();
    await findPolicySettings();
    await setIdleMinutes(user, '30');
    await validateDraft(user);
    await user.click(screen.getByRole('button', { name: PUBLISH_BUTTON_NAME }));
    const dialog = await screen.findByRole('dialog', { name: '发布 Policy' });
    const submit = within(dialog).getByRole('button', { name: '确认发布' });

    expect(submit).toBeDisabled();
    await user.type(
      within(dialog).getByRole('textbox', { name: '发布原因' }),
      '验证 TOTP 错误分支',
    );
    expect(submit).toBeDisabled();
    await user.type(
      within(dialog).getByRole('textbox', { name: 'TOTP 验证码' }),
      '000000',
    );
    expect(submit).toBeEnabled();
    await user.click(submit);

    expect(await screen.findByText(/TOTP 验证码错误/)).toBeVisible();
    expect(dialog).toBeInTheDocument();
  });

  it('Publish 成功刷新 catalog，当前值更新且版本增加一', async () => {
    const user = userEvent.setup();
    renderPage();

    await publishVersionTwo(user);

    expect(await screen.findByText('版本 2', {}, INITIAL_WAIT)).toBeVisible();
    expect(
      screen.getByRole('spinbutton', { name: 'Session 空闲期限' }),
    ).toHaveValue('30');
    await waitFor(() => {
      expect(
        screen.queryByRole('dialog', { name: '发布 Policy' }),
      ).not.toBeInTheDocument();
    });
  });

  it('最近三次之外提供全部版本入口并展示完整历史', async () => {
    await seedPublishedVersion(30, '预置第二版');
    await seedPublishedVersion(45, '预置第三版');
    await seedPublishedVersion(50, '预置第四版');
    const user = userEvent.setup();
    renderPage();
    await findPolicySettings();

    const history = screen.getByRole('region', { name: '版本历史' });
    const allVersions = await within(history).findByRole(
      'button',
      { name: '全部 4 个版本' },
      INITIAL_WAIT,
    );
    expect(within(history).getByText('最近 3 次')).toBeVisible();

    await user.click(allVersions);
    const drawer = await screen.findByRole(
      'dialog',
      { name: '版本历史' },
      INITIAL_WAIT,
    );
    expect(
      within(drawer).getByText('共 4 个版本 · 回滚只还原该版本涉及的配置项'),
    ).toBeVisible();
    for (const version of [4, 3, 2, 1]) {
      expect(within(drawer).getByText(`版本 ${version}`)).toBeVisible();
    }
  });

  it('从历史版本 Rollback 后提示并跳到新 Draft 编辑态', async () => {
    const user = userEvent.setup();
    renderPage();
    await publishVersionTwo(user);
    const rollback = await screen.findByRole(
      'button',
      { name: '回滚版本 1' },
      INITIAL_WAIT,
    );

    await user.click(rollback);
    const dialog = await screen.findByRole('dialog', {
      name: '创建回滚 Draft',
    });
    await user.click(within(dialog).getByRole('button', { name: '确认创建' }));

    expect(await screen.findByText('已创建回滚 Draft')).toBeInTheDocument();
    const editor = await screen.findByRole('region', { name: 'Draft 编辑' });
    expect(
      within(editor).getByRole('spinbutton', { name: 'Session 空闲期限' }),
    ).toHaveValue('60');
  });

  it('存在未保存编辑时禁止 Rollback 覆盖当前 Draft', async () => {
    await seedPublishedVersion(30, '预置第二版');
    const user = userEvent.setup();
    renderPage();
    await findPolicySettings();
    await setIdleMinutes(user, '45');

    expect(
      await screen.findByRole('button', { name: '回滚版本 1' }, INITIAL_WAIT),
    ).toBeDisabled();
  });
});
