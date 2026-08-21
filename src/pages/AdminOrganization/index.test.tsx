import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent, { type UserEvent } from '@testing-library/user-event';
import { App, ConfigProvider } from 'antd';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { OrganizationTreeResponse } from '@/features/administration';
import { ApiError } from '@/services/transport';

const administrationMocks = vi.hoisted(() => ({
  getOrganizationTree: vi.fn(),
  setOrganizationSuperior: vi.fn(),
}));

vi.mock('@umijs/max', async () => ({
  ...(await import('@tanstack/react-query')),
}));

vi.mock('@/features/administration', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@/features/administration')>()),
  ...administrationMocks,
}));

import AdminOrganizationPage from '.';

const organizationTree = {
  items: [
    {
      children: [
        {
          children: [
            {
              children: [],
              displayName: '运行时成员',
              employeeNo: 'runtime-member',
              id: 'runtime-member-id',
              kind: 'MEMBER',
              superiorId: 'runtime-leader-id',
            },
          ],
          displayName: '运行时 Leader',
          employeeNo: 'runtime-leader',
          id: 'runtime-leader-id',
          kind: 'LEADER',
          superiorId: 'runtime-manager-id',
        },
      ],
      displayName: '运行时负责人',
      employeeNo: 'runtime-manager',
      id: 'runtime-manager-id',
      kind: 'MANAGER',
      superiorId: null,
    },
    {
      children: [],
      displayName: '第二负责人',
      employeeNo: 'runtime-manager-2',
      id: 'runtime-manager-2-id',
      kind: 'MANAGER',
      superiorId: null,
    },
  ],
} satisfies OrganizationTreeResponse;

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

beforeEach(() => {
  administrationMocks.getOrganizationTree.mockReset();
  administrationMocks.getOrganizationTree.mockResolvedValue(organizationTree);
  administrationMocks.setOrganizationSuperior.mockReset();
  administrationMocks.setOrganizationSuperior.mockResolvedValue(undefined);
});

describe('AdminOrganizationPage', () => {
  it('只用服务端组织树组成最终负责人概览与成员详情', async () => {
    renderPage();

    const overview = await screen.findByRole('region', { name: '负责人概览' });
    expect(
      within(overview).getByRole('button', { name: /运行时负责人/ }),
    ).toBeVisible();
    expect(
      within(overview).getByRole('button', { name: /第二负责人/ }),
    ).toBeVisible();
    expect(screen.getByRole('button', { name: '新建部门' })).toBeDisabled();
    expect(screen.getByText('当前版本暂未接入')).toBeVisible();
    expect(screen.queryByText('营销技术部')).not.toBeInTheDocument();

    const members = screen.getByRole('region', {
      name: '运行时负责人负责范围成员',
    });
    expect(
      within(members).getByRole('row', { name: /运行时负责人.*负责人/ }),
    ).toBeVisible();
    expect(
      within(members).getByRole('row', { name: /运行时 Leader.*Leader/ }),
    ).toBeVisible();
    expect(
      within(members).getByRole('row', { name: /运行时成员.*成员/ }),
    ).toBeVisible();
  });

  it('空组织树保留最终结构并展示明确空态', async () => {
    administrationMocks.getOrganizationTree.mockResolvedValueOnce({
      items: [],
    });
    renderPage();

    expect(await screen.findByText('暂无真实组织关系')).toBeVisible();
    expect(screen.getByRole('region', { name: '负责人概览' })).toBeVisible();
    expect(screen.queryByRole('table')).not.toBeInTheDocument();
  });

  it('组织树加载失败展示 Problem 与 requestId 并允许重试', async () => {
    administrationMocks.getOrganizationTree
      .mockRejectedValueOnce(
        new ApiError({
          detail: '组织树暂时不可用',
          requestId: 'request-org-retry',
          status: 503,
        }),
      )
      .mockResolvedValueOnce(organizationTree);
    const user = userEvent.setup();
    renderPage();

    expect(await screen.findByText(/组织树暂时不可用/)).toHaveTextContent(
      'requestId: request-org-retry',
    );
    await user.click(screen.getByRole('button', { name: /重\s*试/ }));
    expect(
      await screen.findByRole('region', { name: '负责人概览' }),
    ).toBeVisible();
    expect(administrationMocks.getOrganizationTree).toHaveBeenCalledTimes(2);
  });

  it('成员只能选择 Leader，Leader 只能选择负责人', async () => {
    const user = userEvent.setup();
    renderPage();

    const memberDialog = await openSuperiorDialog(user, '运行时成员');
    await user.click(screen.getByRole('combobox', { name: '新上级' }));
    expect(
      await screen.findByRole('option', { name: '运行时 Leader' }),
    ).toBeVisible();
    expect(
      screen.queryByRole('option', { name: '运行时负责人' }),
    ).not.toBeInTheDocument();
    await user.click(
      within(memberDialog).getByRole('button', { name: /取\s*消/i }),
    );
    await waitFor(() => expect(memberDialog).not.toBeInTheDocument());

    await openSuperiorDialog(user, '运行时 Leader');
    await user.click(screen.getByRole('combobox', { name: '新上级' }));
    expect(
      await screen.findByRole('option', { name: '运行时负责人' }),
    ).toBeVisible();
    expect(screen.getByRole('option', { name: '第二负责人' })).toBeVisible();
    expect(
      screen.queryByRole('option', { name: '运行时成员' }),
    ).not.toBeInTheDocument();
  });

  it('reason 必填且成功后只调用一次真实 mutation 并刷新', async () => {
    const user = userEvent.setup();
    renderPage();
    const dialog = await openSuperiorDialog(user, '运行时成员');
    await selectOption(user, '新上级', '运行时 Leader');
    await user.click(within(dialog).getByRole('button', { name: '确认调整' }));
    expect(await within(dialog).findByText('请输入调整原因')).toBeVisible();
    await user.type(
      within(dialog).getByRole('textbox', { name: '调整原因' }),
      '团队重组',
    );
    await user.click(within(dialog).getByRole('button', { name: '确认调整' }));

    expect(await screen.findByText('组织归属已调整')).toBeInTheDocument();
    expect(administrationMocks.setOrganizationSuperior).toHaveBeenCalledTimes(
      1,
    );
    expect(administrationMocks.setOrganizationSuperior).toHaveBeenCalledWith(
      'runtime-member-id',
      { reason: '团队重组', superiorId: 'runtime-leader-id' },
    );
    expect(administrationMocks.getOrganizationTree).toHaveBeenCalledTimes(2);
  });

  it.each([
    { detail: '无组织治理权限', requestId: 'request-org-403', status: 403 },
    { detail: '目标账号层级不合法', requestId: 'request-org-422', status: 422 },
  ])(
    '保留 $status Problem 原文与 requestId',
    async ({ detail, requestId, status }) => {
      administrationMocks.setOrganizationSuperior.mockRejectedValueOnce(
        new ApiError({ detail, requestId, status }),
      );
      const user = userEvent.setup();
      renderPage();
      const dialog = await openSuperiorDialog(user, '运行时成员');
      await selectOption(user, '新上级', '运行时 Leader');
      await user.type(
        within(dialog).getByRole('textbox', { name: '调整原因' }),
        '组织职责调整',
      );
      await user.click(
        within(dialog).getByRole('button', { name: '确认调整' }),
      );

      expect(administrationMocks.setOrganizationSuperior).toHaveBeenCalledTimes(
        1,
      );
      expect(await screen.findByText(new RegExp(detail))).toHaveTextContent(
        `requestId: ${requestId}`,
      );
      expect(dialog).toBeInTheDocument();
    },
  );
});
