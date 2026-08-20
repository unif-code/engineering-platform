import { render, screen } from '@testing-library/react';
import { App } from 'antd';
import { describe, expect, it, vi } from 'vitest';

vi.mock('@umijs/max', () => ({
  history: { push: vi.fn(), replace: vi.fn() },
  useLocation: () => ({ state: null }),
}));

import BootstrapPage from '.';

describe('BootstrapPage', () => {
  it('在页面主区域呈现真实账号初始化向导', () => {
    render(
      <App>
        <BootstrapPage />
      </App>,
    );

    expect(screen.getByRole('main')).toContainElement(
      screen.getByRole('heading', { name: '初始化平台账号' }),
    );
    expect(
      screen.getByRole('heading', { name: '验证临时密码' }),
    ).toBeInTheDocument();
  });
});
