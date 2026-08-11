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
let routes: MockRoutes;
const requestThroughMock = createMockRequester(() => routes);

interface SeedDraft {
  content: Record<string, number | string>;
  etag: string;
  id: string;
}

async function seedPublishedVersionTwo() {
  const draftsPath = '/api/v1/admin/policies/identity/drafts';
  const created = (await requestThroughMock(draftsPath, {
    data: { scope: 'PLATFORM' },
    headers: mutationHeaders(),
    method: 'POST',
  })) as SeedDraft;
  const updated = (await requestThroughMock(`${draftsPath}/${created.id}`, {
    data: {
      content: {
        ...created.content,
        'identity.session_idle_minutes': 30,
      },
    },
    headers: mutationHeaders({ etag: created.etag }),
    method: 'PATCH',
  })) as SeedDraft;
  await requestThroughMock(`${draftsPath}/${created.id}/publish`, {
    data: { reason: '预置第二版', totpCode: '123456' },
    headers: mutationHeaders(),
    method: 'POST',
  });
  return updated;
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

async function startDraft(user: UserEvent) {
  await screen.findByRole(
    'row',
    { name: /Session 空闲期限.*60.*版本 1/ },
    INITIAL_WAIT,
  );
  await user.click(screen.getByRole('button', { name: '新建 Draft' }));
  return screen.findByRole('region', { name: 'Draft 编辑' }, INITIAL_WAIT);
}

async function setIdleMinutes(user: UserEvent, value: string) {
  const input = screen.getByRole('spinbutton', { name: 'Session 空闲期限' });
  await user.clear(input);
  await user.type(input, value);
}

async function saveDraft(user: UserEvent) {
  const editor = screen.getByRole('region', { name: 'Draft 编辑' });
  const revisionText = within(editor).getByText(/revision \d+/).textContent;
  const revision = Number(revisionText?.match(/\d+/)?.[0]);

  await user.click(within(editor).getByRole('button', { name: '保存 Draft' }));
  await within(editor).findByText(`revision ${revision + 1}`, {}, INITIAL_WAIT);
  await screen.findByText('Draft 已保存', {}, INITIAL_WAIT);
}

async function publishVersionTwo(user: UserEvent) {
  await startDraft(user);
  await setIdleMinutes(user, '30');
  await saveDraft(user);
  await user.click(screen.getByRole('button', { name: 'Publish' }));
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
  it('呈现 catalog 当前值/版本，并为 Draft 使用数字与枚举控件', async () => {
    const user = userEvent.setup();
    renderPage();

    expect(
      await screen.findByRole(
        'row',
        { name: /Session 空闲期限.*60.*版本 1/ },
        INITIAL_WAIT,
      ),
    ).toBeInTheDocument();
    expect(
      screen.getByRole('row', {
        name: /密码过期周期.*NEVER.*版本 1/,
      }),
    ).toBeInTheDocument();

    const editor = await startDraft(user);
    expect(
      within(editor).getByRole('spinbutton', { name: 'Session 空闲期限' }),
    ).toHaveValue('60');
    expect(
      within(editor).getByRole('combobox', { name: '密码过期周期' }),
    ).toBeInTheDocument();
  });

  it('保存 Draft 的 PATCH 带当前 If-Match 与新的 Idempotency-Key', async () => {
    const user = userEvent.setup();
    renderPage();
    const editor = await startDraft(user);
    const input = within(editor).getByRole('spinbutton', {
      name: 'Session 空闲期限',
    });
    const save = within(editor).getByRole('button', { name: '保存 Draft' });

    await user.clear(input);
    expect(save).toBeDisabled();
    await user.click(save);
    expect(
      requestMock.mock.calls.filter(
        ([path, options]) =>
          path === '/api/v1/admin/policies/identity/drafts/draft-1' &&
          options?.method === 'PATCH',
      ),
    ).toHaveLength(0);

    await user.type(input, '30');
    expect(save).toBeEnabled();

    expect(
      within(editor).getByRole('button', { name: 'Validate' }),
    ).toBeDisabled();
    expect(
      within(editor).getByRole('button', { name: 'Preview' }),
    ).toBeDisabled();
    expect(
      within(editor).getByRole('button', { name: 'Publish' }),
    ).toBeDisabled();

    await saveDraft(user);

    expect(
      within(editor).getByRole('button', { name: 'Validate' }),
    ).toBeEnabled();
    expect(
      within(editor).getByRole('button', { name: 'Preview' }),
    ).toBeEnabled();
    expect(
      within(editor).getByRole('button', { name: 'Publish' }),
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
    await startDraft(user);
    await setIdleMinutes(user, '30');

    await user.click(screen.getByRole('button', { name: '保存 Draft' }));

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
    await startDraft(user);
    await setIdleMinutes(user, '10');
    await saveDraft(user);
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

    await user.click(screen.getByRole('button', { name: 'Validate' }));
    expect(
      await screen.findByText(/Session 空闲期限必须在 15～240 之间/),
    ).toBeVisible();

    await setIdleMinutes(user, '30');
    await saveDraft(user);
    await user.click(screen.getByRole('button', { name: 'Validate' }));
    expect(await screen.findByText('Validation 通过')).toBeVisible();
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
    await startDraft(user);

    await user.click(screen.getByRole('button', { name: 'Validate' }));
    await waitFor(() => {
      expect(requestMock).toHaveBeenCalledWith(
        '/api/v1/admin/policies/identity/drafts/draft-1/validate',
        expect.any(Object),
      );
    });
    await setIdleMinutes(user, '30');
    await act(async () => {
      resolveValidation?.({ issues: [], valid: true });
      await validationResponse;
    });

    expect(screen.queryByText('Validation 通过')).not.toBeInTheDocument();
  });

  it('Preview 呈现 Draft 前后值与生效语义', async () => {
    const user = userEvent.setup();
    renderPage();
    await startDraft(user);
    await setIdleMinutes(user, '30');
    await saveDraft(user);
    await user.click(screen.getByRole('button', { name: 'Preview' }));
    const preview = await screen.findByRole(
      'region',
      { name: 'Policy Preview' },
      INITIAL_WAIT,
    );

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
    await startDraft(user);
    await user.click(screen.getByRole('button', { name: 'Publish' }));
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

    expect(
      await screen.findByRole(
        'row',
        { name: /Session 空闲期限.*30.*版本 2/ },
        INITIAL_WAIT,
      ),
    ).toBeInTheDocument();
    await waitFor(() => {
      expect(
        screen.queryByRole('dialog', { name: '发布 Policy' }),
      ).not.toBeInTheDocument();
    });
  });

  it('从历史版本 Rollback 后提示并跳到新 Draft 编辑态', async () => {
    const user = userEvent.setup();
    renderPage();
    await publishVersionTwo(user);
    const rollback = await screen.findByRole(
      'button',
      { name: 'Rollback 版本 1' },
      INITIAL_WAIT,
    );

    await user.click(rollback);
    const dialog = await screen.findByRole('dialog', {
      name: '创建回滚 Draft',
    });
    await user.click(within(dialog).getByRole('button', { name: '确认创建' }));

    expect(await screen.findByText('已创建回滚 Draft')).toBeInTheDocument();
    const editor = await screen.findByRole('region', { name: 'Draft 编辑' });
    expect(within(editor).getByText('Base 版本 2')).toBeVisible();
    expect(
      within(editor).getByRole('spinbutton', { name: 'Session 空闲期限' }),
    ).toHaveValue('60');
  });

  it('存在未保存编辑时禁止 Rollback 覆盖当前 Draft', async () => {
    await seedPublishedVersionTwo();
    const user = userEvent.setup();
    renderPage();
    await screen.findByRole(
      'row',
      { name: /Session 空闲期限.*30.*版本 2/ },
      INITIAL_WAIT,
    );
    await user.click(screen.getByRole('button', { name: '新建 Draft' }));
    await screen.findByRole('region', { name: 'Draft 编辑' }, INITIAL_WAIT);
    await setIdleMinutes(user, '45');

    expect(
      await screen.findByRole(
        'button',
        { name: 'Rollback 版本 1' },
        INITIAL_WAIT,
      ),
    ).toBeDisabled();
  });
});
