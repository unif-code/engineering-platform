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
}));

import TasksPage from './index';

describe('TasksPage', () => {
  it('列表与看板复用同一个真实空数据集', async () => {
    const user = userEvent.setup();
    render(<TasksPage />);

    expect(screen.getByRole('heading', { name: '任务' })).toBeVisible();
    expect(screen.getByText('暂无真实任务数据')).toBeVisible();
    for (const columnName of [
      '编号',
      '任务标题',
      'Team',
      '仓库',
      '状态',
      '责任人',
      'Agent',
      '更新',
      '操作',
    ]) {
      expect(
        screen.getByRole('columnheader', { name: columnName }),
      ).toBeVisible();
    }
    expect(screen.getByRole('button', { name: '创建任务' })).toBeDisabled();
    expect(screen.queryByText('REQ-2026-0142')).not.toBeInTheDocument();

    const viewSwitcher = screen.getByRole('radiogroup', { name: '任务视图' });
    await user.click(within(viewSwitcher).getByText('看板'));

    const board = screen.getByRole('region', { name: '任务看板' });
    expect(screen.queryByRole('table')).not.toBeInTheDocument();
    expect(within(board).getAllByText('暂无真实任务数据')).toHaveLength(5);
    expect(within(board).queryByText('REQ-2026-0142')).not.toBeInTheDocument();
  });
});
