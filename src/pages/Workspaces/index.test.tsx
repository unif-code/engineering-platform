import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { App } from 'antd';
import { describe, expect, it } from 'vitest';
import WorkspacesPage from '.';

function renderPage() {
  return render(
    <App>
      <WorkspacesPage />
    </App>,
  );
}

async function openTab(user: ReturnType<typeof userEvent.setup>, name: string) {
  const tab = screen.getByRole('tab', { name });
  await user.click(tab);
  expect(tab).toHaveAttribute('aria-selected', 'true');
  return screen.getByRole('tabpanel', { name });
}

describe('WorkspacesPage', () => {
  it('以原型的左侧选择栏和右侧详情组成主从布局', () => {
    renderPage();

    expect(screen.queryByRole('region', { name: '工作区指标' })).toBeNull();
    const selector = screen.getByRole('complementary', {
      name: '工作区选择',
    });
    expect(
      within(selector).getByRole('heading', { name: '我的工作区' }),
    ).toBeInTheDocument();
    expect(within(selector).getByText('按成员关系可见')).toBeInTheDocument();
    expect(
      screen.getByRole('region', { name: '营销工作区 工作区详情' }),
    ).toBeInTheDocument();
    expect(screen.getByLabelText('营销工作区 工作区标识')).toHaveTextContent(
      '营',
    );
    expect(
      screen.getByText(
        'Owner：李强（开发Leader）· GitLab 已连接 · 成员与仓库构成业务资源边界',
      ),
    ).toBeInTheDocument();
    expect(screen.queryByText('当前 Workspace')).not.toBeInTheDocument();
    const detailCard = screen
      .getByRole('region', { name: '营销工作区 工作区详情' })
      .querySelector('[data-workspace-surface]');
    expect(detailCard).toBeInstanceOf(HTMLElement);
    if (!(detailCard instanceof HTMLElement)) {
      throw new TypeError('工作区详情卡片没有渲染为 HTMLElement');
    }
    expect(getComputedStyle(detailCard).boxShadow).toBe('');
  });

  it('默认选中营销工作区并展示原型成员面板', () => {
    renderPage();

    expect(screen.getByRole('button', { name: /营销工作区/ })).toHaveAttribute(
      'aria-pressed',
      'true',
    );
    expect(
      screen.getByRole('button', { name: /营销工作区.*Owner/ }),
    ).toBeInTheDocument();
    expect(screen.getByRole('tab', { name: '成员' })).toHaveAttribute(
      'aria-selected',
      'true',
    );

    const memberList = screen.getByRole('list', {
      name: '营销工作区 成员',
    });
    expect(within(memberList).getAllByRole('listitem')).toHaveLength(8);
    expect(
      within(memberList).getByRole('listitem', { name: /李强.*Owner/ }),
    ).toBeInTheDocument();
    expect(
      within(memberList).getByRole('listitem', { name: /赵敏.*临时协作/ }),
    ).toBeInTheDocument();
  });

  it('切换仓库与设置 Tab 显示当前工作区配置', async () => {
    const user = userEvent.setup();
    renderPage();

    const repositoryPanel = await openTab(user, '仓库');
    const repository = within(repositoryPanel).getByRole('listitem', {
      name: 'mk-activity-h5 仓库',
    });
    expect(repository).toHaveTextContent('React');
    expect(
      within(repositoryPanel).queryByRole('listitem', {
        name: 'mk-legacy-h5 仓库',
      }),
    ).toBeInTheDocument();

    const settingsPanel = await openTab(user, '设置');
    expect(
      within(settingsPanel).getByRole('heading', {
        name: '工作区设置',
      }),
    ).toBeInTheDocument();
    expect(within(settingsPanel).getByLabelText('工作区名称')).toHaveValue(
      '营销工作区',
    );
  });

  it('切换到历史活动专区后更新成员与仓库内容', async () => {
    const user = userEvent.setup();
    renderPage();

    const archivedWorkspace = screen.getByRole('button', {
      name: /历史活动专区/,
    });
    await user.click(archivedWorkspace);

    expect(archivedWorkspace).toHaveAttribute('aria-pressed', 'true');
    expect(screen.getByRole('tab', { name: '成员' })).toHaveAttribute(
      'aria-selected',
      'true',
    );
    const memberList = screen.getByRole('list', {
      name: '历史活动专区 成员',
    });
    expect(within(memberList).getAllByRole('listitem')).toHaveLength(3);
    expect(
      within(memberList).getByRole('listitem', { name: /李强/ }),
    ).toBeInTheDocument();
    expect(
      within(memberList).queryByRole('listitem', { name: /赵敏/ }),
    ).not.toBeInTheDocument();

    const repositoryPanel = await openTab(user, '仓库');
    expect(
      within(repositoryPanel).getByRole('listitem', {
        name: 'mk-legacy-h5 仓库',
      }),
    ).toHaveTextContent('jQuery');
    expect(
      within(repositoryPanel).queryByRole('listitem', {
        name: 'mk-activity-h5 仓库',
      }),
    ).not.toBeInTheDocument();
  });

  it('添加成员提交后仅提示且关闭重开仍保留原 fixture', async () => {
    const user = userEvent.setup();
    renderPage();

    const memberList = screen.getByRole('list', {
      name: '营销工作区 成员',
    });
    const memberCount = within(memberList).getAllByRole('listitem').length;

    await user.click(screen.getByRole('button', { name: '添加成员' }));
    const dialog = await screen.findByRole('dialog', { name: '添加成员' });
    await user.click(
      within(dialog).getByRole('combobox', { name: '选择成员' }),
    );
    await user.click(
      await screen.findByRole('option', { name: '宋佳 · 前端开发 · 交易' }),
    );
    await user.click(within(dialog).getByRole('button', { name: '确认添加' }));

    await waitFor(() => {
      expect(
        screen.queryByRole('dialog', { name: '添加成员' }),
      ).not.toBeInTheDocument();
    });
    expect(await screen.findByRole('alert')).toHaveTextContent(
      '静态原型操作：添加成员，未保存任何业务数据。',
    );
    expect(
      within(
        screen.getByRole('list', { name: '营销工作区 成员' }),
      ).getAllByRole('listitem'),
    ).toHaveLength(memberCount);

    await user.click(screen.getByRole('button', { name: '添加成员' }));
    expect(
      await screen.findByRole('dialog', { name: '添加成员' }),
    ).toBeInTheDocument();
    expect(
      within(
        screen.getByRole('list', { name: '营销工作区 成员' }),
      ).getAllByRole('listitem'),
    ).toHaveLength(memberCount);
  });

  it('更新 GitLab Connection 只提示且不改仓库 fixture', async () => {
    const user = userEvent.setup();
    renderPage();

    const repositoryPanel = await openTab(user, '仓库');
    await user.click(
      within(repositoryPanel).getByRole('button', { name: '更新连接' }),
    );
    const dialog = await screen.findByRole('dialog', {
      name: '更新 GitLab Connection',
    });
    expect(
      within(dialog).getByRole('textbox', { name: 'GitLab 地址' }),
    ).toHaveValue('https://git.corp.example.com');
    await user.click(within(dialog).getByRole('button', { name: '保存连接' }));

    await waitFor(() => {
      expect(
        screen.queryByRole('dialog', { name: '更新 GitLab Connection' }),
      ).not.toBeInTheDocument();
    });
    expect(await screen.findByRole('alert')).toHaveTextContent(
      '静态原型操作：更新 GitLab Connection，未保存任何业务数据。',
    );
    expect(
      within(repositoryPanel).getByRole('listitem', {
        name: 'mk-activity-h5 仓库',
      }),
    ).toHaveTextContent('React');
  });

  it('保存工作区名称只提示且不改工作区 fixture', async () => {
    const user = userEvent.setup();
    renderPage();

    const settingsPanel = await openTab(user, '设置');
    const input = within(settingsPanel).getByLabelText('工作区名称');
    await user.clear(input);
    await user.type(input, '不会保存的工作区名称');
    await user.click(
      within(settingsPanel).getByRole('button', { name: /保\s*存/ }),
    );
    expect(await screen.findByRole('alert')).toHaveTextContent(
      '静态原型操作：保存工作区名称，未保存任何业务数据。',
    );
    expect(screen.getByRole('heading', { name: '营销工作区' })).toBeVisible();
  });
});
