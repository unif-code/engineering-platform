import { render, screen, within } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import AdminPage from '.';

describe('AdminPage', () => {
  it('保留最终原型的概览与导航空间且只呈现真实空状态', () => {
    render(<AdminPage />);

    expect(screen.getByRole('heading', { name: '管理概览' })).toBeVisible();
    expect(screen.queryByText(/兼容直达路由|旧链接/)).not.toBeInTheDocument();

    const navigation = screen.getByRole('region', { name: '管理导航' });
    const status = screen.getByRole('region', { name: '平台状态' });
    expect(within(navigation).getByText('当前没有真实数据')).toBeVisible();
    expect(within(status).getByText('当前没有真实数据')).toBeVisible();
    expect(screen.queryByRole('link')).not.toBeInTheDocument();
    expect(screen.queryByRole('button')).not.toBeInTheDocument();
  });

  it('不显示旧版伪指标、风险和基础设施状态', () => {
    render(<AdminPage />);

    for (const staleText of [
      '平台用户',
      '活跃工作区',
      '今日模型调用',
      'Object Storage 容量接近预警线',
      'PostgreSQL',
      'NATS',
    ]) {
      expect(screen.queryByText(staleText)).not.toBeInTheDocument();
    }
  });
});
