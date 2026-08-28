import { createProblemError } from '@root/tests/fixtures/problemError';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { act, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { App, ConfigProvider } from 'antd';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { AuthorizedRepository, CreateRequirementResult } from './type';

const requirementMocks = vi.hoisted(() => ({
  createRequirement: vi.fn(),
  listAuthorizedRepositories: vi.fn(),
}));

vi.mock('@umijs/max', async () => ({
  ...(await import('@tanstack/react-query')),
}));

vi.mock('./service', () => requirementMocks);

import { CreateRequirementModal } from './CreateRequirementModal';

const workspaceOne = {
  id: '10000000-0000-0000-0000-000000000001',
  name: '平台研发',
  ownerId: 'account-owner-1',
};
const workspaceTwo = {
  id: '10000000-0000-0000-0000-000000000002',
  name: '交付研发',
  ownerId: 'account-owner-2',
};
const repositoryOne = {
  defaultBranch: 'main',
  projectPath: 'platform/backend',
  provider: 'gitlab',
  repositoryId: 'repository-1',
} satisfies AuthorizedRepository;
const repositoryTwo = {
  defaultBranch: 'main',
  projectPath: 'delivery/portal',
  provider: 'gitlab',
  repositoryId: 'repository-2',
} satisfies AuthorizedRepository;

const createdResult = {
  requirement: {
    acceptanceCriteria: ['分支来自精确 main SHA'],
    createdAt: '2026-08-28T08:00:00Z',
    createdBy: 'account-1',
    description: '创建确定性任务分支',
    id: '20000000-0000-0000-0000-000000000002',
    initialRepositoryId: repositoryOne.repositoryId,
    recordState: 'ACTIVE',
    revision: 1,
    state: 'CREATED',
    title: '建立任务分支',
    type: 'feat',
    updatedAt: '2026-08-28T08:00:00Z',
    workspaceId: workspaceOne.id,
  },
  workItem: {
    assignmentState: 'ASSIGNED',
    baseCommitSha: null,
    createdAt: '2026-08-28T08:00:00Z',
    createdBy: 'account-1',
    executorId: 'account-1',
    executorType: 'HUMAN',
    humanOwnerId: 'account-1',
    id: '30000000-0000-0000-0000-000000000003',
    repositoryBlockedAt: null,
    repositoryBlockedReasonCode: null,
    repositoryId: repositoryOne.repositoryId,
    repositoryState: 'WAITING_REPOSITORY',
    requiredCapabilities: ['requirement.create'],
    requirementId: '20000000-0000-0000-0000-000000000002',
    revision: 1,
    state: 'DRAFT',
    taskBranch: null,
    updatedAt: '2026-08-28T08:00:00Z',
  },
} satisfies CreateRequirementResult;

function renderModal(
  overrides: Partial<React.ComponentProps<typeof CreateRequirementModal>> = {},
) {
  const queryClient = new QueryClient({
    defaultOptions: {
      mutations: { retry: false },
      queries: { retry: false },
    },
  });
  const onCancel = vi.fn();
  const onCreated = vi.fn();
  render(
    <QueryClientProvider client={queryClient}>
      <ConfigProvider theme={{ token: { motion: false } }}>
        <App>
          <CreateRequirementModal
            initialWorkspaceId={workspaceOne.id}
            onCancel={onCancel}
            onCreated={onCreated}
            open
            sessionKey="account-1"
            workspaces={[workspaceOne, workspaceTwo]}
            {...overrides}
          />
        </App>
      </ConfigProvider>
    </QueryClientProvider>,
  );
  return { onCancel, onCreated, queryClient };
}

async function selectOption(label: string, option: string) {
  const user = userEvent.setup();
  await user.click(screen.getByRole('combobox', { name: label }));
  await user.click(await screen.findByRole('option', { name: option }));
}

async function fillValidForm(title = '建立任务分支') {
  const user = userEvent.setup();
  await selectOption('需求类型', '功能');
  await user.type(screen.getByRole('textbox', { name: '标题' }), title);
  await user.type(
    screen.getByRole('textbox', { name: '描述' }),
    '创建确定性任务分支',
  );
  await user.type(
    screen.getByRole('textbox', { name: '验收条件 1' }),
    '分支来自精确 main SHA',
  );
  await selectOption('仓库', 'platform/backend · main');
  return user;
}

beforeEach(() => {
  requirementMocks.createRequirement.mockReset();
  requirementMocks.listAuthorizedRepositories.mockReset();
  requirementMocks.listAuthorizedRepositories.mockResolvedValue([
    repositoryOne,
  ]);
  requirementMocks.createRequirement.mockResolvedValue(createdResult);
});

describe('CreateRequirementModal', () => {
  it('校验完整创建契约并提交规范 payload 与 UUID 幂等键', async () => {
    const { onCreated } = renderModal();
    const user = userEvent.setup();
    expect(
      await screen.findByRole('dialog', { name: '创建需求' }),
    ).toBeInTheDocument();
    expect(screen.getByRole('textbox', { name: '描述' })).toHaveAttribute(
      'maxlength',
      '10000',
    );
    expect(
      screen.getByRole('textbox', { name: '验收条件 1' }),
    ).not.toHaveAttribute('maxlength');
    await waitFor(() => {
      expect(requirementMocks.listAuthorizedRepositories).toHaveBeenCalledWith(
        workspaceOne.id,
        expect.any(AbortSignal),
      );
    });

    await user.click(screen.getByRole('button', { name: '创建需求' }));

    for (const message of [
      '请选择需求类型',
      '请输入标题',
      '请输入描述',
      '请输入验收条件',
      '请选择仓库',
    ]) {
      expect(await screen.findByText(message)).toBeVisible();
    }

    await selectOption('需求类型', '功能');
    await user.type(
      screen.getByRole('textbox', { name: '标题' }),
      '  建立任务分支  ',
    );
    await user.type(
      screen.getByRole('textbox', { name: '描述' }),
      '  创建确定性任务分支  ',
    );
    await user.type(
      screen.getByRole('textbox', { name: '验收条件 1' }),
      '  分支来自精确 main SHA  ',
    );
    await user.click(screen.getByRole('button', { name: '添加验收条件' }));
    await user.type(
      screen.getByRole('textbox', { name: '验收条件 2' }),
      ' 回读分支验证成功 ',
    );
    await selectOption('仓库', 'platform/backend · main');
    await user.click(screen.getByRole('button', { name: '创建需求' }));

    await waitFor(() => {
      expect(requirementMocks.createRequirement).toHaveBeenCalledTimes(1);
    });
    expect(requirementMocks.createRequirement).toHaveBeenCalledWith(
      {
        acceptanceCriteria: ['分支来自精确 main SHA', '回读分支验证成功'],
        description: '创建确定性任务分支',
        initialRepositoryId: repositoryOne.repositoryId,
        title: '建立任务分支',
        type: 'feat',
        workspaceId: workspaceOne.id,
      },
      expect.stringMatching(
        /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i,
      ),
    );
    expect(onCreated).toHaveBeenCalledWith(createdResult);
  });

  it('切换 Workspace 清除旧仓库并只加载新 Workspace 授权仓库', async () => {
    requirementMocks.listAuthorizedRepositories.mockImplementation(
      async (workspaceId: string) =>
        workspaceId === workspaceOne.id ? [repositoryOne] : [repositoryTwo],
    );
    renderModal();
    await waitFor(() => {
      expect(requirementMocks.listAuthorizedRepositories).toHaveBeenCalledWith(
        workspaceOne.id,
        expect.any(AbortSignal),
      );
    });
    await selectOption('仓库', 'platform/backend · main');
    expect(
      screen.getByRole('combobox', { name: '仓库' }).parentElement,
    ).toHaveTextContent('platform/backend · main');

    await selectOption('工作区', '交付研发');

    await waitFor(() => {
      expect(requirementMocks.listAuthorizedRepositories).toHaveBeenCalledWith(
        workspaceTwo.id,
        expect.any(AbortSignal),
      );
    });
    await waitFor(() => {
      expect(
        screen.getByRole('combobox', { name: '仓库' }).parentElement,
      ).not.toHaveTextContent('platform/backend · main');
    });
    await selectOption('仓库', 'delivery/portal · main');
    expect(
      screen.getByRole('combobox', { name: '仓库' }).parentElement,
    ).toHaveTextContent('delivery/portal · main');
  });

  it('可添加并删除额外验收条件，但始终保留首条必填条件', async () => {
    renderModal();
    const user = userEvent.setup();
    expect(
      await screen.findByRole('dialog', { name: '创建需求' }),
    ).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: '添加验收条件' }));
    expect(screen.getByRole('textbox', { name: '验收条件 2' })).toBeVisible();
    await user.click(screen.getByRole('button', { name: '删除验收条件 2' }));

    expect(
      screen.queryByRole('textbox', { name: '验收条件 2' }),
    ).not.toBeInTheDocument();
    expect(
      screen.getByRole('button', { name: '删除验收条件 1' }),
    ).toBeDisabled();
  });

  it('仓库加载、空结果与 Problem 状态都不允许无效提交，并可重试恢复', async () => {
    let resolveRepositories:
      | ((value: AuthorizedRepository[]) => void)
      | undefined;
    const pendingRepositories = new Promise<AuthorizedRepository[]>(
      (resolve) => {
        resolveRepositories = resolve;
      },
    );
    requirementMocks.listAuthorizedRepositories.mockReturnValueOnce(
      pendingRepositories,
    );
    renderModal();

    expect(await screen.findByText('正在加载授权仓库')).toBeInTheDocument();
    expect(screen.getByRole('combobox', { name: '仓库' })).toBeDisabled();
    expect(screen.getByRole('button', { name: '创建需求' })).toBeDisabled();

    if (resolveRepositories === undefined) {
      throw new Error('repository request was not started');
    }
    resolveRepositories([]);
    await pendingRepositories;
    expect(await screen.findByText('该工作区没有已授权仓库')).toBeVisible();
    expect(screen.getByRole('button', { name: '创建需求' })).toBeDisabled();

    requirementMocks.listAuthorizedRepositories.mockRejectedValueOnce(
      createProblemError({
        detail: '授权仓库暂时不可用',
        requestId: 'req-repositories-503',
        status: 503,
      }),
    );
    await selectOption('工作区', '交付研发');
    expect(await screen.findByRole('alert')).toHaveTextContent(
      '授权仓库暂时不可用（requestId: req-repositories-503）',
    );
    expect(screen.getByRole('button', { name: '创建需求' })).toBeDisabled();

    requirementMocks.listAuthorizedRepositories.mockResolvedValueOnce([
      repositoryTwo,
    ]);
    await userEvent
      .setup()
      .click(screen.getByRole('button', { name: '重试加载授权仓库' }));

    await selectOption('仓库', 'delivery/portal · main');
    expect(screen.getByRole('button', { name: '创建需求' })).toBeEnabled();
  });

  it('授权仓库缓存按 Session 隔离，后台回读期间禁用提交并清除已撤销选择', async () => {
    const { queryClient } = renderModal();
    await waitFor(() => {
      expect(
        queryClient.getQueryData([
          'requirement-authorized-repositories',
          'account-1',
          workspaceOne.id,
        ]),
      ).toEqual([repositoryOne]);
    });
    expect(
      queryClient.getQueryData([
        'requirement-authorized-repositories',
        workspaceOne.id,
      ]),
    ).toBeUndefined();
    await selectOption('仓库', 'platform/backend · main');

    let resolveRefetch: ((value: AuthorizedRepository[]) => void) | undefined;
    const pendingRefetch = new Promise<AuthorizedRepository[]>((resolve) => {
      resolveRefetch = resolve;
    });
    requirementMocks.listAuthorizedRepositories.mockReturnValueOnce(
      pendingRefetch,
    );
    void queryClient.invalidateQueries({
      queryKey: [
        'requirement-authorized-repositories',
        'account-1',
        workspaceOne.id,
      ],
    });

    await waitFor(() => {
      expect(screen.getByRole('combobox', { name: '仓库' })).toBeDisabled();
      expect(screen.getByRole('button', { name: '创建需求' })).toBeDisabled();
    });

    await act(async () => {
      if (resolveRefetch === undefined) {
        throw new Error('repository refetch was not started');
      }
      resolveRefetch([repositoryTwo]);
      await pendingRefetch;
    });

    await waitFor(() => {
      expect(
        queryClient.getQueryData([
          'requirement-authorized-repositories',
          'account-1',
          workspaceOne.id,
        ]),
      ).toEqual([repositoryTwo]);
    });
    await waitFor(() => {
      expect(
        screen.getByRole('combobox', { name: '仓库' }).parentElement,
      ).not.toHaveTextContent('platform/backend · main');
    });
  });

  it('授权仓库后台回读 403 时立即隐藏缓存事实并清空旧选择', async () => {
    const { queryClient } = renderModal();
    await waitFor(() => {
      expect(
        queryClient.getQueryData([
          'requirement-authorized-repositories',
          'account-1',
          workspaceOne.id,
        ]),
      ).toEqual([repositoryOne]);
    });
    await selectOption('仓库', 'platform/backend · main');

    requirementMocks.listAuthorizedRepositories.mockRejectedValueOnce(
      createProblemError({
        detail: '当前账号已失去仓库读取权限',
        requestId: 'req-repositories-revoked',
        status: 403,
      }),
    );
    await act(async () => {
      await queryClient.invalidateQueries({
        queryKey: [
          'requirement-authorized-repositories',
          'account-1',
          workspaceOne.id,
        ],
      });
    });

    expect(await screen.findByRole('alert')).toHaveTextContent(
      '当前账号已失去仓库读取权限（requestId: req-repositories-revoked）',
    );
    expect(
      queryClient.getQueryData([
        'requirement-authorized-repositories',
        'account-1',
        workspaceOne.id,
      ]),
    ).toEqual([repositoryOne]);
    await waitFor(() => {
      expect(
        screen.getByRole('combobox', { name: '仓库' }).parentElement,
      ).not.toHaveTextContent('platform/backend · main');
      expect(screen.getByRole('combobox', { name: '仓库' })).toBeDisabled();
      expect(screen.getByRole('button', { name: '创建需求' })).toBeDisabled();
    });
  });

  it('未知结果按未变化 payload 复用 key，编辑 payload 后才生成新 key', async () => {
    requirementMocks.createRequirement
      .mockRejectedValueOnce(new Error('network unknown'))
      .mockRejectedValueOnce(new Error('network unknown again'))
      .mockResolvedValueOnce(createdResult);
    renderModal();
    await waitFor(() => {
      expect(requirementMocks.listAuthorizedRepositories).toHaveBeenCalled();
    });
    const user = await fillValidForm();

    await user.click(screen.getByRole('button', { name: '创建需求' }));
    expect(await screen.findByRole('alert')).toHaveTextContent(
      'network unknown',
    );
    const firstKey = requirementMocks.createRequirement.mock.calls[0]?.[1];

    await user.click(screen.getByRole('button', { name: '创建需求' }));
    expect(await screen.findByRole('alert')).toHaveTextContent(
      'network unknown again',
    );
    expect(requirementMocks.createRequirement.mock.calls[1]?.[1]).toBe(
      firstKey,
    );

    await user.type(screen.getByRole('textbox', { name: '标题' }), '（更新）');
    await user.click(screen.getByRole('button', { name: '创建需求' }));
    await waitFor(() => {
      expect(requirementMocks.createRequirement).toHaveBeenCalledTimes(3);
    });
    expect(requirementMocks.createRequirement.mock.calls[2]?.[1]).not.toBe(
      firstKey,
    );
  });

  it('服务端幂等 Conflict 保留原文且重复提交不静默换 key', async () => {
    const conflict = createProblemError({
      detail: '相同 Idempotency-Key 对应不同 payload',
      requestId: 'req-idempotency-conflict',
      status: 409,
    });
    requirementMocks.createRequirement.mockRejectedValue(conflict);
    renderModal();
    await waitFor(() => {
      expect(requirementMocks.listAuthorizedRepositories).toHaveBeenCalled();
    });
    const user = await fillValidForm();

    await user.click(screen.getByRole('button', { name: '创建需求' }));
    expect(await screen.findByRole('alert')).toHaveTextContent(
      '相同 Idempotency-Key 对应不同 payload（requestId: req-idempotency-conflict）',
    );
    const firstKey = requirementMocks.createRequirement.mock.calls[0]?.[1];

    await user.click(screen.getByRole('button', { name: '创建需求' }));
    await waitFor(() => {
      expect(requirementMocks.createRequirement).toHaveBeenCalledTimes(2);
    });
    expect(requirementMocks.createRequirement.mock.calls[1]?.[1]).toBe(
      firstKey,
    );
    expect(screen.getByRole('alert')).toHaveTextContent(
      '相同 Idempotency-Key 对应不同 payload',
    );
  });

  it('关闭在途提交后忽略晚到成功，不触发创建完成或导航', async () => {
    let resolveCreate: ((result: CreateRequirementResult) => void) | undefined;
    const pendingCreate = new Promise<CreateRequirementResult>((resolve) => {
      resolveCreate = resolve;
    });
    requirementMocks.createRequirement.mockReturnValueOnce(pendingCreate);
    const { onCancel, onCreated } = renderModal();
    await waitFor(() => {
      expect(requirementMocks.listAuthorizedRepositories).toHaveBeenCalled();
    });
    const user = await fillValidForm();

    await user.click(screen.getByRole('button', { name: '创建需求' }));
    await waitFor(() => {
      expect(requirementMocks.createRequirement).toHaveBeenCalledTimes(1);
    });
    await user.click(screen.getByRole('button', { name: 'Close' }));
    expect(onCancel).toHaveBeenCalledTimes(1);

    await act(async () => {
      if (resolveCreate === undefined) {
        throw new Error('create request was not started');
      }
      resolveCreate(createdResult);
      await pendingCreate;
    });

    expect(onCreated).not.toHaveBeenCalled();
  });
});
