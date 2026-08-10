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
  it('默认选中 Platform Core 并展示成员面板', () => {
    renderPage();

    expect(
      screen.getByRole('button', { name: /Platform Core/ }),
    ).toHaveAttribute('aria-pressed', 'true');
    expect(screen.getByRole('tab', { name: '成员' })).toHaveAttribute(
      'aria-selected',
      'true',
    );

    const memberList = screen.getByRole('list', {
      name: 'Platform Core 成员',
    });
    expect(within(memberList).getAllByRole('listitem')).toHaveLength(3);
    expect(
      within(memberList).getByRole('listitem', { name: /周天/ }),
    ).toBeInTheDocument();
  });

  it('切换仓库与设置 Tab 显示当前工作区配置', async () => {
    const user = userEvent.setup();
    renderPage();

    const repositoryPanel = await openTab(user, '仓库');
    const repository = within(repositoryPanel).getByRole('listitem', {
      name: 'engineering-platform 仓库',
    });
    expect(repository).toHaveTextContent('main');

    const settingsPanel = await openTab(user, '设置');
    expect(
      within(settingsPanel).getByRole('heading', {
        name: 'GitLab Connection',
      }),
    ).toBeInTheDocument();
    expect(
      within(settingsPanel).getByRole('heading', {
        name: 'Workspace Policy',
      }),
    ).toBeInTheDocument();
  });

  it('切换到 Agent Runtime 后更新成员与仓库内容', async () => {
    const user = userEvent.setup();
    renderPage();

    const agentRuntime = screen.getByRole('button', {
      name: /Agent Runtime/,
    });
    await user.click(agentRuntime);

    expect(agentRuntime).toHaveAttribute('aria-pressed', 'true');
    expect(screen.getByRole('tab', { name: '成员' })).toHaveAttribute(
      'aria-selected',
      'true',
    );
    const memberList = screen.getByRole('list', {
      name: 'Agent Runtime 成员',
    });
    expect(within(memberList).getAllByRole('listitem')).toHaveLength(2);
    expect(
      within(memberList).getByRole('listitem', { name: /方舟/ }),
    ).toBeInTheDocument();
    expect(
      within(memberList).queryByRole('listitem', { name: /周天/ }),
    ).not.toBeInTheDocument();

    const repositoryPanel = await openTab(user, '仓库');
    expect(
      within(repositoryPanel).getByRole('listitem', {
        name: 'platform-orchestrator 仓库',
      }),
    ).toHaveTextContent('main');
    expect(
      within(repositoryPanel).queryByRole('listitem', {
        name: 'engineering-platform 仓库',
      }),
    ).not.toBeInTheDocument();
  });

  it('添加成员提交后仅提示且关闭重开仍保留原 fixture', async () => {
    const user = userEvent.setup();
    renderPage();

    const memberList = screen.getByRole('list', {
      name: 'Platform Core 成员',
    });
    const memberCount = within(memberList).getAllByRole('listitem').length;

    await user.click(screen.getByRole('button', { name: '添加成员' }));
    const dialog = await screen.findByRole('dialog', { name: '添加成员' });
    await user.click(
      within(dialog).getByRole('combobox', { name: '选择成员' }),
    );
    await user.click(
      await screen.findByRole('option', { name: '林一 · 平台工程师' }),
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
        screen.getByRole('list', { name: 'Platform Core 成员' }),
      ).getAllByRole('listitem'),
    ).toHaveLength(memberCount);

    await user.click(screen.getByRole('button', { name: '添加成员' }));
    expect(
      await screen.findByRole('dialog', { name: '添加成员' }),
    ).toBeInTheDocument();
    expect(
      within(
        screen.getByRole('list', { name: 'Platform Core 成员' }),
      ).getAllByRole('listitem'),
    ).toHaveLength(memberCount);
  });

  it('更新 GitLab Connection 只提示且不改仓库 fixture', async () => {
    const user = userEvent.setup();
    renderPage();

    const settingsPanel = await openTab(user, '设置');
    await user.click(
      within(settingsPanel).getByRole('button', { name: '更新连接' }),
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
    const repositoryPanel = await openTab(user, '仓库');
    expect(
      within(repositoryPanel).getByRole('listitem', {
        name: 'engineering-platform 仓库',
      }),
    ).toHaveTextContent('main');
  });

  it('保存 Workspace Policy 只提示且不改工作区 fixture', async () => {
    const user = userEvent.setup();
    renderPage();

    const settingsPanel = await openTab(user, '设置');
    await user.click(
      within(settingsPanel).getByRole('button', {
        name: '保存 Workspace Policy',
      }),
    );
    expect(await screen.findByRole('alert')).toHaveTextContent(
      '静态原型操作：保存 Workspace Policy，未保存任何业务数据。',
    );
    expect(
      screen.getByRole('heading', { name: 'Platform Core' }),
    ).toBeVisible();
  });
});
