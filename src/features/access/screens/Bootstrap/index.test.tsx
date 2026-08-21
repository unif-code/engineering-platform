import { render, screen } from '@testing-library/react';
import { App } from 'antd';
import { describe, expect, it, vi } from 'vitest';
import { ThemeProvider } from '@/features/theme';

vi.mock('@umijs/max', () => ({
  history: { push: vi.fn(), replace: vi.fn() },
  useLocation: () => ({ state: null }),
  useAntdConfigSetter: () => vi.fn(),
}));

import BootstrapPage from '.';

describe('BootstrapPage', () => {
  it('在页面主区域呈现真实账号初始化向导', () => {
    render(
      <App>
        <ThemeProvider>
          <BootstrapPage />
        </ThemeProvider>
      </App>,
    );

    expect(screen.getByRole('main')).toContainElement(
      screen.getByRole('heading', { name: '初始化平台账号' }),
    );
    expect(screen.getByRole('img', { name: '研发协作平台' })).toBeVisible();
    expect(
      screen.getByRole('heading', { name: /一条可治理的 AI 交付链路/ }),
    ).toBeVisible();
    expect(screen.getByLabelText('账号初始化')).toContainElement(
      screen.getByRole('heading', { name: '初始化平台账号' }),
    );
    expect(
      screen.getByRole('heading', { name: '验证临时密码' }),
    ).toBeInTheDocument();
  });
});
