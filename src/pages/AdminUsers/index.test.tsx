import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent, { type UserEvent } from '@testing-library/user-event';
import { App } from 'antd';
import { describe, expect, it } from 'vitest';
import AdminUsersPage from '.';

const PRO_TABLE_INITIAL_ROW_WAIT_OPTIONS = { timeout: 5_000 };

function renderPage() {
  return render(
    <App>
      <AdminUsersPage />
    </App>,
  );
}

async function selectOption(user: UserEvent, label: string, option: string) {
  await user.click(screen.getByRole('combobox', { name: label }));
  await user.click(await screen.findByRole('option', { name: option }));
}

async function expectStaticAction(action: string) {
  const expected = `静态原型操作：${action}，未保存任何业务数据。`;

  await waitFor(() => {
    expect(
      screen
        .getAllByRole('alert')
        .some((alert) => alert.textContent?.includes(expected)),
    ).toBe(true);
  });
}

describe('AdminUsersPage', () => {
  it('呈现四个冻结用户、筛选工具栏和 1120px 横向表格', async () => {
    renderPage();

    expect(
      screen.getByRole('toolbar', { name: '用户筛选与操作' }),
    ).toBeInTheDocument();
    expect(
      await screen.findByRole(
        'row',
        { name: /示例用户甲/ },
        PRO_TABLE_INITIAL_ROW_WAIT_OPTIONS,
      ),
    ).toBeInTheDocument();
    expect(screen.getByRole('row', { name: /示例用户乙/ })).toBeInTheDocument();
    expect(screen.getByRole('row', { name: /示例用户丙/ })).toBeInTheDocument();
    expect(screen.getByRole('row', { name: /示例用户丁/ })).toBeInTheDocument();

    const table = screen.getByRole('table');
    expect(table).toHaveStyle({ width: '1120px' });
    expect(within(table).getAllByRole('row')).toHaveLength(5);
  });

  it('可组合搜索、状态与角色筛选可见用户', async () => {
    const user = userEvent.setup();
    renderPage();
    await screen.findByRole(
      'row',
      { name: /示例用户甲/ },
      PRO_TABLE_INITIAL_ROW_WAIT_OPTIONS,
    );

    await user.type(
      screen.getByRole('searchbox', { name: '搜索用户' }),
      'user.b@example.test',
    );
    await selectOption(user, '用户状态', '活跃');
    await selectOption(user, '用户角色', 'Reviewer');

    await waitFor(() => {
      expect(
        screen.getByRole('row', { name: /示例用户乙/ }),
      ).toBeInTheDocument();
      expect(
        screen.queryByRole('row', { name: /示例用户甲/ }),
      ).not.toBeInTheDocument();
      expect(
        screen.queryByRole('row', { name: /示例用户丙/ }),
      ).not.toBeInTheDocument();
      expect(
        screen.queryByRole('row', { name: /示例用户丁/ }),
      ).not.toBeInTheDocument();
    });
  });

  it('新增 Modal 包含规定字段，合法提交只提示且不新增用户', async () => {
    const user = userEvent.setup();
    renderPage();

    const table = await screen.findByRole('table');
    await waitFor(() => {
      expect(within(table).getAllByRole('row')).toHaveLength(5);
    });
    const initialRowCount = within(table).getAllByRole('row').length;

    await user.click(screen.getByRole('button', { name: '新增用户' }));
    const dialog = await screen.findByRole('dialog', { name: '新增用户' });

    await user.type(
      within(dialog).getByRole('textbox', { name: '员工编号' }),
      '10000005',
    );
    await user.type(
      within(dialog).getByRole('textbox', { name: '姓名' }),
      '临时用户',
    );
    await user.type(
      within(dialog).getByRole('textbox', { name: '邮箱' }),
      'temporary@example.test',
    );
    await selectOption(user, '角色', 'Developer');
    await selectOption(user, '状态', '活跃');
    await user.click(within(dialog).getByRole('button', { name: /新\s*增/ }));

    await expectStaticAction('新增用户');
    await waitFor(() => {
      expect(
        screen.queryByRole('dialog', { name: '新增用户' }),
      ).not.toBeInTheDocument();
    });
    expect(within(screen.getByRole('table')).getAllByRole('row')).toHaveLength(
      initialRowCount,
    );
    expect(
      screen.queryByRole('row', { name: /临时用户/ }),
    ).not.toBeInTheDocument();
  });

  it('编辑 Modal 回填用户，提交后仍保留 fixture 名称与状态', async () => {
    const user = userEvent.setup();
    renderPage();

    const userRow = await screen.findByRole(
      'row',
      { name: /示例用户乙/ },
      PRO_TABLE_INITIAL_ROW_WAIT_OPTIONS,
    );
    await user.click(within(userRow).getByRole('button', { name: '编辑' }));
    const dialog = await screen.findByRole('dialog', { name: '编辑用户' });
    const nameInput = within(dialog).getByRole('textbox', { name: '姓名' });

    expect(
      within(dialog).getByRole('textbox', { name: '员工编号' }),
    ).toHaveValue('10000002');
    expect(nameInput).toHaveValue('示例用户乙');
    expect(within(dialog).getByRole('textbox', { name: '邮箱' })).toHaveValue(
      'user.b@example.test',
    );
    expect(
      within(dialog).getByRole('combobox', { name: '角色' }),
    ).toBeInTheDocument();
    expect(
      within(dialog).getByRole('combobox', { name: '状态' }),
    ).toBeInTheDocument();
    expect(dialog).toHaveTextContent('Workspace Admin');
    expect(dialog).toHaveTextContent('Reviewer');
    expect(dialog).toHaveTextContent('活跃');

    await user.clear(nameInput);
    await user.type(nameInput, '不会保存的姓名');
    await user.click(within(dialog).getByRole('button', { name: /保\s*存/ }));

    await expectStaticAction('编辑用户 10000002');
    await waitFor(() => {
      expect(
        screen.queryByRole('dialog', { name: '编辑用户' }),
      ).not.toBeInTheDocument();
    });

    const unchangedRow = screen.getByRole('row', { name: /示例用户乙/ });
    expect(unchangedRow).not.toHaveTextContent('不会保存的姓名');
    expect(unchangedRow).toHaveTextContent('活跃');
  });

  it('禁用与重置凭据只提示，不改变用户行或状态', async () => {
    const user = userEvent.setup();
    renderPage();

    const table = await screen.findByRole('table');
    const userRow = await screen.findByRole(
      'row',
      { name: /示例用户甲/ },
      PRO_TABLE_INITIAL_ROW_WAIT_OPTIONS,
    );
    const initialRowCount = within(table).getAllByRole('row').length;

    await user.click(within(userRow).getByRole('button', { name: '禁用' }));
    await expectStaticAction('禁用用户 10000001');

    await user.click(within(userRow).getByRole('button', { name: '重置凭据' }));
    await expectStaticAction('重置用户凭据 10000001');

    expect(within(table).getAllByRole('row')).toHaveLength(initialRowCount);
    expect(screen.getByRole('row', { name: /示例用户甲/ })).toHaveTextContent(
      '活跃',
    );
  });
});
