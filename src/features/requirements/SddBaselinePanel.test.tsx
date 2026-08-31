import { createProblemError } from '@root/tests/fixtures/problemError';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { act, render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { App, ConfigProvider } from 'antd';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { Requirement, SddBaseline } from './type';

const serviceMocks = vi.hoisted(() => ({
  createSddArtifact: vi.fn(),
  getSddArtifactVersion: vi.fn(),
  registerSddBaseline: vi.fn(),
}));

vi.mock('@umijs/max', async () => ({
  ...(await import('@tanstack/react-query')),
}));

vi.mock('./service', () => serviceMocks);

import { SddBaselinePanel } from './SddBaselinePanel';

const requirement: Requirement = {
  acceptanceCriteria: ['完成闭环'],
  createdAt: '2026-08-31T08:00:00Z',
  createdBy: 'account-creator',
  currentSddBaselineId: null,
  description: 'V0.4 Requirement',
  id: 'requirement-1',
  initialRepositoryId: 'repository-1',
  recordState: 'ACTIVE',
  requiredWorkItemSetHash: 'work-item-set-hash',
  requiredWorkItemSetVersion: 1,
  requirementVersion: 1,
  revision: 7,
  routeSnapshot: { requirementType: 'feat', version: 2 },
  routeSnapshotHash: 'route-hash',
  routeSnapshotVersion: 2,
  state: 'PREPARING',
  title: 'V0.4 flow',
  type: 'feat',
  updatedAt: '2026-08-31T08:01:00Z',
  workspaceId: 'workspace-1',
};

const baseline: SddBaseline = {
  artifactHash: 'artifact-hash',
  artifactId: 'artifact-1',
  artifactVersion: '2',
  createdAt: '2026-08-31T08:00:00Z',
  createdBy: 'account-creator',
  id: 'baseline-1',
  requirementId: requirement.id,
  requirementVersion: 1,
  routeSnapshotHash: 'route-hash',
  routeSnapshotVersion: 2,
};

function renderPanel(
  overrides: Partial<React.ComponentProps<typeof SddBaselinePanel>> = {},
) {
  const onChanged = vi.fn().mockResolvedValue(undefined);
  const props: React.ComponentProps<typeof SddBaselinePanel> = {
    baseline: null,
    canSubmit: true,
    onChanged,
    requirement,
    sessionKey: 'account-creator',
    ...overrides,
  };
  const queryClient = new QueryClient({
    defaultOptions: { mutations: { retry: false }, queries: { retry: false } },
  });
  const tree = (
    currentProps: React.ComponentProps<typeof SddBaselinePanel>,
  ) => (
    <QueryClientProvider client={queryClient}>
      <ConfigProvider theme={{ token: { motion: false } }}>
        <App>
          <SddBaselinePanel {...currentProps} />
        </App>
      </ConfigProvider>
    </QueryClientProvider>
  );
  const view = render(tree(props));
  return {
    onChanged,
    queryClient,
    rerenderPanel: (
      next: Partial<React.ComponentProps<typeof SddBaselinePanel>>,
    ) => view.rerender(tree({ ...props, ...next })),
  };
}

beforeEach(() => {
  serviceMocks.createSddArtifact.mockReset();
  serviceMocks.getSddArtifactVersion.mockReset();
  serviceMocks.registerSddBaseline.mockReset();
});

describe('SddBaselinePanel', () => {
  it('读取当前 Baseline 的精确 Artifact Version 并作为编辑起点', async () => {
    serviceMocks.getSddArtifactVersion.mockResolvedValue({
      artifactId: 'artifact-1',
      content: '# 当前 SDD\n\n精确版本 2',
      createdAt: '2026-08-31T08:00:00Z',
      createdBy: 'account-creator',
      mediaType: 'text/markdown',
      requirementId: requirement.id,
      sha256: 'artifact-hash',
      state: 'AVAILABLE',
      trust: 'TRUSTED',
      version: 2,
    });
    renderPanel({ baseline });

    await waitFor(() => {
      expect(serviceMocks.getSddArtifactVersion).toHaveBeenCalledWith(
        'requirement-1',
        'artifact-1',
        2,
        expect.any(AbortSignal),
      );
    });
    expect(await screen.findByLabelText('当前 SDD Markdown')).toHaveTextContent(
      '# 当前 SDD',
    );
    await userEvent
      .setup()
      .click(screen.getByRole('button', { name: '编辑 SDD' }));
    expect(
      within(await screen.findByRole('dialog', { name: '编辑 SDD' })).getByRole(
        'textbox',
        { name: 'SDD Markdown' },
      ),
    ).toHaveValue('# 当前 SDD\n\n精确版本 2');
  });

  it('编辑已有 Baseline 时复用 Artifact ID 创建新版本', async () => {
    serviceMocks.getSddArtifactVersion.mockResolvedValue({
      artifactId: 'artifact-1',
      content: '# 旧 SDD',
      version: 2,
    });
    serviceMocks.createSddArtifact.mockResolvedValue({
      artifact: { artifactId: 'artifact-1', version: 3 },
      requirement: { revision: 8 },
    });
    serviceMocks.registerSddBaseline.mockResolvedValue({});
    const { onChanged } = renderPanel({ baseline });
    const user = userEvent.setup();

    await user.click(await screen.findByRole('button', { name: '编辑 SDD' }));
    const dialog = await screen.findByRole('dialog', { name: '编辑 SDD' });
    const editor = within(dialog).getByRole('textbox', {
      name: 'SDD Markdown',
    });
    await user.clear(editor);
    await user.type(editor, '# 新 SDD');
    await user.click(
      within(dialog).getByRole('button', { name: '保存并设为当前基线' }),
    );

    await waitFor(() => {
      expect(serviceMocks.registerSddBaseline).toHaveBeenCalled();
    });
    expect(serviceMocks.createSddArtifact).toHaveBeenCalledWith(
      'requirement-1',
      { artifactId: 'artifact-1', content: '# 新 SDD' },
      7,
      expect.any(String),
    );
    expect(onChanged).toHaveBeenCalledTimes(1);
  });

  it('无效 Artifact Version 只显示错误且不读取正文', () => {
    renderPanel({ baseline: { ...baseline, artifactVersion: 'invalid' } });

    expect(
      screen.getByText('服务端返回的 Artifact Version 无效，无法读取正文'),
    ).toBeVisible();
    expect(screen.getByRole('button', { name: '编辑 SDD' })).toBeDisabled();
    expect(serviceMocks.getSddArtifactVersion).not.toHaveBeenCalled();
  });

  it('Artifact 读取失败后可重新读取精确正文', async () => {
    serviceMocks.getSddArtifactVersion
      .mockRejectedValueOnce(new Error('Artifact 暂不可用'))
      .mockResolvedValueOnce({
        artifactId: 'artifact-1',
        content: '# 恢复后的 SDD',
        version: 2,
      });
    renderPanel({ baseline });
    const user = userEvent.setup();

    expect(await screen.findByRole('alert')).toHaveTextContent(
      'Artifact 暂不可用',
    );
    await user.click(screen.getByRole('button', { name: '重试读取 SDD' }));

    expect(await screen.findByLabelText('当前 SDD Markdown')).toHaveTextContent(
      '# 恢复后的 SDD',
    );
  });

  it('Baseline 阶段结果未知时保留 Artifact，并只用同一 key 重放登记', async () => {
    serviceMocks.createSddArtifact.mockResolvedValue({
      artifact: { artifactId: 'artifact-1', version: 1 },
      requirement: { revision: 8 },
    });
    serviceMocks.registerSddBaseline
      .mockRejectedValueOnce(new Error('登记结果未知'))
      .mockResolvedValueOnce({});
    const { onChanged, rerenderPanel } = renderPanel();
    const user = userEvent.setup();

    await user.click(screen.getByRole('button', { name: '创建 SDD' }));
    const dialog = await screen.findByRole('dialog', { name: '创建 SDD' });
    await user.type(
      within(dialog).getByRole('textbox', { name: 'SDD Markdown' }),
      '# 新 SDD\n\n正文',
    );
    await user.click(
      within(dialog).getByRole('button', { name: '保存并设为当前基线' }),
    );

    expect(await within(dialog).findByText('登记结果未知')).toBeVisible();
    await user.click(
      within(dialog).getByRole('button', { name: '重新读取状态' }),
    );
    rerenderPanel({ requirement: { ...requirement, revision: 9 } });
    await user.click(
      within(dialog).getByRole('button', { name: '保存并设为当前基线' }),
    );

    await waitFor(() => {
      expect(serviceMocks.registerSddBaseline).toHaveBeenCalledTimes(2);
    });
    expect(serviceMocks.createSddArtifact).toHaveBeenCalledTimes(1);
    expect(serviceMocks.createSddArtifact).toHaveBeenCalledWith(
      'requirement-1',
      { content: '# 新 SDD\n\n正文' },
      7,
      expect.any(String),
    );
    const [firstRegister, secondRegister] =
      serviceMocks.registerSddBaseline.mock.calls;
    expect(firstRegister).toEqual([
      'requirement-1',
      { artifactId: 'artifact-1', artifactVersion: 1 },
      8,
      expect.any(String),
    ]);
    expect(secondRegister?.[3]).toBe(firstRegister?.[3]);
    expect(secondRegister?.[2]).toBe(9);
    expect(onChanged).toHaveBeenCalledTimes(2);
  });

  it('权限撤销后隐藏 React Query 保留的旧 SDD 正文', async () => {
    serviceMocks.getSddArtifactVersion
      .mockResolvedValueOnce({
        artifactId: 'artifact-1',
        content: '# 仅授权用户可见',
        version: 2,
      })
      .mockRejectedValueOnce(
        createProblemError({
          detail: '当前账号已失去 SDD 读取权限',
          requestId: 'request-sdd-revoked',
          status: 403,
        }),
      );
    const { queryClient } = renderPanel({ baseline });

    expect(await screen.findByLabelText('当前 SDD Markdown')).toHaveTextContent(
      '# 仅授权用户可见',
    );
    await userEvent
      .setup()
      .click(screen.getByRole('button', { name: '编辑 SDD' }));
    expect(
      within(await screen.findByRole('dialog', { name: '编辑 SDD' })).getByRole(
        'textbox',
        { name: 'SDD Markdown' },
      ),
    ).toHaveValue('# 仅授权用户可见');
    await act(async () => {
      await queryClient.refetchQueries({
        queryKey: [
          'requirement-sdd-artifact',
          'account-creator',
          requirement.id,
          baseline.artifactId,
          2,
        ],
      });
    });

    expect(
      await screen.findByText(/当前账号已失去 SDD 读取权限/),
    ).toBeVisible();
    expect(screen.queryByLabelText('当前 SDD Markdown')).toBeNull();
    expect(screen.queryByRole('dialog', { name: '编辑 SDD' })).toBeNull();
    expect(screen.getByRole('button', { name: '编辑 SDD' })).toBeDisabled();
  });

  it('无 submit Capability 时不提供 SDD 写入口', () => {
    renderPanel({ canSubmit: false });

    expect(screen.queryByRole('button', { name: '创建 SDD' })).toBeNull();
    expect(serviceMocks.getSddArtifactVersion).not.toHaveBeenCalled();
  });
});
