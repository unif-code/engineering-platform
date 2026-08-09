import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  me: null as null | { employeeId: string; name: string },
}));

vi.mock('@umijs/max', () => ({
  useModel: () => ({ initialState: { me: mocks.me, navigation: [] } }),
  Navigate: ({ to, replace }: { to: string; replace?: boolean }) => (
    <div data-replace={String(replace)} data-testid="navigate">
      {to}
    </div>
  ),
  Outlet: () => <div data-testid="outlet" />,
}));

import RouteGuard from './RouteGuard';

describe('RouteGuard', () => {
  it('未登录时使用 replace 重定向到 /login', () => {
    mocks.me = null;

    render(<RouteGuard />);

    expect(screen.getByTestId('navigate')).toHaveTextContent('/login');
    expect(screen.getByTestId('navigate')).toHaveAttribute(
      'data-replace',
      'true',
    );
  });

  it('已登录时渲染子路由', () => {
    mocks.me = { employeeId: '00000000', name: 'V0.1 Stub' };

    render(<RouteGuard />);

    expect(screen.getByTestId('outlet')).toBeInTheDocument();
  });
});
