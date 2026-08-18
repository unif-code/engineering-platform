import { createEmployeeNo } from '@root/tests/auth-fixtures';
import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  principal: null as null | { employeeId: string; name: string },
}));

vi.mock('@umijs/max', () => ({
  useLocation: () => ({ hash: '', pathname: '/home', search: '' }),
  useModel: () => ({
    initialState: {
      capabilities: [],
      navigation: [
        {
          meta: {},
          name: '工作台',
          order: 1,
          routeKey: 'home',
          sort: 10,
        },
      ],
      principal: mocks.principal,
    },
  }),
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
    mocks.principal = null;

    render(<RouteGuard />);

    expect(screen.getByTestId('navigate')).toHaveTextContent(
      '/login?redirect=%2Fhome',
    );
    expect(screen.getByTestId('navigate')).toHaveAttribute(
      'data-replace',
      'true',
    );
  });

  it('已登录时渲染子路由', () => {
    mocks.principal = { employeeId: createEmployeeNo(), name: '平台用户' };

    render(<RouteGuard />);

    expect(screen.getByTestId('outlet')).toBeInTheDocument();
  });
});
