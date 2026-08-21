import { createProblemError } from '@root/tests/fixtures/problemError';
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { App, ConfigProvider } from 'antd';
import { describe, expect, it, vi } from 'vitest';
import { GrantModal } from './GrantModal';
import type { GrantSubmitInput } from './type';

const principalOptions = [
  { label: 'E1002 · 吴桐', type: 'ACCOUNT' as const, value: 'account-2' },
];
const scopeOptions = [
  { label: '全平台', type: 'PLATFORM' as const, value: 'PLATFORM' },
  {
    label: '营销工作区',
    type: 'WORKSPACE' as const,
    value: 'workspace-platform-core',
  },
];

function renderModal(onSubmit: (input: GrantSubmitInput) => Promise<void>) {
  return render(
    <ConfigProvider theme={{ token: { motion: false } }}>
      <App>
        <GrantModal
          onClose={vi.fn()}
          onSubmit={onSubmit}
          open
          principalOptions={principalOptions}
          scopeOptions={scopeOptions}
        />
      </App>
    </ConfigProvider>,
  );
}

async function selectOption(
  user: ReturnType<typeof userEvent.setup>,
  label: string,
  option: string,
) {
  await user.click(screen.getByRole('combobox', { name: label }));
  await user.click(await screen.findByRole('option', { name: option }));
}

describe('GrantModal', () => {
  it('由真实表单交互构建精确 Workspace Grant payload', async () => {
    const user = userEvent.setup();
    const onSubmit = vi
      .fn<(input: GrantSubmitInput) => Promise<void>>()
      .mockResolvedValue(undefined);
    renderModal(onSubmit);
    const dialog = await screen.findByRole('dialog', { name: '新增授权' });

    await selectOption(user, '主体', 'E1002 · 吴桐');
    await user.type(
      within(dialog).getByRole('textbox', { name: '能力' }),
      '  ws.config  ',
    );
    await selectOption(user, '范围', '营销工作区');
    await user.type(
      within(dialog).getByRole('textbox', { name: '授权原因' }),
      '  承担营销工作区治理职责  ',
    );
    await user.click(within(dialog).getByRole('button', { name: '确认授予' }));

    expect(onSubmit).toHaveBeenCalledWith({
      capability: 'ws.config',
      principalId: 'account-2',
      reason: '承担营销工作区治理职责',
      scope: { id: 'workspace-platform-core', type: 'WORKSPACE' },
    });
  });

  it('提交失败时保留真实 Modal 并展示 Problem detail 与 requestId', async () => {
    const user = userEvent.setup();
    const onSubmit = vi
      .fn<(input: GrantSubmitInput) => Promise<void>>()
      .mockRejectedValue(
        createProblemError({
          detail: '该授权与现有 Grant 冲突',
          requestId: 'req-grant-modal-409',
          status: 409,
        }),
      );
    renderModal(onSubmit);
    const dialog = await screen.findByRole('dialog', { name: '新增授权' });

    await selectOption(user, '主体', 'E1002 · 吴桐');
    await user.type(
      within(dialog).getByRole('textbox', { name: '能力' }),
      'ws.config',
    );
    await user.type(
      within(dialog).getByRole('textbox', { name: '授权原因' }),
      '验证冲突错误',
    );
    await user.click(within(dialog).getByRole('button', { name: '确认授予' }));

    expect(
      await screen.findByText(/该授权与现有 Grant 冲突/),
    ).toHaveTextContent('requestId: req-grant-modal-409');
    expect(screen.getByRole('dialog', { name: '新增授权' })).toBeVisible();
    expect(onSubmit).toHaveBeenCalledOnce();
  });
});
