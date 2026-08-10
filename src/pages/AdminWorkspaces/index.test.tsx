import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent, { type UserEvent } from '@testing-library/user-event';
import { App } from 'antd';
import { describe, expect, it } from 'vitest';
import AdminWorkspacesPage from '.';

function renderPage() {
  return render(
    <App>
      <AdminWorkspacesPage />
    </App>,
  );
}

async function selectOption(user: UserEvent, label: string, option: string) {
  await user.click(screen.getByRole('combobox', { name: label }));
  await user.click(await screen.findByRole('option', { name: option }));
}

describe('AdminWorkspacesPage', () => {
  it('呈现三个固定工作区、筛选工具栏和 1050px 横向表格', async () => {
    renderPage();

    expect(
      screen.getByRole('toolbar', { name: '工作区筛选与操作' }),
    ).toBeInTheDocument();
    expect(
      await screen.findByRole('row', { name: /Platform Core/ }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole('row', { name: /Agent Runtime/ }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole('row', { name: /Delivery Governance/ }),
    ).toBeInTheDocument();

    const table = screen.getByRole('table');
    expect(table).toHaveStyle({ width: '1050px' });
    expect(within(table).getAllByRole('row')).toHaveLength(4);
  });

  it('可通过搜索与状态筛选可见工作区', async () => {
    const user = userEvent.setup();
    renderPage();
    await screen.findByRole('row', { name: /Platform Core/ });

    const search = screen.getByRole('searchbox', { name: '搜索工作区' });
    await user.type(search, 'Agent');

    await waitFor(() => {
      expect(
        screen.getByRole('row', { name: /Agent Runtime/ }),
      ).toBeInTheDocument();
      expect(
        screen.queryByRole('row', { name: /Platform Core/ }),
      ).not.toBeInTheDocument();
      expect(
        screen.queryByRole('row', { name: /Delivery Governance/ }),
      ).not.toBeInTheDocument();
    });

    await user.clear(search);
    await selectOption(user, '工作区状态', '受限');

    await waitFor(() => {
      expect(
        screen.getByRole('row', { name: /Delivery Governance/ }),
      ).toBeInTheDocument();
      expect(
        screen.queryByRole('row', { name: /Platform Core/ }),
      ).not.toBeInTheDocument();
      expect(
        screen.queryByRole('row', { name: /Agent Runtime/ }),
      ).not.toBeInTheDocument();
    });
  });

  it('创建 Modal 包含规定字段，合法提交只提示且不新增工作区', async () => {
    const user = userEvent.setup();
    renderPage();

    const table = await screen.findByRole('table');
    await waitFor(() => {
      expect(within(table).getAllByRole('row')).toHaveLength(4);
    });
    const initialRowCount = within(table).getAllByRole('row').length;

    await user.click(screen.getByRole('button', { name: '创建工作区' }));
    const dialog = await screen.findByRole('dialog', { name: '创建工作区' });

    await user.type(
      within(dialog).getByRole('textbox', { name: '名称' }),
      'Prototype Workspace',
    );
    await user.type(
      within(dialog).getByRole('textbox', { name: 'Owner' }),
      '林一',
    );
    await selectOption(user, '默认 Team', 'Platform');
    await user.type(
      within(dialog).getByRole('textbox', { name: '说明' }),
      '仅用于验证静态原型交互',
    );
    await user.click(within(dialog).getByRole('button', { name: /创\s*建/ }));

    expect(await screen.findByRole('alert')).toHaveTextContent(
      '静态原型操作：创建工作区，未保存任何业务数据。',
    );
    await waitFor(() => {
      expect(
        screen.queryByRole('dialog', { name: '创建工作区' }),
      ).not.toBeInTheDocument();
    });
    expect(within(screen.getByRole('table')).getAllByRole('row')).toHaveLength(
      initialRowCount,
    );
    expect(
      screen.queryByRole('row', { name: /Prototype Workspace/ }),
    ).not.toBeInTheDocument();
  });

  it('查看与编辑只产生视觉反馈且不修改工作区行', async () => {
    const user = userEvent.setup();
    renderPage();

    const table = await screen.findByRole('table');
    const workspaceRow = await screen.findByRole('row', {
      name: /Platform Core/,
    });
    const initialRowCount = within(table).getAllByRole('row').length;

    await user.click(
      within(workspaceRow).getByRole('button', { name: '查看' }),
    );
    expect(await screen.findByRole('alert')).toHaveTextContent(
      '静态原型操作：查看工作区 Platform Core，未保存任何业务数据。',
    );

    await user.click(
      within(workspaceRow).getByRole('button', { name: '编辑' }),
    );
    await waitFor(() => {
      expect(
        screen
          .getAllByRole('alert')
          .some((alert) =>
            alert.textContent?.includes(
              '静态原型操作：编辑工作区 Platform Core，未保存任何业务数据。',
            ),
          ),
      ).toBe(true);
    });
    expect(within(table).getAllByRole('row')).toHaveLength(initialRowCount);
    expect(
      screen.getByRole('row', { name: /Platform Core/ }),
    ).toBeInTheDocument();
  });
});
