import { render, screen, within } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import AdminPage from './index';

describe('AdminPage', () => {
  it('呈现管理概览、四项关键指标与运行区块', () => {
    render(<AdminPage />);

    for (const label of [
      '管理后台概览',
      '平台用户',
      '活跃工作区',
      '已发布技能',
      '今日模型调用',
      '系统状态',
      '近期风险',
    ]) {
      expect(screen.getByText(label)).toBeInTheDocument();
    }
  });

  it.each([
    ['工作区管理', '/admin/workspaces'],
    ['技能管理', '/admin/skills'],
    ['模型管理', '/admin/models'],
    ['角色管理', '/admin/roles'],
    ['用户管理', '/admin/users'],
    ['菜单管理', '/admin/menus'],
  ])('%s 入口链接到公开注册路径', (label, href) => {
    render(<AdminPage />);

    expect(screen.getByRole('link', { name: `进入${label}` })).toHaveAttribute(
      'href',
      href,
    );
  });

  it('呈现两条风险与四项带文字状态的系统服务', () => {
    render(<AdminPage />);

    const risks = screen.getByRole('region', { name: '近期风险' });
    const systems = screen.getByRole('region', { name: '系统状态' });

    expect(within(risks).getAllByRole('listitem')).toHaveLength(2);
    expect(within(systems).getAllByRole('listitem')).toHaveLength(4);
    for (const serviceName of [
      'PostgreSQL',
      'NATS',
      'Object Storage',
      'Secret Store',
    ]) {
      expect(within(systems).getByText(serviceName)).toBeInTheDocument();
    }
    expect(within(systems).getAllByText(/正常|观察中/)).toHaveLength(4);
  });
});
