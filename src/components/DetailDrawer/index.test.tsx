import type { ProDescriptionsProps } from '@ant-design/pro-components';
import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { App, Button } from 'antd';
import { useState } from 'react';
import { describe, expect, it } from 'vitest';
import { DetailDrawer } from '.';

interface ArtifactSummary {
  name: string;
  digest: string;
}

function StatefulDetailValue() {
  const [count, setCount] = useState(0);

  return (
    <Button onClick={() => setCount((current) => current + 1)}>
      交互次数 {count}
    </Button>
  );
}

const artifactColumns: NonNullable<
  ProDescriptionsProps<ArtifactSummary>['columns']
> = [
  {
    copyable: true,
    dataIndex: 'name',
    title: 'Artifact 名称',
    valueType: 'text',
  },
  {
    dataIndex: 'digest',
    title: 'Digest',
    valueType: 'text',
  },
  {
    render: () => <StatefulDetailValue />,
    title: '交互验证',
  },
];

const artifact: ArtifactSummary = {
  name: '需求说明.md',
  digest: 'sha256:5dc9e5',
};

function DetailDrawerHarness() {
  const [open, setOpen] = useState(false);
  const [closeCount, setCloseCount] = useState(0);

  return (
    <App>
      <Button onClick={() => setOpen(true)}>打开详情</Button>
      <p aria-label="关闭次数" role="status">
        {closeCount}
      </p>
      <DetailDrawer<ArtifactSummary>
        columns={artifactColumns}
        dataSource={artifact}
        onClose={() => {
          setCloseCount((current) => current + 1);
          setOpen(false);
        }}
        open={open}
        title="制品详情"
      />
    </App>
  );
}

describe('DetailDrawer', () => {
  it('仅在打开后呈现结构化只读详情', async () => {
    const user = userEvent.setup();
    render(<DetailDrawerHarness />);

    expect(
      screen.queryByRole('dialog', { name: '制品详情' }),
    ).not.toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: '打开详情' }));

    const dialog = await screen.findByRole('dialog', { name: '制品详情' });
    expect(dialog).toHaveTextContent('Artifact 名称');
    expect(dialog).toHaveTextContent('需求说明.md');
    expect(dialog).toHaveTextContent('Digest');
    expect(dialog).toHaveTextContent('sha256:5dc9e5');
    expect(within(dialog).queryByRole('form')).not.toBeInTheDocument();
    expect(
      within(dialog).queryByRole('button', { name: /提交|保存/ }),
    ).not.toBeInTheDocument();
  });

  it('触发关闭回调并在重新打开时重置内容状态', async () => {
    const user = userEvent.setup();
    render(<DetailDrawerHarness />);

    await user.click(screen.getByRole('button', { name: '打开详情' }));
    const dialog = await screen.findByRole('dialog', { name: '制品详情' });
    await user.click(
      within(dialog).getByRole('button', { name: '交互次数 0' }),
    );
    expect(
      within(dialog).getByRole('button', { name: '交互次数 1' }),
    ).toBeInTheDocument();

    await user.click(
      within(dialog).getByRole('button', { name: /关闭|close/i }),
    );

    await waitFor(() => {
      expect(
        screen.queryByRole('dialog', { name: '制品详情' }),
      ).not.toBeInTheDocument();
    });
    expect(screen.getByRole('status', { name: '关闭次数' })).toHaveTextContent(
      '1',
    );

    await user.click(screen.getByRole('button', { name: '打开详情' }));
    const reopenedDialog = await screen.findByRole('dialog', {
      name: '制品详情',
    });
    expect(
      within(reopenedDialog).getByRole('button', { name: '交互次数 0' }),
    ).toBeInTheDocument();
  });
});
