import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent, { type UserEvent } from '@testing-library/user-event';
import { App } from 'antd';
import { describe, expect, it } from 'vitest';
import AdminMenusPage from '.';

const INTERACTION_TEST_TIMEOUT = 30_000;

function renderPage() {
  return render(
    <App>
      <AdminMenusPage />
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

describe('AdminMenusPage', () => {
  it('按原型呈现 16 个独立 Registry 菜单与六列表格', async () => {
    renderPage();

    expect(
      screen.getByText(
        '菜单按登录人能力动态渲染；可见性只改善体验，不构成授权边界（服务端始终校验）',
      ),
    ).toBeInTheDocument();
    expect(
      screen.getByRole('button', { name: '新增菜单' }),
    ).toBeInTheDocument();
    expect(
      await screen.findByRole('row', { name: /工作台/ }),
    ).toBeInTheDocument();
    expect(screen.getByRole('row', { name: /审计看板/ })).toBeInTheDocument();
    expect(screen.getByRole('row', { name: /组织管理/ })).toBeInTheDocument();
    expect(screen.getByRole('row', { name: /Grant 管理/ })).toBeInTheDocument();
    expect(
      screen.getByRole('row', { name: /Policy 发布/ }),
    ).toBeInTheDocument();
    expect(
      screen.queryByRole('row', { name: /管理概览/ }),
    ).not.toBeInTheDocument();
    expect(screen.getByRole('row', { name: /菜单管理/ })).toBeInTheDocument();

    const table = screen.getByRole('table');
    expect(table).toHaveStyle({ width: '980px' });
    expect(
      within(table)
        .getAllByRole('columnheader')
        .map((header) => header.textContent),
    ).toEqual(['', '菜单', '分组', '可见条件', '状态', '操作']);
    expect(within(table).getAllByRole('row')).toHaveLength(17);
    expect(within(table).getAllByRole('switch')).toHaveLength(16);
    for (const name of ['组织管理', 'Grant 管理', 'Policy 发布']) {
      const row = screen.getByRole('row', {
        name: new RegExp(`${name}.*新增`),
      });
      expect(within(row).getByText(name, { exact: true })).toBeVisible();
      expect(within(row).getByText('新增', { exact: true })).toBeVisible();
    }
    expect(screen.queryByText(/（新增）/)).not.toBeInTheDocument();
    expect(
      screen.queryByText(
        '维护静态 Route Registry 的菜单展示副本；当前操作不会保存',
      ),
    ).not.toBeInTheDocument();
  });

  it('不显示原型没有的分组、状态筛选与汇总', async () => {
    renderPage();
    await screen.findByRole('row', { name: /工作台/ });

    expect(screen.queryByRole('combobox')).not.toBeInTheDocument();
    expect(screen.queryByText('共 16 个菜单')).not.toBeInTheDocument();
  });

  it(
    '点击受控 Switch 只提示且保持 Registry fixture 状态',
    async () => {
      const user = userEvent.setup();
      renderPage();

      const homeRow = await screen.findByRole('row', { name: /工作台/ });
      const visibilitySwitch = within(homeRow).getByRole('switch', {
        name: '工作台显示状态',
      });
      expect(visibilitySwitch).toBeChecked();

      await user.click(visibilitySwitch);
      await expectStaticAction('隐藏菜单 home');
      expect(visibilitySwitch).toBeChecked();
    },
    INTERACTION_TEST_TIMEOUT,
  );

  it(
    '新增 Modal 合法提交只提示且不新增菜单行',
    async () => {
      const user = userEvent.setup();
      renderPage();

      const table = await screen.findByRole('table');
      await waitFor(() => {
        expect(within(table).getAllByRole('row')).toHaveLength(17);
      });
      const initialRowCount = within(table).getAllByRole('row').length;

      await user.click(screen.getByRole('button', { name: '新增菜单' }));
      const dialog = await screen.findByRole('dialog', { name: '新增菜单' });

      await user.type(
        within(dialog).getByRole('textbox', { name: '菜单名称' }),
        '临时菜单',
      );
      await user.type(
        within(dialog).getByRole('textbox', { name: '路由' }),
        '/prototype-menu',
      );
      await selectOption(user, '分组', '管理端');
      await selectOption(user, '绑定能力', 'admin.* 管理能力');
      expect(
        within(dialog).queryByRole('spinbutton', { name: '排序' }),
      ).not.toBeInTheDocument();
      await user.click(within(dialog).getByRole('button', { name: /新\s*增/ }));

      await expectStaticAction('新增菜单');
      await waitFor(() => {
        expect(
          screen.queryByRole('dialog', { name: '新增菜单' }),
        ).not.toBeInTheDocument();
      });
      expect(
        within(screen.getByRole('table')).getAllByRole('row'),
      ).toHaveLength(initialRowCount);
      expect(
        screen.queryByRole('row', { name: /临时菜单/ }),
      ).not.toBeInTheDocument();
    },
    INTERACTION_TEST_TIMEOUT,
  );

  it(
    '编辑 Modal 提交只提示且保留原始菜单行',
    async () => {
      const user = userEvent.setup();
      renderPage();

      let homeRow = await screen.findByRole('row', { name: /工作台/ });
      await user.click(
        within(homeRow).getByRole('button', { name: '编辑 工作台' }),
      );
      const dialog = await screen.findByRole('dialog', { name: '编辑菜单' });
      const nameInput = within(dialog).getByRole('textbox', {
        name: '菜单名称',
      });

      expect(nameInput).toHaveValue('工作台');
      expect(
        within(dialog).getByRole('combobox', { name: '绑定能力' }),
      ).toBeInTheDocument();
      expect(
        within(dialog).getByRole('combobox', { name: '分组' }),
      ).toBeInTheDocument();
      expect(
        within(dialog).queryByRole('textbox', { name: '路由' }),
      ).not.toBeInTheDocument();
      expect(
        within(dialog).queryByRole('spinbutton', { name: '排序' }),
      ).not.toBeInTheDocument();

      await user.clear(nameInput);
      await user.type(nameInput, '不会保存的名称');
      await user.click(within(dialog).getByRole('button', { name: /保\s*存/ }));

      await expectStaticAction('编辑菜单 home');
      await waitFor(() => {
        expect(
          screen.queryByRole('dialog', { name: '编辑菜单' }),
        ).not.toBeInTheDocument();
      });
      homeRow = screen.getByRole('row', { name: /工作台/ });
      expect(homeRow).not.toHaveTextContent('不会保存的名称');
    },
    INTERACTION_TEST_TIMEOUT,
  );

  it(
    '上移与下移只提示且不改变菜单行',
    async () => {
      const user = userEvent.setup();
      renderPage();

      const table = await screen.findByRole('table');
      const taskRow = await screen.findByRole('row', { name: /任务/ });

      const expectFirstRowsUnchanged = () => {
        const rows = within(table).getAllByRole('row');

        expect(
          within(rows[1]).getByRole('switch', { name: '工作台显示状态' }),
        ).toBeChecked();
        expect(
          within(rows[2]).getByRole('switch', { name: '任务显示状态' }),
        ).toBeChecked();
      };

      expectFirstRowsUnchanged();

      await user.click(
        within(taskRow).getByRole('button', { name: '上移 任务' }),
      );
      await expectStaticAction('上移菜单 tasks');
      expectFirstRowsUnchanged();

      await user.click(
        within(taskRow).getByRole('button', { name: '下移 任务' }),
      );
      await expectStaticAction('下移菜单 tasks');
      expectFirstRowsUnchanged();

      expect(screen.getByRole('row', { name: /任务/ })).toBeInTheDocument();
    },
    INTERACTION_TEST_TIMEOUT,
  );
});
