import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent, { type UserEvent } from '@testing-library/user-event';
import { App } from 'antd';
import { describe, expect, it } from 'vitest';
import AdminMenusPage from '.';

const INTERACTION_TEST_TIMEOUT = 30_000;
const TABLE_UPDATE_TIMEOUT = 10_000;

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
  it('呈现 13 个 Registry 菜单、筛选工具栏和 1050px 横向表格', async () => {
    renderPage();

    expect(
      screen.getByRole('toolbar', { name: '菜单筛选与操作' }),
    ).toBeInTheDocument();
    expect(
      await screen.findByRole('row', { name: /工作台/ }),
    ).toBeInTheDocument();
    expect(screen.getByRole('row', { name: /审计看板/ })).toBeInTheDocument();
    expect(screen.getByRole('row', { name: /管理概览/ })).toBeInTheDocument();
    expect(screen.getByRole('row', { name: /菜单管理/ })).toBeInTheDocument();

    const table = screen.getByRole('table');
    expect(table).toHaveStyle({ width: '1050px' });
    expect(within(table).getAllByRole('row')).toHaveLength(14);
    expect(within(table).getAllByRole('switch')).toHaveLength(13);
  });

  it(
    '可按用户端和管理端筛选菜单',
    async () => {
      const user = userEvent.setup();
      renderPage();
      await screen.findByRole('row', { name: /工作台/ });

      await selectOption(user, '菜单分组', '管理端');

      await waitFor(
        () => {
          expect(
            screen.getByRole('row', { name: /管理概览/ }),
          ).toBeInTheDocument();
          expect(
            screen.getByRole('row', { name: /菜单管理/ }),
          ).toBeInTheDocument();
          expect(
            screen.queryByRole('row', { name: /工作台/ }),
          ).not.toBeInTheDocument();
          expect(
            screen.queryByRole('row', { name: /审计看板/ }),
          ).not.toBeInTheDocument();
        },
        { timeout: TABLE_UPDATE_TIMEOUT },
      );

      expect(
        within(screen.getByRole('table')).getAllByRole('row'),
      ).toHaveLength(8);
    },
    INTERACTION_TEST_TIMEOUT,
  );

  it(
    '点击受控 Switch 只提示，重新筛选后仍恢复 fixture 显示状态',
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

      await selectOption(user, '菜单显示状态', '已隐藏');
      await waitFor(
        () => {
          expect(
            screen.queryByRole('row', { name: /工作台/ }),
          ).not.toBeInTheDocument();
        },
        { timeout: TABLE_UPDATE_TIMEOUT },
      );

      await selectOption(user, '菜单显示状态', '已显示');
      const restoredRow = await screen.findByRole(
        'row',
        { name: /工作台/ },
        { timeout: TABLE_UPDATE_TIMEOUT },
      );
      expect(
        within(restoredRow).getByRole('switch', {
          name: '工作台显示状态',
        }),
      ).toBeChecked();
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
        expect(within(table).getAllByRole('row')).toHaveLength(14);
      });
      const initialRowCount = within(table).getAllByRole('row').length;

      await user.click(screen.getByRole('button', { name: '新增菜单' }));
      const dialog = await screen.findByRole('dialog', { name: '新增菜单' });

      await user.type(
        within(dialog).getByRole('textbox', { name: 'Route Key' }),
        'prototypeMenu',
      );
      await user.type(
        within(dialog).getByRole('textbox', { name: '菜单名称' }),
        '临时菜单',
      );
      await user.type(
        within(dialog).getByRole('textbox', { name: '路径' }),
        '/prototype-menu',
      );
      await selectOption(user, '分组', '管理端');
      const orderInput = within(dialog).getByRole('spinbutton', {
        name: '顺序',
      });
      await user.clear(orderInput);
      await user.type(orderInput, '99');
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

      expect(
        within(dialog).getByRole('textbox', { name: 'Route Key' }),
      ).toHaveValue('home');
      expect(nameInput).toHaveValue('工作台');
      expect(within(dialog).getByRole('textbox', { name: '路径' })).toHaveValue(
        '/home',
      );
      await user.click(within(dialog).getByRole('combobox', { name: '分组' }));
      const selectedGroupOption = await screen.findByRole('option', {
        name: '用户端',
        selected: true,
      });
      expect(selectedGroupOption).toBeInTheDocument();
      await user.click(selectedGroupOption);
      expect(
        within(dialog).getByRole('spinbutton', { name: '顺序' }),
      ).toHaveValue('1');

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
