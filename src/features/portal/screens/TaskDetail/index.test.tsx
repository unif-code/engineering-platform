import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { AnchorHTMLAttributes, ReactNode } from 'react';
import { describe, expect, it, vi } from 'vitest';

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
  useParams: () => ({ taskId: 'route-task-id' }),
}));

import TaskDetailPage from '.';

describe('TaskDetailPage', () => {
  it('切换所有 Inspector Tab 只展示对应真实空状态', async () => {
    const user = userEvent.setup();
    render(<TaskDetailPage />);

    const task = screen.getByRole('region', { name: '任务 route-task-id' });
    expect(within(task).getByText('route-task-id')).toBeVisible();
    expect(
      within(task).getByRole('heading', { name: '任务详情' }),
    ).toBeVisible();
    expect(
      within(task).getByRole('region', { name: '任务对话' }),
    ).toHaveTextContent('暂无真实任务对话数据');
    expect(
      within(task).getByRole('textbox', { name: '任务消息' }),
    ).toBeDisabled();
    expect(
      within(task).getByRole('button', { name: '发送任务消息' }),
    ).toBeDisabled();
    const inspector = within(task).getByRole('complementary', {
      name: '任务 Inspector',
    });
    for (const [tabName, emptyText] of [
      ['总览', '暂无真实任务详情数据'],
      ['交付', '暂无真实交付数据'],
      ['预览', '暂无真实预览数据'],
    ] as const) {
      await user.click(within(inspector).getByRole('tab', { name: tabName }));
      expect(within(inspector).getByText(emptyText)).toBeVisible();
    }
    expect(
      within(task).getByRole('button', { name: '继续执行' }),
    ).toBeDisabled();
    expect(screen.queryByText('统一任务创建链路')).not.toBeInTheDocument();
    expect(screen.queryByText('engineering-platform')).not.toBeInTheDocument();
    expect(screen.queryByText('需求说明.md')).not.toBeInTheDocument();
    expect(screen.queryByText('Artifact 文档')).not.toBeInTheDocument();
    expect(screen.queryByText('代码 Diff')).not.toBeInTheDocument();
    expect(screen.queryByText('Sandbox Preview')).not.toBeInTheDocument();
    expect(screen.queryByText('+ 增加任务详情页')).not.toBeInTheDocument();
    expect(
      screen.queryByText('已完成任务详情页面结构拆分。'),
    ).not.toBeInTheDocument();
  });
});
