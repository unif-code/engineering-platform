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
  const node = await screen.findByRole('group', {
    name: `${displayName} 组织节点`,
  });
  await user.click(within(node).getByRole('button', { name: '调整归属' }));
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
  it('按经理、Leader、普通员工三层展示组织树', async () => {
    renderPage();

    const tree = await screen.findByRole('tree', { name: '组织关系树' });
    expect(await within(tree).findByText('周天')).toBeInTheDocument();
    expect(within(tree).getByText('方舟')).toBeInTheDocument();
    expect(within(tree).getByText('林一')).toBeInTheDocument();
    expect(
      within(tree)
        .getByRole('group', { name: '周天 组织节点' })
        .closest('[role="treeitem"]'),
    ).toHaveAttribute('aria-level', '1');
    expect(
      within(tree)
        .getByRole('group', { name: '方舟 组织节点' })
        .closest('[role="treeitem"]'),
    ).toHaveAttribute('aria-level', '2');
    expect(
      within(tree)
        .getByRole('group', { name: '林一 组织节点' })
        .closest('[role="treeitem"]'),
    ).toHaveAttribute('aria-level', '3');
    expect(screen.queryByText(/静态原型操作/)).not.toBeInTheDocument();
  });

  it('普通员工只可选择 Leader，Leader 只可选择经理', async () => {
    const user = userEvent.setup();
    renderPage();

    const memberDialog = await openSuperiorDialog(user, '林一');
    await user.click(screen.getByRole('combobox', { name: '新上级' }));
    expect(await screen.findByRole('option', { name: '方舟' })).toBeVisible();
    expect(screen.getByRole('option', { name: '沈一' })).toBeVisible();
    expect(screen.getByRole('option', { name: '赵晨' })).toBeVisible();
    expect(
      screen.queryByRole('option', { name: '周天' }),
    ).not.toBeInTheDocument();
    await user.click(
      within(memberDialog).getByRole('button', { name: /取\s*消/i }),
    );
    await waitFor(() => {
      expect(memberDialog).not.toBeInTheDocument();
    });

    await openSuperiorDialog(user, '方舟');
    await user.click(screen.getByRole('combobox', { name: '新上级' }));
    expect(await screen.findByRole('option', { name: '周天' })).toBeVisible();
    expect(screen.getByRole('option', { name: '顾北' })).toBeVisible();
    expect(
      screen.queryByRole('option', { name: '沈一' }),
    ).not.toBeInTheDocument();
    expect(
      screen.queryByRole('option', { name: '林一' }),
    ).not.toBeInTheDocument();
  });

  it('reason 必填，成功后刷新组织树并给出反馈', async () => {
    const user = userEvent.setup();
    renderPage();

    const dialog = await openSuperiorDialog(user, '林一');
    await selectOption(user, '新上级', '沈一');
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
      '/api/v1/admin/accounts/member-lin/superior',
      expect.objectContaining({
        data: { reason: '团队重组', superiorId: 'leader-shen' },
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

      const dialog = await submitSuperiorChange(user, '林一', '沈一');

      expect(await screen.findByText(new RegExp(detail))).toHaveTextContent(
        `requestId: ${requestId}`,
      );
      expect(dialog).toBeInTheDocument();
    },
  );
});
