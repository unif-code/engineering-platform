import { render, screen, within } from '@testing-library/react';
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
  it('展示路由任务编号与详情骨架但不伪造任务事实', () => {
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
      within(task).getByRole('complementary', { name: '任务 Inspector' }),
    ).toHaveTextContent('暂无真实任务详情数据');
    expect(
      within(task).getByRole('button', { name: '继续执行' }),
    ).toBeDisabled();
    expect(screen.queryByText('统一任务创建链路')).not.toBeInTheDocument();
    expect(screen.queryByText('engineering-platform')).not.toBeInTheDocument();
    expect(screen.queryByText('需求说明.md')).not.toBeInTheDocument();
    expect(
      screen.queryByText('已完成任务详情页面结构拆分。'),
    ).not.toBeInTheDocument();
  });
});
