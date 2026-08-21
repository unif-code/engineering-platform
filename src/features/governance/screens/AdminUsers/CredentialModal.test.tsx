import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { App as AntdApp } from 'antd';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { CredentialModal } from './CredentialModal';

const originalClipboard = Object.getOwnPropertyDescriptor(
  navigator,
  'clipboard',
);

const receipt = () => ({
  account: {
    displayName: '临时用户',
    employeeNo: `E-${crypto.randomUUID()}`,
    etag: '"v1"',
    id: crypto.randomUUID(),
    profession: null,
    status: 'PENDING_INIT' as const,
  },
  temporaryPassword: `Temp!${crypto.randomUUID()}`,
});

const installClipboard = (value: unknown) => {
  Object.defineProperty(navigator, 'clipboard', {
    configurable: true,
    value,
  });
};

afterEach(() => {
  if (originalClipboard) {
    Object.defineProperty(navigator, 'clipboard', originalClipboard);
  } else {
    Reflect.deleteProperty(navigator, 'clipboard');
  }
});

describe('CredentialModal', () => {
  it.each([
    ['create', '账号创建成功'],
    ['reset', '密码重置成功'],
  ] as const)('kind=%s 展示对应标题并允许确认关闭', async (kind, title) => {
    const user = userEvent.setup();
    const onClose = vi.fn();
    render(
      <AntdApp>
        <CredentialModal
          kind={kind}
          onClose={onClose}
          open
          receipt={receipt()}
        />
      </AntdApp>,
    );

    await user.click(screen.getByRole('button', { name: '我已安全记录' }));

    expect(screen.getByRole('dialog', { name: title })).toBeInTheDocument();
    expect(onClose).toHaveBeenCalledOnce();
  });

  it('复制成功时只把运行时临时密码写入 Clipboard', async () => {
    const user = userEvent.setup();
    const credential = receipt();
    const writeText = vi.fn().mockResolvedValue(undefined);
    installClipboard({ writeText });
    render(
      <AntdApp>
        <CredentialModal
          kind="create"
          onClose={vi.fn()}
          open
          receipt={credential}
        />
      </AntdApp>,
    );

    await user.click(screen.getByRole('button', { name: '复制临时密码' }));

    expect(writeText).toHaveBeenCalledWith(credential.temporaryPassword);
    expect(await screen.findByText('已复制临时密码')).toBeInTheDocument();
  });

  it.each([
    ['missing', undefined],
    ['rejected', { writeText: vi.fn().mockRejectedValue(new Error('denied')) }],
  ])('Clipboard %s 时展示手工复制提示', async (_label, clipboard) => {
    const user = userEvent.setup();
    installClipboard(clipboard);
    render(
      <AntdApp>
        <CredentialModal
          kind="reset"
          onClose={vi.fn()}
          open
          receipt={receipt()}
        />
      </AntdApp>,
    );

    await user.click(screen.getByRole('button', { name: '复制临时密码' }));

    expect(
      await screen.findByText('复制失败，请手动复制临时密码'),
    ).toBeInTheDocument();
  });
});
