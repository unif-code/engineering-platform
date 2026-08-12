import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { App } from 'antd';
import { describe, expect, it } from 'vitest';
import AdminRolesPage from '.';

function renderPage() {
  return render(
    <App>
      <AdminRolesPage />
    </App>,
  );
}

function getRoleButton(name: string) {
  return within(screen.getByRole('navigation', { name: '角色列表' })).getByRole(
    'button',
    { name: new RegExp(`^${name}(?:\\s|$)`) },
  );
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

describe('AdminRolesPage', () => {
  it('按原型呈现八个角色与产品能力配置', () => {
    renderPage();

    const roleList = screen.getByRole('navigation', { name: '角色列表' });
    expect(
      within(roleList)
        .getAllByRole('button')
        .filter((button) => button.hasAttribute('aria-pressed')),
    ).toHaveLength(8);
    expect(
      within(roleList).getByRole('button', { name: '新建角色' }),
    ).toBeInTheDocument();
    expect(getRoleButton('产品')).toHaveAttribute('aria-pressed', 'true');
    expect(getRoleButton('产品Leader')).toBeInTheDocument();
    expect(getRoleButton('前端开发')).toBeInTheDocument();
    expect(getRoleButton('后端开发')).toBeInTheDocument();
    expect(getRoleButton('开发Leader')).toBeInTheDocument();
    expect(getRoleButton('经理')).toBeInTheDocument();
    expect(getRoleButton('管理员')).toBeInTheDocument();
    expect(getRoleButton('超级管理员')).toBeInTheDocument();

    const matrix = screen.getByRole('region', { name: '产品能力配置' });
    expect(within(matrix).getByText('「产品」的能力配置')).toBeInTheDocument();
    expect(
      within(matrix).getByRole('group', { name: '业务能力' }),
    ).toBeInTheDocument();
    expect(
      within(matrix).getByRole('group', { name: '观测能力' }),
    ).toBeInTheDocument();
    expect(
      within(matrix).getByRole('group', { name: '管理端能力' }),
    ).toBeInTheDocument();
    expect(within(matrix).getAllByRole('checkbox')).toHaveLength(18);
    expect(
      within(matrix).getByRole('checkbox', { name: /task\.create/ }),
    ).toBeChecked();
    expect(
      within(matrix).getByRole('checkbox', { name: /admin\.menu/ }),
    ).not.toBeChecked();
    expect(
      within(matrix).getByRole('checkbox', { name: /admin\.org/ }),
    ).not.toBeChecked();
    expect(
      within(matrix).getByRole('checkbox', { name: /admin\.grant/ }),
    ).not.toBeChecked();
    expect(
      within(matrix).getByRole('checkbox', { name: /admin\.policy/ }),
    ).not.toBeChecked();
    expect(
      screen.getByText(
        '角色只是标签：能力可自由组合授予任何角色。授权结论来自服务端 Capability + Scope + Assignment。',
      ),
    ).toBeInTheDocument();
    expect(
      within(matrix).getByText(
        '勾选即授予；持有该角色的登录用户菜单与按钮即时变化（可用右下角切换器验证）',
      ),
    ).toBeVisible();
    expect(within(matrix).getByRole('note')).toHaveTextContent(
      '静态预览 · 当前勾选仅在本页面临时生效，不写入服务端',
    );
  });

  it('选择开发Leader 后切换为对应能力组合', async () => {
    const user = userEvent.setup();
    renderPage();

    await user.click(getRoleButton('开发Leader'));

    const matrix = screen.getByRole('region', { name: '开发Leader能力配置' });
    expect(
      within(matrix).getByRole('checkbox', { name: /task\.review/ }),
    ).toBeChecked();
    expect(
      within(matrix).getByRole('checkbox', { name: /mr\.merge/ }),
    ).toBeChecked();
    expect(
      within(matrix).getByRole('checkbox', { name: /admin\.model/ }),
    ).not.toBeChecked();
  });

  it('勾选一个能力时保留其他分组的临时选择', async () => {
    const user = userEvent.setup();
    renderPage();

    await user.click(getRoleButton('开发Leader'));
    const matrix = screen.getByRole('region', { name: '开发Leader能力配置' });
    const businessCapability = within(matrix).getByRole('checkbox', {
      name: /task\.review/,
    });
    const adminCapability = within(matrix).getByRole('checkbox', {
      name: /admin\.model/,
    });

    await user.click(adminCapability);

    expect(adminCapability).toBeChecked();
    expect(businessCapability).toBeChecked();
  });

  it('切换角色后丢弃临时能力勾选并从 fixture 重建', async () => {
    const user = userEvent.setup();
    renderPage();

    await user.click(getRoleButton('开发Leader'));
    const adminCapability = within(
      screen.getByRole('region', { name: '开发Leader能力配置' }),
    ).getByRole('checkbox', { name: /admin\.model/ });
    await user.click(adminCapability);
    expect(adminCapability).toBeChecked();

    await user.click(getRoleButton('经理'));
    await user.click(getRoleButton('开发Leader'));

    expect(
      within(
        screen.getByRole('region', { name: '开发Leader能力配置' }),
      ).getByRole('checkbox', { name: /admin\.model/ }),
    ).not.toBeChecked();
  });

  it('超级管理员默认拥有全部能力且受保护不可修改', async () => {
    const user = userEvent.setup();
    renderPage();

    await user.click(getRoleButton('超级管理员'));
    const matrix = screen.getByRole('region', { name: '超级管理员能力配置' });
    const capabilities = within(matrix).getAllByRole('checkbox');

    expect(capabilities).toHaveLength(18);
    expect(
      capabilities.every((capability) => capability.matches(':checked')),
    ).toBe(true);
    expect(
      capabilities.every((capability) => capability.matches(':disabled')),
    ).toBe(true);
    expect(
      within(matrix).getByText('超级管理员默认拥有全部能力 · 不允许删除或修改'),
    ).toBeInTheDocument();
  });

  it('删除角色只反馈且不替换当前 fixture', async () => {
    const user = userEvent.setup();
    renderPage();

    await user.click(getRoleButton('开发Leader'));
    const matrix = screen.getByRole('region', { name: '开发Leader能力配置' });
    await user.click(within(matrix).getByRole('button', { name: '删除角色' }));

    await expectStaticAction('删除角色 开发Leader');
    expect(getRoleButton('开发Leader')).toHaveAttribute('aria-pressed', 'true');
    expect(
      within(matrix).queryByRole('button', { name: '保存变更' }),
    ).not.toBeInTheDocument();
  });

  it('新建角色包含原型字段，合法提交只反馈且不写入 fixtures', async () => {
    const user = userEvent.setup();
    renderPage();

    await user.click(screen.getByRole('button', { name: '新建角色' }));
    const dialog = await screen.findByRole('dialog', { name: '新建角色' });
    await user.type(
      within(dialog).getByRole('textbox', { name: '角色名称' }),
      '测试工程师',
    );
    await user.type(
      within(dialog).getByRole('textbox', { name: '描述' }),
      '负责交付质量验证',
    );
    await user.click(
      within(dialog).getByRole('combobox', { name: '初始能力' }),
    );
    expect(
      screen.getByRole('option', { name: '合并代码 (MR)' }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole('option', { name: '团队看板' }),
    ).toBeInTheDocument();
    await user.click(await screen.findByRole('option', { name: '开发任务' }));
    await user.click(within(dialog).getByRole('button', { name: /创\s*建/ }));

    await expectStaticAction('新建角色');
    await waitFor(() => {
      expect(
        screen.queryByRole('dialog', { name: '新建角色' }),
      ).not.toBeInTheDocument();
    });
    expect(getRoleButton('产品')).toHaveAttribute('aria-pressed', 'true');
    expect(
      within(screen.getByRole('navigation', { name: '角色列表' })).queryByRole(
        'button',
        { name: /测试工程师/ },
      ),
    ).not.toBeInTheDocument();
  });
});
