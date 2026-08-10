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
    { name: new RegExp(name) },
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
  it('默认呈现四个固定 Role 与 Platform Admin Capability 矩阵', () => {
    renderPage();

    const roleList = screen.getByRole('navigation', { name: '角色列表' });
    expect(within(roleList).getAllByRole('button')).toHaveLength(4);
    expect(getRoleButton('Platform Admin')).toHaveAttribute(
      'aria-pressed',
      'true',
    );
    expect(getRoleButton('Workspace Admin')).toBeInTheDocument();
    expect(getRoleButton('Developer')).toBeInTheDocument();
    expect(getRoleButton('Reviewer')).toBeInTheDocument();

    const matrix = screen.getByRole('region', {
      name: 'Platform Admin Capability 矩阵',
    });
    expect(
      within(matrix).getByRole('group', { name: 'Requirement Capability' }),
    ).toBeInTheDocument();
    expect(
      within(matrix).getByRole('group', { name: 'Artifact Capability' }),
    ).toBeInTheDocument();
    expect(
      within(matrix).getByRole('group', { name: 'Execution Capability' }),
    ).toBeInTheDocument();
    expect(
      within(matrix).getByRole('group', { name: 'Promotion Capability' }),
    ).toBeInTheDocument();
    expect(
      within(matrix).getByRole('checkbox', { name: /promotion\.approve/ }),
    ).toBeChecked();
  });

  it('选择 Workspace Admin 后切换为对应 Capability 选择', async () => {
    const user = userEvent.setup();
    renderPage();

    await user.click(getRoleButton('Workspace Admin'));

    expect(getRoleButton('Workspace Admin')).toHaveAttribute(
      'aria-pressed',
      'true',
    );
    const matrix = screen.getByRole('region', {
      name: 'Workspace Admin Capability 矩阵',
    });
    expect(
      within(matrix).getByRole('checkbox', { name: /requirement\.manage/ }),
    ).toBeChecked();
    expect(
      within(matrix).getByRole('checkbox', { name: /promotion\.approve/ }),
    ).not.toBeChecked();
  });

  it('勾选一个 Capability 时保留其他分组的临时选择', async () => {
    const user = userEvent.setup();
    renderPage();

    await user.click(getRoleButton('Workspace Admin'));
    const matrix = screen.getByRole('region', {
      name: 'Workspace Admin Capability 矩阵',
    });
    const requirementCapability = within(matrix).getByRole('checkbox', {
      name: /requirement\.manage/,
    });
    const promotionCapability = within(matrix).getByRole('checkbox', {
      name: /promotion\.approve/,
    });

    expect(requirementCapability).toBeChecked();
    await user.click(promotionCapability);

    expect(promotionCapability).toBeChecked();
    expect(requirementCapability).toBeChecked();
  });

  it('切换 Role 后丢弃临时 Capability 勾选并从 fixture 重建', async () => {
    const user = userEvent.setup();
    renderPage();

    await user.click(getRoleButton('Workspace Admin'));
    const temporaryCapability = within(
      screen.getByRole('region', {
        name: 'Workspace Admin Capability 矩阵',
      }),
    ).getByRole('checkbox', { name: /promotion\.approve/ });
    expect(temporaryCapability).not.toBeChecked();

    await user.click(temporaryCapability);
    expect(temporaryCapability).toBeChecked();

    await user.click(getRoleButton('Developer'));
    await user.click(getRoleButton('Workspace Admin'));

    expect(
      within(
        screen.getByRole('region', {
          name: 'Workspace Admin Capability 矩阵',
        }),
      ).getByRole('checkbox', { name: /promotion\.approve/ }),
    ).not.toBeChecked();
  });

  it('保存与删除 Role 只反馈且不替换当前 fixture', async () => {
    const user = userEvent.setup();
    renderPage();

    await user.click(getRoleButton('Workspace Admin'));
    const matrix = screen.getByRole('region', {
      name: 'Workspace Admin Capability 矩阵',
    });

    await user.click(within(matrix).getByRole('button', { name: '保存变更' }));
    await expectStaticAction('保存角色 Workspace Admin');
    expect(getRoleButton('Workspace Admin')).toHaveAttribute(
      'aria-pressed',
      'true',
    );

    await user.click(within(matrix).getByRole('button', { name: '删除角色' }));
    await expectStaticAction('删除角色 Workspace Admin');
    expect(getRoleButton('Workspace Admin')).toHaveAttribute(
      'aria-pressed',
      'true',
    );
  });

  it('新建 Role 合法提交只反馈且不写入角色 fixtures', async () => {
    const user = userEvent.setup();
    renderPage();

    await user.click(screen.getByRole('button', { name: '新建 Role' }));
    const dialog = await screen.findByRole('dialog', { name: '新建 Role' });
    await user.type(
      within(dialog).getByRole('textbox', { name: '角色名称' }),
      'Release Operator',
    );
    await user.type(
      within(dialog).getByRole('textbox', { name: '角色说明' }),
      '仅用于验证静态 Role 创建流程',
    );
    await user.click(within(dialog).getByRole('button', { name: /创\s*建/ }));

    await expectStaticAction('新建角色');
    await waitFor(() => {
      expect(
        screen.queryByRole('dialog', { name: '新建 Role' }),
      ).not.toBeInTheDocument();
    });
    expect(getRoleButton('Platform Admin')).toHaveAttribute(
      'aria-pressed',
      'true',
    );
    expect(
      within(screen.getByRole('navigation', { name: '角色列表' })).queryByRole(
        'button',
        { name: /Release Operator/ },
      ),
    ).not.toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: '新建 Role' }));
    const reopenedDialog = await screen.findByRole('dialog', {
      name: '新建 Role',
    });
    expect(
      within(reopenedDialog).getByRole('textbox', { name: '角色名称' }),
    ).toHaveValue('');
  });
});
