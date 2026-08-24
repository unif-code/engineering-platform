import {
  act,
  fireEvent,
  render,
  screen,
  waitFor,
} from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { App, ConfigProvider } from 'antd';
import { describe, expect, it, vi } from 'vitest';
import type { WorkspaceSummary } from '@/features/administration';
import { WorkspaceModal } from './WorkspaceModal';

describe('WorkspaceModal', () => {
  it('Owner 候选只来自真实组织树的 Leader', async () => {
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
    expect(await screen.findByRole('option', { name: '李强' })).toBeVisible();
    expect(screen.getByRole('option', { name: '运行时 Leader' })).toBeVisible();
    expect(screen.getByRole('textbox', { name: '所属 Team' })).toBeDisabled();
    expect(screen.getByRole('textbox', { name: '所属 Team' })).toHaveAttribute(
      'placeholder',
      '当前版本暂未接入',
    );
  });

  it('等待创建后的列表刷新完成再关闭', async () => {
    const user = userEvent.setup();
    const workspace = {
      id: 'workspace-prototype',
      leaders: [],
      memberCount: undefined,
      name: 'Prototype Workspace',
      owner: {
        displayName: '李强',
        employeeNo: 'E1003',
        id: 'leader-li',
      },
      status: 'ACTIVE',
      version: 1,
    } satisfies WorkspaceSummary;
    let finishRefresh: (() => void) | undefined;
    const onCreated = vi.fn(
      () =>
        new Promise<void>((resolve) => {
          finishRefresh = resolve;
        }),
    );
    const onClose = vi.fn();

    render(
      <ConfigProvider theme={{ token: { motion: false } }}>
        <App>
          <WorkspaceModal
            leaderOptions={[workspace.owner]}
            onClose={onClose}
            onCreated={onCreated}
            onSubmit={vi.fn().mockResolvedValue(workspace)}
            open
          />
        </App>
      </ConfigProvider>,
    );

    fireEvent.change(screen.getByRole('textbox', { name: '工作区名称' }), {
      target: { value: workspace.name },
    });
    await user.click(
      screen.getByRole('combobox', { name: 'Owner（开发Leader）' }),
    );
    await user.click(await screen.findByRole('option', { name: '李强' }));
    await user.click(screen.getByRole('button', { name: /创\s*建/ }));

    await waitFor(() => {
      expect(onCreated).toHaveBeenCalledWith(workspace);
    });
    expect(onClose).not.toHaveBeenCalled();
    expect(screen.queryByText('工作区已创建')).not.toBeInTheDocument();

    await act(async () => {
      finishRefresh?.();
    });

    await waitFor(() => {
      expect(onClose).toHaveBeenCalled();
    });
  });
});
