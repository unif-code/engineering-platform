import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { App, ConfigProvider } from 'antd';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type {
  Decision,
  GateAssignment,
  GateInstance,
  Requirement,
  SddBaseline,
} from './type';

const serviceMocks = vi.hoisted(() => ({
  decideBaseline: vi.fn(),
  reassignBaselineGate: vi.fn(),
  submitBaselineConfirmation: vi.fn(),
}));

vi.mock('@umijs/max', async () => ({
  ...(await import('@tanstack/react-query')),
}));

vi.mock('./service', () => serviceMocks);

import { BaselineGatePanel } from './BaselineGatePanel';

const requirement: Requirement = {
  acceptanceCriteria: ['完成闭环'],
  createdAt: '2026-08-31T08:00:00Z',
  createdBy: 'account-creator',
  currentSddBaselineId: 'baseline-1',
  description: 'V0.4 Requirement',
  id: 'requirement-1',
  initialRepositoryId: 'repository-1',
  recordState: 'ACTIVE',
  requiredWorkItemSetHash: 'work-item-set-hash',
  requiredWorkItemSetVersion: 1,
  requirementVersion: 4,
  revision: 8,
  routeSnapshot: { requirementType: 'feat', version: 2 },
  routeSnapshotHash: 'route-hash',
  routeSnapshotVersion: 2,
  state: 'AWAITING_CONFIRMATION',
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
  requirementVersion: 4,
  routeSnapshotHash: 'route-hash',
  routeSnapshotVersion: 2,
};

const gate: GateInstance = {
  artifactHash: 'artifact-hash',
  artifactId: 'artifact-1',
  artifactVersion: '2',
  createdAt: '2026-08-31T08:00:00Z',
  decidedAt: null,
  gateType: 'REQUIREMENT_BASELINE_CONFIRMATION',
  id: 'gate-1',
  policyCode: 'requirement-baseline-default',
  policySnapshotHash: 'policy-hash',
  policyVersion: 1,
  requirementId: requirement.id,
  requirementVersion: 4,
  revision: 2,
  routeSnapshotHash: 'route-hash',
  routeSnapshotVersion: 2,
  sddBaselineId: baseline.id,
  state: 'OPEN',
};

const assignment: GateAssignment = {
  assignedAt: '2026-08-31T08:00:00Z',
  currentReviewerId: 'account-reviewer',
  defaultReviewerId: 'account-creator',
  gateInstanceId: gate.id,
  id: 'assignment-1',
  revision: 1,
  supersededAt: null,
};

const decision: Decision = {
  decidedAt: '2026-08-31T08:02:00Z',
  gateAssignmentId: assignment.id,
  gateInstanceId: gate.id,
  id: 'decision-1',
  outcome: 'APPROVED',
  reason: '基线清晰可执行',
  reviewerId: 'account-reviewer',
  subjectRevision: 8,
};

function renderPanel(
  overrides: Partial<React.ComponentProps<typeof BaselineGatePanel>> = {},
) {
  const onChanged = vi.fn().mockResolvedValue(undefined);
  const props: React.ComponentProps<typeof BaselineGatePanel> = {
    assignment: null,
    baseline,
    canAssign: true,
    canDecide: true,
    canSubmit: true,
    decision: null,
    gate: null,
    onChanged,
    principalAccountId: 'account-reviewer',
    requirement,
    ...overrides,
  };
  const queryClient = new QueryClient({
    defaultOptions: { mutations: { retry: false }, queries: { retry: false } },
  });
  render(
    <QueryClientProvider client={queryClient}>
      <ConfigProvider theme={{ token: { motion: false } }}>
        <App>
          <BaselineGatePanel {...props} />
        </App>
      </ConfigProvider>
    </QueryClientProvider>,
  );
  return { onChanged };
}

async function selectOption(label: string, option: string) {
  const user = userEvent.setup();
  await user.click(screen.getByRole('combobox', { name: label }));
  await user.click(await screen.findByRole('option', { name: option }));
}

beforeEach(() => {
  serviceMocks.decideBaseline.mockReset();
  serviceMocks.reassignBaselineGate.mockReset();
  serviceMocks.submitBaselineConfirmation.mockReset();
});

describe('BaselineGatePanel', () => {
  it('提交当前 Baseline 确认时使用 Requirement revision', async () => {
    serviceMocks.submitBaselineConfirmation
      .mockRejectedValueOnce(new Error('确认结果未知'))
      .mockResolvedValueOnce({});
    const { onChanged } = renderPanel();
    const user = userEvent.setup();

    await user.click(screen.getByRole('button', { name: '提交基线确认' }));
    expect(await screen.findByRole('alert')).toHaveTextContent('确认结果未知');
    await user.click(screen.getByRole('button', { name: '重新读取状态' }));
    await user.click(screen.getByRole('button', { name: '提交基线确认' }));

    await waitFor(() => {
      expect(serviceMocks.submitBaselineConfirmation).toHaveBeenCalledTimes(2);
    });
    expect(serviceMocks.submitBaselineConfirmation.mock.calls[0]).toEqual([
      'requirement-1',
      'baseline-1',
      8,
      expect.any(String),
    ]);
    expect(serviceMocks.submitBaselineConfirmation.mock.calls[1]?.[3]).toBe(
      serviceMocks.submitBaselineConfirmation.mock.calls[0]?.[3],
    );
    expect(onChanged).toHaveBeenCalledTimes(2);
  });

  it('Gate 改派使用 Gate revision 与规范化原因', async () => {
    serviceMocks.reassignBaselineGate
      .mockRejectedValueOnce(new Error('改派结果未知'))
      .mockResolvedValueOnce({});
    const { onChanged } = renderPanel({ assignment, gate });
    const user = userEvent.setup();

    await user.click(screen.getByRole('button', { name: '改派审核人' }));
    const dialog = await screen.findByRole('dialog', { name: '改派审核人' });
    await user.type(
      within(dialog).getByRole('textbox', { name: '新审核人账号 ID' }),
      ' account-reviewer-2 ',
    );
    await user.type(
      within(dialog).getByRole('textbox', { name: '改派原因' }),
      ' 交由领域审核人 ',
    );
    await user.click(within(dialog).getByRole('button', { name: '确认改派' }));
    expect(await within(dialog).findByRole('alert')).toHaveTextContent(
      '改派结果未知',
    );
    await user.click(within(dialog).getByRole('button', { name: '确认改派' }));

    await waitFor(() => {
      expect(serviceMocks.reassignBaselineGate).toHaveBeenCalledTimes(2);
    });
    expect(serviceMocks.reassignBaselineGate.mock.calls[0]).toEqual([
      'requirement-1',
      'gate-1',
      { reason: '交由领域审核人', reviewerId: 'account-reviewer-2' },
      2,
      expect.any(String),
    ]);
    expect(serviceMocks.reassignBaselineGate.mock.calls[1]?.[4]).toBe(
      serviceMocks.reassignBaselineGate.mock.calls[0]?.[4],
    );
    expect(onChanged).toHaveBeenCalledTimes(1);
  });

  it('只有当前审核账号且具备 Capability 才显示 Decision 入口', () => {
    renderPanel({
      assignment,
      gate,
      principalAccountId: 'account-other',
    });
    expect(screen.queryByRole('button', { name: '提交 Decision' })).toBeNull();
    expect(screen.getByText('account-reviewer')).toBeVisible();
  });

  it.each([
    { label: '批准', outcome: 'APPROVED' },
    { label: '要求修改', outcome: 'CHANGES_REQUESTED' },
    { label: '拒绝', outcome: 'REJECTED' },
  ] as const)(
    '当前审核人提交精确 $outcome Decision 与 Requirement revision',
    async ({ label, outcome }) => {
      serviceMocks.decideBaseline
        .mockRejectedValueOnce(new Error('Decision 结果未知'))
        .mockResolvedValueOnce({});
      const { onChanged } = renderPanel({ assignment, gate });
      const user = userEvent.setup();

      await user.click(screen.getByRole('button', { name: '提交 Decision' }));
      const dialog = await screen.findByRole('dialog', {
        name: '提交 Baseline Decision',
      });
      await selectOption('Decision 结果', label);
      await user.type(
        within(dialog).getByRole('textbox', { name: 'Decision 原因' }),
        ' 需要补充异常路径 ',
      );
      await user.click(
        within(dialog).getByRole('button', { name: '确认提交' }),
      );
      expect(await within(dialog).findByRole('alert')).toHaveTextContent(
        'Decision 结果未知',
      );
      await user.click(
        within(dialog).getByRole('button', { name: '重新读取状态' }),
      );
      await user.click(
        within(dialog).getByRole('button', { name: '确认提交' }),
      );

      await waitFor(() => {
        expect(serviceMocks.decideBaseline).toHaveBeenCalledTimes(2);
      });
      expect(serviceMocks.decideBaseline.mock.calls[0]).toEqual([
        'requirement-1',
        {
          gateId: 'gate-1',
          outcome,
          reason: '需要补充异常路径',
        },
        8,
        expect.any(String),
      ]);
      expect(serviceMocks.decideBaseline.mock.calls[1]?.[3]).toBe(
        serviceMocks.decideBaseline.mock.calls[0]?.[3],
      );
      expect(onChanged).toHaveBeenCalledTimes(2);
    },
  );

  it('只读展示服务端已记录的 Decision', () => {
    renderPanel({ assignment, decision, gate: { ...gate, state: 'DECIDED' } });

    expect(screen.getByText('当前 Decision')).toBeVisible();
    expect(screen.getByText('APPROVED')).toBeVisible();
    expect(screen.getByText('基线清晰可执行')).toBeVisible();
    expect(screen.queryByRole('button', { name: '改派审核人' })).toBeNull();
    expect(screen.queryByRole('button', { name: '提交 Decision' })).toBeNull();
  });
});
