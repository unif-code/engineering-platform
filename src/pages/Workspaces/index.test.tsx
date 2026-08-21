import { render, screen, within } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import WorkspacesPage from '.';

describe('WorkspacesPage', () => {
  it('保留个人工作区主从结构并展示真实空状态', () => {
    render(<WorkspacesPage />);

    const selector = screen.getByRole('complementary', {
      name: '工作区选择',
    });
    expect(
      within(selector).getByRole('heading', { name: '我的工作区' }),
    ).toBeVisible();
    expect(within(selector).getByText('暂无真实个人工作区数据')).toBeVisible();
    const detail = screen.getByRole('region', { name: '工作区详情' });
    expect(within(detail).getByRole('tab', { name: '成员' })).toBeVisible();
    expect(within(detail).getByRole('tab', { name: '仓库' })).toBeVisible();
    expect(within(detail).getByRole('tab', { name: '设置' })).toBeVisible();
    expect(within(detail).getByText('暂无真实工作区详情数据')).toBeVisible();
    expect(screen.queryByText('营销工作区')).not.toBeInTheDocument();
    expect(screen.queryByText('李强')).not.toBeInTheDocument();
    expect(screen.queryByText('mk-activity-h5')).not.toBeInTheDocument();
  });
});
