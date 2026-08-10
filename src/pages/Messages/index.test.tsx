import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { App } from 'antd';
import { describe, expect, it } from 'vitest';
import MessagesPage, { MessageFeed } from './index';

function renderPage() {
  return render(
    <App>
      <MessagesPage />
    </App>,
  );
}

async function selectCategory(
  user: ReturnType<typeof userEvent.setup>,
  category: string,
) {
  const categoryFilter = screen.getByRole('radiogroup', {
    name: '消息分类',
  });
  await user.click(within(categoryFilter).getByText(category));
  expect(
    within(categoryFilter).getByRole('radio', { name: category }),
  ).toBeChecked();
}

describe('MessagesPage', () => {
  it('默认展示五个固定分类与每类一条消息', () => {
    renderPage();

    const categoryFilter = screen.getByRole('radiogroup', {
      name: '消息分类',
    });

    for (const category of ['全部', 'Gate', 'Agent', 'MR', '系统']) {
      expect(
        within(categoryFilter).getByRole('radio', { name: category }),
      ).toBeInTheDocument();
    }
    expect(
      within(categoryFilter).getByRole('radio', { name: '全部' }),
    ).toBeChecked();
    expect(
      within(screen.getByRole('list', { name: '消息列表' })).getAllByRole(
        'listitem',
      ),
    ).toHaveLength(5);
  });

  it('选择 Gate 后只展示 Gate 消息及其标签和时间', async () => {
    const user = userEvent.setup();
    renderPage();

    await selectCategory(user, 'Gate');

    const messages = screen.getByRole('list', { name: '消息列表' });
    const items = within(messages).getAllByRole('listitem');
    expect(items).toHaveLength(1);
    expect(items[0]).toHaveAccessibleName(
      '未读消息：Requirement Gate 等待审批',
    );
    expect(within(items[0]).getByText('Gate')).toBeInTheDocument();
    expect(within(items[0]).getByText('今天 10:24')).toBeInTheDocument();
    expect(
      within(messages).queryByRole('listitem', { name: /Agent Attempt/ }),
    ).not.toBeInTheDocument();
  });

  it('选择 Agent 后只展示 Agent Attempt 消息', async () => {
    const user = userEvent.setup();
    renderPage();

    await selectCategory(user, 'Agent');

    const messages = screen.getByRole('list', { name: '消息列表' });
    const items = within(messages).getAllByRole('listitem');
    expect(items).toHaveLength(1);
    expect(items[0]).toHaveAccessibleName('未读消息：Agent Attempt 执行完成');
    expect(within(items[0]).getByText('Agent')).toBeInTheDocument();
    expect(
      within(messages).queryByRole('listitem', { name: /Requirement Gate/ }),
    ).not.toBeInTheDocument();
  });

  it('没有匹配记录时展示明确空状态', () => {
    render(<MessageFeed records={[]} />);

    expect(screen.getByRole('status', { name: '暂无消息' })).toHaveTextContent(
      '暂无符合当前分类的消息',
    );
  });

  it('全部标为已读只提示，重新选择分类后未读数量不变', async () => {
    const user = userEvent.setup();
    renderPage();

    expect(
      screen.getByRole('status', { name: '未读消息 4 条' }),
    ).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: '全部标为已读' }));

    expect(await screen.findByRole('alert')).toHaveTextContent(
      '静态原型操作：全部标为已读，未保存任何业务数据。',
    );

    await selectCategory(user, 'Gate');
    await selectCategory(user, '全部');

    expect(
      screen.getByRole('status', { name: '未读消息 4 条' }),
    ).toBeInTheDocument();
  });
});
