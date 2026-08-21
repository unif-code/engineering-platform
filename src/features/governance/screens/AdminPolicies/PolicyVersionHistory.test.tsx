import { POLICY_VERSION_FIXTURES } from '@root/tests/fixtures/accessGovernance';
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ConfigProvider } from 'antd';
import { describe, expect, it, vi } from 'vitest';
import { PolicyVersionHistory } from './PolicyVersionHistory';

const fourVersions = [
  {
    ...POLICY_VERSION_FIXTURES.items[0],
    current: true,
    version: 4,
  },
  ...[3, 2, 1].map((version) => ({
    ...POLICY_VERSION_FIXTURES.items[0],
    current: false,
    version,
  })),
];

function renderHistory(
  items = fourVersions,
  loading = false,
  onRollback = vi.fn(),
) {
  return {
    onRollback,
    ...render(
      <ConfigProvider theme={{ token: { motion: false } }}>
        <PolicyVersionHistory
          items={items}
          loading={loading}
          onRollback={onRollback}
          rollbackDisabled={false}
        />
      </ConfigProvider>,
    ),
  };
}

describe('PolicyVersionHistory', () => {
  it('区分加载态与空历史', () => {
    const view = renderHistory([], true);
    expect(screen.getByLabelText('正在加载版本历史')).toBeVisible();

    view.rerender(
      <ConfigProvider theme={{ token: { motion: false } }}>
        <PolicyVersionHistory
          items={[]}
          loading={false}
          onRollback={view.onRollback}
          rollbackDisabled={false}
        />
      </ConfigProvider>,
    );
    expect(screen.getAllByText('No data')).toHaveLength(2);
  });

  it('从完整历史回滚时关闭 Drawer 并回传对应版本', async () => {
    const user = userEvent.setup();
    const { onRollback } = renderHistory();
    await user.click(screen.getByRole('button', { name: '全部 4 个版本' }));
    const drawer = await screen.findByRole('dialog', { name: '版本历史' });

    await user.click(
      within(drawer).getByRole('button', { name: '回滚版本 3' }),
    );

    expect(onRollback).toHaveBeenCalledWith(
      expect.objectContaining({ version: 3 }),
    );
    expect(screen.queryByRole('dialog', { name: '版本历史' })).toBeNull();
  });

  it('允许使用 Drawer 关闭按钮退出完整历史', async () => {
    const user = userEvent.setup();
    renderHistory();
    await user.click(screen.getByRole('button', { name: '全部 4 个版本' }));
    const drawer = await screen.findByRole('dialog', { name: '版本历史' });

    await user.click(within(drawer).getByRole('button', { name: 'Close' }));

    expect(screen.queryByRole('dialog', { name: '版本历史' })).toBeNull();
  });
});
