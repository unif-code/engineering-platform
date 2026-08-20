import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { App, ConfigProvider } from 'antd';
import { describe, expect, it, vi } from 'vitest';
import { WorkspaceModal } from './WorkspaceModal';

describe('WorkspaceModal', () => {
  it('Owner 候选只展示存在 Team 映射的开发 Leader', async () => {
    const user = userEvent.setup();
    render(
      <ConfigProvider theme={{ token: { motion: false } }}>
        <App>
          <WorkspaceModal
            leaderOptions={[
              {
                displayName: '李强',
                employeeNo: 'E1003',
                id: 'leader-li',
              },
              {
                displayName: '运行时 Leader',
                employeeNo: 'runtime-leader',
                id: 'runtime-leader-id',
              },
            ]}
            onClose={vi.fn()}
            onCreated={vi.fn()}
            onSubmit={vi.fn()}
            open
          />
        </App>
      </ConfigProvider>,
    );

    await user.click(
      screen.getByRole('combobox', { name: 'Owner（开发Leader）' }),
    );
    expect(
      await screen.findByRole('option', { name: '李强 · 营销' }),
    ).toBeVisible();
    expect(
      screen.queryByRole('option', { name: /运行时 Leader/ }),
    ).not.toBeInTheDocument();
  });
});
