import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent, { type UserEvent } from '@testing-library/user-event';
import { App, ConfigProvider } from 'antd';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
  createMockRequester,
  type MockRequest,
  type MockResponse,
  type MockRoutes,
} from '../../../tests/mockRequestHarness';

const requestMock = vi.hoisted(() => vi.fn());

vi.mock('@umijs/max', async () => ({
  ...(await import('@tanstack/react-query')),
  defineMock: <T,>(routes: T) => routes,
  request: requestMock,
}));

import { createAdminOrganizationMock } from '../../../mock/adminOrg';
import AdminOrganizationPage from '.';

let routes: MockRoutes;
const requestThroughMock = createMockRequester(() => routes);

function renderPage() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return render(
    <QueryClientProvider client={queryClient}>
      <ConfigProvider theme={{ token: { motion: false } }}>
        <App>
          <AdminOrganizationPage />
        </App>
      </ConfigProvider>
    </QueryClientProvider>,
  );
}

async function selectOption(user: UserEvent, label: string, option: string) {
  await user.click(screen.getByRole('combobox', { name: label }));
  await user.click(await screen.findByRole('option', { name: option }));
}

async function openSuperiorDialog(user: UserEvent, displayName: string) {
  await user.click(
    await screen.findByRole('button', { name: `调整归属 ${displayName}` }),
  );
  return screen.findByRole('dialog', { name: `调整${displayName}归属` });
}

async function submitSuperiorChange(
  user: UserEvent,
  displayName: string,
  superiorName: string,
) {
  const dialog = await openSuperiorDialog(user, displayName);
  await selectOption(user, '新上级', superiorName);
  await user.type(
    within(dialog).getByRole('textbox', { name: '调整原因' }),
    '组织职责调整',
  );
  await user.click(within(dialog).getByRole('button', { name: '确认调整' }));
  return dialog;
}

beforeEach(() => {
  routes = createAdminOrganizationMock();
  requestMock.mockReset();
  requestMock.mockImplementation(requestThroughMock);
});

describe('AdminOrganizationPage', () => {
  it('新建部门按原型呈现四个字段，并明确不伪造未冻结的写契约', async () => {
    const user = userEvent.setup();
    renderPage();
    await screen.findByRole('region', { name: '部门概览' });
    const initialRequestCount = requestMock.mock.calls.length;

    await user.click(screen.getByRole('button', { name: '新建部门' }));
    const dialog = await screen.findByRole('dialog', { name: '新建部门' });
    expect(
      within(dialog).getByRole('textbox', { name: '部门名称' }),
    ).toBeVisible();
    expect(
      within(dialog).getByRole('combobox', { name: '负责人' }),
    ).toBeVisible();
    expect(
      within(dialog).getByRole('combobox', { name: '上级部门' }),
    ).toBeVisible();
    expect(
      within(dialog).getByRole('textbox', { name: '子团队' }),
    ).toBeVisible();
    await user.type(
      within(dialog).getByRole('textbox', { name: '部门名称' }),
      '国际化技术部',
    );
    await selectOption(user, '负责人', '李强 · 开发Leader');
    await selectOption(user, '上级部门', '营销技术部');
    await user.type(
      within(dialog).getByRole('textbox', { name: '子团队' }),
      '国际化前端, 多语言中台',
    );
    await user.click(within(dialog).getByRole('button', { name: '确认创建' }));

    expect(
      await screen.findByText('静态原型：部门写契约尚未冻结'),
    ).toBeInTheDocument();
    expect(requestMock.mock.calls).toHaveLength(initialRequestCount);
    expect(screen.queryByText('国际化技术部')).not.toBeInTheDocument();
  });

  it('按新版原型展示四个部门概览和当前部门成员表', async () => {
    renderPage();

    expect(
      await screen.findByText(
        '部门决定人员归属与默认可见范围；工作区成员由 Owner 另行配置，两者不互相覆盖',
      ),
    ).toBeVisible();
    expect(screen.getByRole('button', { name: '新建部门' })).toBeVisible();
    expect(
      await screen.findByRole('region', { name: '部门概览' }),
    ).toBeVisible();
    for (const department of [
      '营销技术部',
      '交易技术部',
      '中台技术部',
      '平台运营组',
    ]) {
      expect(
        await screen.findByRole('button', { name: new RegExp(department) }),
      ).toBeVisible();
    }

    const members = screen.getByRole('region', { name: '营销技术部成员' });
    expect(within(members).getByRole('row', { name: /王悦/ })).toBeVisible();
    expect(within(members).getByRole('row', { name: /陈晓/ })).toBeVisible();
    expect(members).toHaveTextContent('负责人 吴桐 · 在册 7 人');
  });

  it('普通员工只可选择 Leader，Leader 只可选择经理', async () => {
    const user = userEvent.setup();
    renderPage();

    const memberDialog = await openSuperiorDialog(user, '陈晓');
    await user.click(screen.getByRole('combobox', { name: '新上级' }));
    expect(await screen.findByRole('option', { name: '李强' })).toBeVisible();
    expect(screen.getByRole('option', { name: '吴桐' })).toBeVisible();
    expect(screen.getByRole('option', { name: '刘洋' })).toBeVisible();
    expect(
      screen.queryByRole('option', { name: '赵敏' }),
    ).not.toBeInTheDocument();
    await user.click(
      within(memberDialog).getByRole('button', { name: /取\s*消/i }),
    );
    await waitFor(() => {
      expect(memberDialog).not.toBeInTheDocument();
    });

    await openSuperiorDialog(user, '李强');
    await user.click(screen.getByRole('combobox', { name: '新上级' }));
    expect(await screen.findByRole('option', { name: '赵敏' })).toBeVisible();
    expect(screen.getByRole('option', { name: '秦岚' })).toBeVisible();
    expect(
      screen.queryByRole('option', { name: '吴桐' }),
    ).not.toBeInTheDocument();
    expect(
      screen.queryByRole('option', { name: '陈晓' }),
    ).not.toBeInTheDocument();
  });

  it('reason 必填，成功后刷新组织树并给出反馈', async () => {
    const user = userEvent.setup();
    renderPage();

    const dialog = await openSuperiorDialog(user, '陈晓');
    await selectOption(user, '新上级', '刘洋');
    await user.click(within(dialog).getByRole('button', { name: '确认调整' }));
    expect(await within(dialog).findByText('请输入调整原因')).toBeVisible();
    await user.type(
      within(dialog).getByRole('textbox', { name: '调整原因' }),
      '团队重组',
    );
    await user.click(within(dialog).getByRole('button', { name: '确认调整' }));

    expect(await screen.findByText('组织归属已调整')).toBeInTheDocument();
    await waitFor(() => {
      expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    });
    expect(requestMock).toHaveBeenCalledWith(
      '/api/v1/admin/accounts/member-chen/superior',
      expect.objectContaining({
        data: { reason: '团队重组', superiorId: 'leader-liu' },
        headers: {
          'Idempotency-Key': expect.stringMatching(/^[0-9a-f-]{36}$/),
        },
        method: 'PUT',
      }),
    );
    expect(
      requestMock.mock.calls.filter(
        ([path]) => path === '/api/v1/admin/organization/tree',
      ),
    ).toHaveLength(2);
  });

  it.each([
    {
      detail: '目标关系会形成组织环',
      requestId: 'mock-org-page-409',
      status: 409,
    },
    {
      detail: '目标账号层级不合法',
      requestId: 'mock-org-page-422',
      status: 422,
    },
  ])(
    '保留 $status Problem 原文与 requestId',
    async ({ detail, requestId, status }) => {
      const original = routes['PUT /api/v1/admin/accounts/:accountId/superior'];
      routes = {
        ...routes,
        'PUT /api/v1/admin/accounts/:accountId/superior': (
          request: MockRequest,
          response: MockResponse,
        ) => {
          if (request.body === undefined) {
            throw new Error('测试请求缺少 body');
          }
          response.status(status);
          response.setHeader('Content-Type', 'application/problem+json');
          response.json({ detail, requestId, status, title: 'ORG_ERROR' });
        },
      };
      expect(original).toBeTypeOf('function');
      const user = userEvent.setup();
      renderPage();

      const dialog = await submitSuperiorChange(user, '陈晓', '刘洋');

      expect(await screen.findByText(new RegExp(detail))).toHaveTextContent(
        `requestId: ${requestId}`,
      );
      expect(dialog).toBeInTheDocument();
    },
  );
});
