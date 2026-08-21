import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

const routeMocks = vi.hoisted(() => ({ search: '' }));

vi.mock('@umijs/max', () => ({
  useLocation: () => ({
    hash: '',
    pathname: '/403',
    search: routeMocks.search,
  }),
}));

import AccessDeniedPage from './index';

describe('AccessDeniedPage', () => {
  it('shows the shared forbidden state and a route back to the workspace', () => {
    routeMocks.search = '?requestId=req-forbidden-page';
    render(<AccessDeniedPage />);

    expect(screen.getByText('无权访问')).toBeInTheDocument();
    expect(
      screen.getByText('当前账号没有访问此页面的能力，请联系管理员。'),
    ).toBeInTheDocument();
    expect(screen.getByRole('link', { name: '返回工作台' })).toHaveAttribute(
      'href',
      '/home',
    );
    expect(screen.getByText('requestId: req-forbidden-page')).toBeVisible();
  });
});
