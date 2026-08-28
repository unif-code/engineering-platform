import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { App, ConfigProvider } from 'antd';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { BindingStatus } from './BindingStatus';
import type { WorkItem } from './type';

function workItem(overrides: Partial<WorkItem> = {}): WorkItem {
  return {
    assignmentState: 'ASSIGNED',
    baseCommitSha: null,
    createdAt: '2026-08-28T08:00:00Z',
    createdBy: 'account-1',
    executorId: 'account-1',
    executorType: 'HUMAN',
    humanOwnerId: 'account-1',
    id: 'work-item-1',
    repositoryBlockedAt: null,
    repositoryBlockedReasonCode: null,
    repositoryId: 'repository-1',
    repositoryState: 'WAITING_REPOSITORY',
    requiredCapabilities: ['requirement.create'],
    requirementId: 'requirement-1',
    revision: 1,
    state: 'DRAFT',
    taskBranch: null,
    updatedAt: '2026-08-28T08:01:00Z',
    ...overrides,
  };
}

function renderStatus(item: WorkItem, requestId?: string) {
  return render(
    <ConfigProvider theme={{ token: { motion: false } }}>
      <App>
        <BindingStatus requestId={requestId} workItem={item} />
      </App>
    </ConfigProvider>,
  );
}

const originalClipboard = Object.getOwnPropertyDescriptor(
  navigator,
  'clipboard',
);

afterEach(() => {
  if (originalClipboard) {
    Object.defineProperty(navigator, 'clipboard', originalClipboard);
  } else {
    Reflect.deleteProperty(navigator, 'clipboard');
  }
});

describe('BindingStatus', () => {
  it('PENDING 只展示等待事实，不猜测 branch 或 SHA', () => {
    renderStatus(workItem({ humanOwnerId: null }));

    const status = screen.getByRole('region', {
      name: 'WorkItem work-item-1 仓库绑定',
    });
    expect(status).toHaveTextContent('等待仓库绑定');
    expect(status).toHaveTextContent('WAITING_REPOSITORY');
    expect(status).toHaveTextContent('repository-1');
    expect(status).toHaveTextContent('—');
    expect(status).not.toHaveTextContent('task/');
    expect(status).not.toHaveTextContent(/base commit/i);
  });

  it('READY 展示完整 branch/base SHA 并提供精确复制操作', async () => {
    const user = userEvent.setup();
    const writeText = vi.fn().mockResolvedValue(undefined);
    Object.defineProperty(navigator, 'clipboard', {
      configurable: true,
      value: { writeText },
    });
    const baseCommitSha = '0123456789abcdef0123456789abcdef01234567';
    const taskBranch = 'task/req-requirement-1';
    renderStatus(
      workItem({
        baseCommitSha,
        repositoryState: 'BOUND',
        taskBranch,
      }),
    );
    const status = screen.getByRole('region', {
      name: 'WorkItem work-item-1 仓库绑定',
    });

    expect(status).toHaveTextContent('任务分支已验证');
    expect(status).toHaveTextContent(taskBranch);
    expect(status).toHaveTextContent(baseCommitSha);
    expect(status).toHaveTextContent('ASSIGNED');
    expect(status).toHaveTextContent('HUMAN');

    await user.click(
      within(status).getByRole('button', { name: '复制任务分支' }),
    );
    await user.click(
      within(status).getByRole('button', { name: '复制 base commit' }),
    );

    expect(writeText.mock.calls).toEqual([[taskBranch], [baseCommitSha]]);
    expect(await within(status).findByText('base commit 已复制')).toBeVisible();
  });

  it('RECONCILIATION 明确结果未知且说明系统不会猜测成功', () => {
    renderStatus(
      workItem({
        repositoryBlockedReasonCode: 'RECONCILIATION_PENDING',
        repositoryState: 'BLOCKED',
      }),
    );

    const status = screen.getByRole('region', {
      name: 'WorkItem work-item-1 仓库绑定',
    });
    expect(status).toHaveTextContent('结果未知，正在对账');
    expect(status).toHaveTextContent('系统不会猜测分支创建成功');
  });

  it('BLOCKED 没有 requestId 时只展示安全白名单文案', () => {
    renderStatus(
      workItem({
        repositoryBlockedReasonCode: 'ACCESS_DENIED',
        repositoryState: 'BLOCKED',
      }),
    );

    const status = screen.getByRole('region', {
      name: 'WorkItem work-item-1 仓库绑定',
    });
    expect(status).toHaveTextContent('仓库访问被拒绝');
    expect(status).not.toHaveTextContent('requestId:');
  });

  it('复制能力缺失或写入失败时给出明确反馈', async () => {
    const user = userEvent.setup();
    renderStatus(
      workItem({
        baseCommitSha: '0123456789abcdef0123456789abcdef01234567',
        repositoryState: 'BOUND',
        taskBranch: 'task/req-requirement-1',
      }),
    );

    Object.defineProperty(navigator, 'clipboard', {
      configurable: true,
      value: undefined,
    });
    await user.click(screen.getByRole('button', { name: '复制任务分支' }));
    expect(screen.getByText('当前浏览器不支持复制任务分支')).toBeVisible();

    Object.defineProperty(navigator, 'clipboard', {
      configurable: true,
      value: { writeText: vi.fn().mockRejectedValue(new Error('denied')) },
    });
    await user.click(screen.getByRole('button', { name: '复制 base commit' }));
    expect(await screen.findByText('base commit 复制失败')).toBeVisible();
  });

  it('未知 BLOCKED reason 仅展示通用文案与可用 requestId', () => {
    renderStatus(
      workItem({
        repositoryBlockedReasonCode:
          'RAW_PROVIDER_SECRET_DETAIL' as WorkItem['repositoryBlockedReasonCode'],
        repositoryState: 'BLOCKED',
      }),
      'req-binding-unknown',
    );

    const status = screen.getByRole('region', {
      name: 'WorkItem work-item-1 仓库绑定',
    });
    expect(status).toHaveTextContent('仓库绑定已阻塞，请联系平台管理员');
    expect(status).toHaveTextContent('requestId: req-binding-unknown');
    expect(status).not.toHaveTextContent('RAW_PROVIDER_SECRET_DETAIL');
  });
});
