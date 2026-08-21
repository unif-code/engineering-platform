import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';
import WorkspacesPage from '.';

describe('WorkspacesPage', () => {
  it('切换所有详情 Tab 只展示对应真实空状态', async () => {
    const user = userEvent.setup();
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
    for (const [tabName, emptyText] of [
      ['成员', '暂无真实工作区详情数据'],
      ['仓库', '暂无真实仓库数据'],
      ['设置', '暂无真实设置数据'],
    ] as const) {
      await user.click(within(detail).getByRole('tab', { name: tabName }));
      expect(within(detail).getByText(emptyText)).toBeVisible();
    }
    expect(screen.queryByText('营销工作区')).not.toBeInTheDocument();
    expect(screen.queryByText('李强')).not.toBeInTheDocument();
    expect(screen.queryByText('mk-activity-h5')).not.toBeInTheDocument();
    expect(
      screen.queryByDisplayValue('https://git.corp.example.com'),
    ).not.toBeInTheDocument();
  });
});
