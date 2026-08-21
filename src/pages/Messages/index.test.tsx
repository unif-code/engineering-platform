import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';
import MessagesPage from '.';

describe('MessagesPage', () => {
  it('分类切换始终展示真实消息空状态', async () => {
    const user = userEvent.setup();
    render(<MessagesPage />);

    expect(screen.getByRole('heading', { name: '消息中心' })).toBeVisible();
    expect(screen.getByText('暂无真实消息数据')).toBeVisible();
    expect(screen.getByRole('button', { name: '全部已读' })).toBeDisabled();
    const categories = screen.getByRole('radiogroup', { name: '消息分类' });
    await user.click(within(categories).getByText('Gate'));
    expect(screen.getByText('暂无真实消息数据')).toBeVisible();
    expect(
      screen.queryByText('Requirement Gate 等待审批'),
    ).not.toBeInTheDocument();
    expect(screen.queryByText('ATTEMPT-4318')).not.toBeInTheDocument();
  });
});
