import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { App as AntdApp } from 'antd';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { AuditRequestId } from './AuditRequestId';

const originalClipboard = Object.getOwnPropertyDescriptor(
  navigator,
  'clipboard',
);

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

describe('AuditRequestId', () => {
  it('Clipboard 缺失时展示浏览器能力提示且不抛错', async () => {
    const user = userEvent.setup();
    installClipboard(undefined);
    render(
      <AntdApp>
        <AuditRequestId requestId={`req-${crypto.randomUUID()}`} />
      </AntdApp>,
    );

    await user.click(screen.getByRole('button', { name: '复制 Request ID' }));

    expect(
      await screen.findByText('当前浏览器不支持复制 Request ID'),
    ).toBeInTheDocument();
  });

  it('Clipboard 拒绝写入时展示复制失败', async () => {
    const user = userEvent.setup();
    installClipboard({
      writeText: vi.fn().mockRejectedValue(new Error('denied')),
    });
    render(
      <AntdApp>
        <AuditRequestId requestId={`req-${crypto.randomUUID()}`} />
      </AntdApp>,
    );

    await user.click(screen.getByRole('button', { name: '复制 Request ID' }));

    expect(await screen.findByText('Request ID 复制失败')).toBeInTheDocument();
  });
});
