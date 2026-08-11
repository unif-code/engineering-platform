import { render, screen } from '@testing-library/react';
import { App, ConfigProvider } from 'antd';
import { describe, expect, it, vi } from 'vitest';

vi.mock('@/features/administration', () => ({
  createAccount: vi.fn(),
}));

import { UserModal } from './UserModal';

describe('UserModal', () => {
  it('open 为 true 时呈现可访问的新增账号抽屉', async () => {
    const onClose = vi.fn();
    render(
      <ConfigProvider theme={{ token: { motion: false } }}>
        <App>
          <UserModal onClose={onClose} onCreated={vi.fn()} open />
        </App>
      </ConfigProvider>,
    );

    expect(
      await screen.findByRole('dialog', { name: '新增账号' }),
    ).toBeInTheDocument();
    expect(onClose).not.toHaveBeenCalled();
  });
});
