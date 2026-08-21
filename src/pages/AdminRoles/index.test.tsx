import { render, screen, within } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import AdminRolesPage from '.';

describe('AdminRolesPage', () => {
  it('保留最终原型角色主从结构且无接口区域全部为空', () => {
    render(<AdminRolesPage />);

    expect(screen.getByRole('button', { name: '新建角色' })).toMatchObject({
      disabled: true,
      title: '当前版本暂未接入',
    });
    expect(
      within(screen.getByRole('navigation', { name: '角色列表' })).getByText(
        '当前没有真实数据',
      ),
    ).toBeVisible();

    for (const regionName of ['业务能力', '观测能力', '管理端能力']) {
      expect(
        within(screen.getByRole('region', { name: regionName })).getByText(
          '当前没有真实数据',
        ),
      ).toBeVisible();
    }
  });

  it('不渲染静态角色矩阵或任何可变角色动作', () => {
    render(<AdminRolesPage />);

    for (const staleText of [
      '产品Leader',
      '开发Leader',
      '超级管理员',
      'task.create',
      'admin.menu',
    ]) {
      expect(screen.queryByText(staleText)).not.toBeInTheDocument();
    }
    expect(screen.queryByRole('checkbox')).not.toBeInTheDocument();
    expect(
      screen.queryByRole('button', { name: '删除角色' }),
    ).not.toBeInTheDocument();
    expect(
      screen.queryByRole('button', { name: '保存变更' }),
    ).not.toBeInTheDocument();
  });
});
