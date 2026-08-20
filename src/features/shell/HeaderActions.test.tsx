import { fireEvent, render, screen } from '@testing-library/react';
import { App as AntdApp } from 'antd';
import type { ReactNode } from 'react';
import { describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  setMode: vi.fn(),
}));

vi.mock('@/features/theme', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@/features/theme')>()),
  usePlatformTheme: () => ({
    mode: 'light' as const,
    resolvedTheme: 'light' as const,
    setMode: mocks.setMode,
  }),
}));

vi.mock('antd', async (importOriginal) => {
  const actual = await importOriginal<typeof import('antd')>();
  return {
    ...actual,
    Dropdown: ({
      children,
      menu,
    }: {
      children: ReactNode;
      menu: { onClick?: (info: { key: string }) => void };
    }) => (
      <div>
        {children}
        <button
          aria-label="触发未知用户菜单项"
          onClick={() => menu.onClick?.({ key: 'unexpected' })}
          type="button"
        />
      </div>
    ),
  };
});

import { HeaderActions } from './HeaderActions';

describe('HeaderActions defensive menu input', () => {
  it('未知 menu key 不切换主题也不退出登录', () => {
    const onLogout = vi.fn();
    render(
      <AntdApp>
        <HeaderActions onLogout={onLogout} user={{ name: '平台用户' }} />
      </AntdApp>,
    );

    fireEvent.click(screen.getByRole('button', { name: '触发未知用户菜单项' }));

    expect(mocks.setMode).not.toHaveBeenCalled();
    expect(onLogout).not.toHaveBeenCalled();
  });
});
