import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { App, ConfigProvider } from 'antd';
import type { AnchorHTMLAttributes, ReactNode } from 'react';
import { describe, expect, it, vi } from 'vitest';
import TaskDetailPage from '.';

vi.hoisted(() => {
  Object.defineProperty(globalThis, 'Notification', {
    configurable: true,
    value: class NotificationMock {},
  });
});

vi.mock('@umijs/max', () => ({
  Link: ({
    children,
    to,
    ...props
  }: AnchorHTMLAttributes<HTMLAnchorElement> & {
    children: ReactNode;
    to: string;
  }) => (
    <a {...props} href={to}>
      {children}
    </a>
  ),
  useParams: () => ({ taskId: 'REQ-2026-0142' }),
}));

function renderPage() {
  return render(
    <ConfigProvider theme={{ token: { motion: false } }}>
      <App>
        <TaskDetailPage />
      </App>
    </ConfigProvider>,
  );
}

async function chooseMoreAction(
  user: ReturnType<typeof userEvent.setup>,
  name: string,
) {
  const actions = screen.getByRole('group', { name: '任务操作' });
  await user.click(within(actions).getByRole('button', { name: '更多操作' }));
  await user.click(await screen.findByRole('menuitem', { name }));
}

describe('TaskDetailPage', () => {
  it('呈现任务 ID、静态对话与禁用的消息输入', async () => {
    renderPage();

    const task = await screen.findByRole('region', {
      name: '任务 REQ-2026-0142',
    });
    expect(task).toHaveAccessibleName('任务 REQ-2026-0142');
    expect(
      within(task).getByRole('link', { name: '返回任务列表' }),
    ).toHaveAttribute('href', '/tasks');
    expect(
      within(task).getByRole('heading', { name: '统一任务创建链路' }),
    ).toBeInTheDocument();
    expect(within(task).getByText('REQ-2026-0142')).toBeInTheDocument();
    expect(within(task).getByText('engineering-platform')).toBeInTheDocument();

    const conversation = screen.getByRole('region', { name: '任务对话' });
    expect(conversation).toHaveTextContent('Implementation');
    expect(conversation).toHaveTextContent('已完成任务详情页面结构拆分。');
    expect(within(conversation).getByRole('textbox')).toBeDisabled();
    expect(within(conversation).getByRole('textbox')).toHaveAttribute(
      'placeholder',
      '静态原型，不会发送消息',
    );
  });

  it('在三个原型 Inspector Tab 间只显示当前选中面板', async () => {
    const user = userEvent.setup();
    renderPage();
    await screen.findByRole('region', { name: '任务 REQ-2026-0142' });

    const inspector = screen.getByRole('complementary', {
      name: '任务 Inspector',
    });
    const panels = [
      ['总览', '任务进度'],
      ['交付', '需求说明.md'],
      ['预览', 'Sandbox Preview'],
    ] as const;

    for (const [tabName, panelContent] of panels) {
      const tab = within(inspector).getByRole('tab', { name: tabName });
      await user.click(tab);

      expect(tab).toHaveAttribute('aria-selected', 'true');
      const panel = within(inspector).getByRole('tabpanel');
      expect(panel).toHaveTextContent(panelContent);
    }
    expect(within(inspector).queryByRole('tab', { name: '文档' })).toBeNull();
    expect(within(inspector).queryByRole('tab', { name: '代码' })).toBeNull();
    expect(within(inspector).queryByRole('tab', { name: '执行' })).toBeNull();
  });

  it('查看并关闭 Artifact 与 Diff Drawer', async () => {
    const user = userEvent.setup();
    renderPage();
    await screen.findByRole('region', { name: '任务 REQ-2026-0142' });

    await chooseMoreAction(user, '查看 Artifact');
    const artifactDrawer = await screen.findByRole('dialog', {
      name: 'Artifact 文档',
    });
    expect(artifactDrawer).toHaveTextContent('需求说明.md');
    await user.click(
      within(artifactDrawer).getByRole('button', { name: /关闭|close/i }),
    );
    await waitFor(() => {
      expect(
        screen.queryByRole('dialog', { name: 'Artifact 文档' }),
      ).not.toBeInTheDocument();
    });

    await chooseMoreAction(user, '查看完整 Diff');
    const diffDrawer = await screen.findByRole('dialog', { name: '代码 Diff' });
    expect(diffDrawer).toHaveTextContent('+ 增加任务详情页');
    expect(diffDrawer).toHaveTextContent('- 移除旧占位内容');
    await user.click(
      within(diffDrawer).getByRole('button', { name: /关闭|close/i }),
    );
    await waitFor(() => {
      expect(
        screen.queryByRole('dialog', { name: '代码 Diff' }),
      ).not.toBeInTheDocument();
    });
  });

  it.each([
    { actionName: '查看 Artifact', dialogName: 'Artifact 文档' },
    { actionName: '查看完整 Diff', dialogName: '代码 Diff' },
    { actionName: '驳回审批', dialogName: '驳回审批' },
  ])(
    '从菜单打开 $actionName 并按 Escape 关闭后焦点回到更多操作',
    async ({ actionName, dialogName }) => {
      // rc-component 在 test 环境为所有 Portal 生成相同 ID；development
      // 分支使用真实唯一 ID，才能复现浏览器的 Overlay Escape 栈。
      vi.stubEnv('NODE_ENV', 'development');
      try {
        const user = userEvent.setup();
        renderPage();
        await screen.findByRole('region', { name: '任务 REQ-2026-0142' });

        const actions = screen.getByRole('group', { name: '任务操作' });
        const moreActionsButton = within(actions).getByRole('button', {
          name: '更多操作',
        });
        await user.click(moreActionsButton);
        const menuItem = await screen.findByRole('menuitem', {
          name: actionName,
        });
        await user.click(menuItem);

        const dialog = await screen.findByRole('dialog', { name: dialogName });
        await user.keyboard('{Escape}');

        await waitFor(() => {
          expect(dialog).not.toBeInTheDocument();
        });
        await waitFor(() => {
          expect(moreActionsButton).toHaveFocus();
        });
      } finally {
        vi.unstubAllEnvs();
      }
    },
  );

  it('驳回审批必须填写原因，提交后仅提示且任务与对话不变', async () => {
    const user = userEvent.setup();
    renderPage();
    await screen.findByRole('region', { name: '任务 REQ-2026-0142' });

    const summary = screen.getByRole('region', { name: '任务状态摘要' });
    const conversation = screen.getByRole('region', { name: '任务对话' });
    const summaryBefore = summary.textContent;
    const conversationBefore = conversation.textContent;

    await chooseMoreAction(user, '驳回审批');
    const dialog = await screen.findByRole('dialog', { name: '驳回审批' });
    await user.click(within(dialog).getByRole('button', { name: '确认驳回' }));
    await waitFor(() => {
      expect(dialog).toHaveTextContent('请输入驳回原因');
    });

    await user.type(
      within(dialog).getByRole('textbox', { name: '驳回原因' }),
      '需要补充验收证据',
    );
    await user.click(within(dialog).getByRole('button', { name: '确认驳回' }));

    await waitFor(() => {
      expect(
        screen.queryByRole('dialog', { name: '驳回审批' }),
      ).not.toBeInTheDocument();
    });
    expect(await screen.findByRole('alert')).toHaveTextContent(
      '静态原型操作：驳回审批，未保存任何业务数据。',
    );
    expect(
      screen.getByRole('region', { name: '任务状态摘要' }).textContent,
    ).toBe(summaryBefore);
    expect(screen.getByRole('region', { name: '任务对话' }).textContent).toBe(
      conversationBefore,
    );
  });
});
