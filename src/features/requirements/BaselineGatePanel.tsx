import { useMutation } from '@umijs/max';
import type { DescriptionsProps } from 'antd';
import {
  Alert,
  Button,
  Descriptions,
  Empty,
  Form,
  Input,
  Modal,
  Select,
  Typography,
} from 'antd';
import { useRef, useState } from 'react';
import { formatRequirementError } from './error';
import { useWorkflowStyles } from './index.style';
import {
  decideBaseline,
  reassignBaselineGate,
  submitBaselineConfirmation,
} from './service';
import type {
  Decision,
  DecisionOutcome,
  GateAssignment,
  GateInstance,
  Requirement,
  SddBaseline,
} from './type';
import {
  prepareWorkflowSubmission,
  type WorkflowSubmissionIdentity,
} from './workflowSubmission';

interface ReassignmentFormValues {
  reason: string;
  reviewerId: string;
}

interface DecisionFormValues {
  outcome: DecisionOutcome;
  reason: string;
}

export interface BaselineGatePanelProps {
  assignment: GateAssignment | null;
  baseline: SddBaseline | null;
  canAssign: boolean;
  canDecide: boolean;
  canSubmit: boolean;
  decision: Decision | null;
  gate: GateInstance | null;
  onChanged: () => Promise<unknown> | unknown;
  principalAccountId: string | null;
  requirement: Requirement;
}

const DECISION_OPTIONS: Array<{ label: string; value: DecisionOutcome }> = [
  { label: '批准', value: 'APPROVED' },
  { label: '要求修改', value: 'CHANGES_REQUESTED' },
  { label: '拒绝', value: 'REJECTED' },
];

export function BaselineGatePanel({
  assignment,
  baseline,
  canAssign,
  canDecide,
  canSubmit,
  decision,
  gate,
  onChanged,
  principalAccountId,
  requirement,
}: BaselineGatePanelProps) {
  const { styles } = useWorkflowStyles();
  const refreshState = () => {
    void onChanged();
  };
  const [reassignmentForm] = Form.useForm<ReassignmentFormValues>();
  const [decisionForm] = Form.useForm<DecisionFormValues>();
  const [reassignmentOpen, setReassignmentOpen] = useState(false);
  const [decisionOpen, setDecisionOpen] = useState(false);
  const confirmationIdentityRef = useRef<
    WorkflowSubmissionIdentity | undefined
  >(undefined);
  const reassignmentIdentityRef = useRef<
    WorkflowSubmissionIdentity | undefined
  >(undefined);
  const decisionIdentityRef = useRef<WorkflowSubmissionIdentity | undefined>(
    undefined,
  );
  const confirmationMutation = useMutation({
    gcTime: 0,
    mutationFn: ({
      idempotencyKey,
      sddBaselineId,
    }: {
      idempotencyKey: string;
      sddBaselineId: string;
    }) =>
      submitBaselineConfirmation(
        requirement.id,
        sddBaselineId,
        requirement.revision,
        idempotencyKey,
      ),
  });
  const reassignmentMutation = useMutation({
    gcTime: 0,
    mutationFn: ({
      idempotencyKey,
      input,
      target,
    }: {
      idempotencyKey: string;
      input: ReassignmentFormValues;
      target: GateInstance;
    }) => {
      return reassignBaselineGate(
        requirement.id,
        target.id,
        input,
        target.revision,
        idempotencyKey,
      );
    },
  });
  const decisionMutation = useMutation({
    gcTime: 0,
    mutationFn: ({
      idempotencyKey,
      input,
      target,
    }: {
      idempotencyKey: string;
      input: DecisionFormValues;
      target: GateInstance;
    }) => {
      return decideBaseline(
        requirement.id,
        { gateId: target.id, outcome: input.outcome, reason: input.reason },
        requirement.revision,
        idempotencyKey,
      );
    },
  });
  const canReassignCurrentGate =
    canAssign && gate?.state === 'OPEN' && assignment !== null && !decision;
  const canDecideCurrentGate =
    canDecide &&
    gate?.state === 'OPEN' &&
    assignment !== null &&
    decision === null &&
    principalAccountId !== null &&
    assignment.currentReviewerId === principalAccountId;
  const gateItems: DescriptionsProps['items'] = gate
    ? [
        { children: gate.id, key: 'id', label: 'Gate ID' },
        { children: gate.state, key: 'state', label: 'Gate 状态' },
        {
          children: gate.requirementVersion,
          key: 'requirementVersion',
          label: 'Requirement Version',
        },
        {
          children: gate.sddBaselineId,
          key: 'sddBaselineId',
          label: 'SDD Baseline ID',
        },
        { children: gate.policyCode, key: 'policyCode', label: 'Policy Code' },
        {
          children: gate.policyVersion,
          key: 'policyVersion',
          label: 'Policy Version',
        },
        {
          children: (
            <code className={styles.code}>{gate.policySnapshotHash}</code>
          ),
          key: 'policySnapshotHash',
          label: 'Policy Snapshot Hash',
        },
        { children: gate.revision, key: 'revision', label: 'Gate Revision' },
      ]
    : [];
  const assignmentItems: DescriptionsProps['items'] = assignment
    ? [
        {
          children: assignment.defaultReviewerId,
          key: 'defaultReviewerId',
          label: '默认审核人',
        },
        {
          children: assignment.currentReviewerId,
          key: 'currentReviewerId',
          label: '当前审核人',
        },
        {
          children: assignment.revision,
          key: 'revision',
          label: 'Assignment Revision',
        },
      ]
    : [];
  const decisionItems: DescriptionsProps['items'] = decision
    ? [
        { children: decision.outcome, key: 'outcome', label: 'Decision' },
        { children: decision.reviewerId, key: 'reviewerId', label: '审核人' },
        { children: decision.reason, key: 'reason', label: '原因' },
        {
          children: decision.subjectRevision,
          key: 'subjectRevision',
          label: 'Subject Revision',
        },
      ]
    : [];

  const closeReassignment = () => {
    setReassignmentOpen(false);
    reassignmentMutation.reset();
    reassignmentForm.resetFields();
  };

  const closeDecision = () => {
    setDecisionOpen(false);
    decisionMutation.reset();
    decisionForm.resetFields();
  };

  const submitConfirmation = async (target: SddBaseline) => {
    const prepared = prepareWorkflowSubmission(
      { requirementId: requirement.id, sddBaselineId: target.id },
      confirmationIdentityRef.current,
    );
    confirmationIdentityRef.current = prepared.identity;
    try {
      await confirmationMutation.mutateAsync({
        idempotencyKey: prepared.identity.idempotencyKey,
        sddBaselineId: prepared.input.sddBaselineId,
      });
      confirmationIdentityRef.current = undefined;
      await onChanged();
    } catch {
      // 保留稳定 key，结果未知时由用户读取状态或重放相同命令。
    }
  };

  const submitReassignment = async (
    target: GateInstance,
    values: ReassignmentFormValues,
  ) => {
    const prepared = prepareWorkflowSubmission(
      {
        gateId: target.id,
        reason: values.reason,
        reviewerId: values.reviewerId,
      },
      reassignmentIdentityRef.current,
    );
    reassignmentIdentityRef.current = prepared.identity;
    try {
      await reassignmentMutation.mutateAsync({
        idempotencyKey: prepared.identity.idempotencyKey,
        input: {
          reason: prepared.input.reason,
          reviewerId: prepared.input.reviewerId,
        },
        target,
      });
      reassignmentIdentityRef.current = undefined;
      closeReassignment();
      await onChanged();
    } catch {
      // 保留稳定 key，结果未知时重放相同命令。
    }
  };

  const submitDecision = async (
    target: GateInstance,
    values: DecisionFormValues,
  ) => {
    const prepared = prepareWorkflowSubmission(
      { gateId: target.id, outcome: values.outcome, reason: values.reason },
      decisionIdentityRef.current,
    );
    decisionIdentityRef.current = prepared.identity;
    try {
      await decisionMutation.mutateAsync({
        idempotencyKey: prepared.identity.idempotencyKey,
        input: {
          outcome: prepared.input.outcome,
          reason: prepared.input.reason,
        },
        target,
      });
      decisionIdentityRef.current = undefined;
      closeDecision();
      await onChanged();
    } catch {
      // 保留稳定 key，结果未知时重放相同命令。
    }
  };

  return (
    <section aria-labelledby="baseline-gate-title" className={styles.panel}>
      <div className={styles.panelHeader}>
        <Typography.Title
          className={styles.panelTitle}
          id="baseline-gate-title"
          level={3}
        >
          Baseline 人工 Gate
        </Typography.Title>
        <div className={styles.actions}>
          {canSubmit && baseline && !gate ? (
            <Button
              loading={confirmationMutation.isPending}
              onClick={() => void submitConfirmation(baseline)}
              type="primary"
            >
              提交基线确认
            </Button>
          ) : null}
          {canReassignCurrentGate ? (
            <Button onClick={() => setReassignmentOpen(true)}>
              改派审核人
            </Button>
          ) : null}
          {canDecideCurrentGate ? (
            <Button onClick={() => setDecisionOpen(true)} type="primary">
              提交 Decision
            </Button>
          ) : null}
        </div>
      </div>

      {!baseline ? (
        <Empty
          description="先登记 SDD Baseline 才能提交人工确认"
          image={Empty.PRESENTED_IMAGE_SIMPLE}
        />
      ) : null}
      {baseline && !gate ? (
        <Empty
          description="当前 Baseline 尚未提交人工确认"
          image={Empty.PRESENTED_IMAGE_SIMPLE}
        />
      ) : null}
      {gate ? (
        <Descriptions bordered column={2} items={gateItems} size="small" />
      ) : null}
      {assignment ? (
        <Descriptions
          bordered
          column={3}
          items={assignmentItems}
          size="small"
          title="当前 Gate Assignment"
        />
      ) : null}
      {decision ? (
        <Descriptions
          bordered
          column={2}
          items={decisionItems}
          size="small"
          title="当前 Decision"
        />
      ) : null}
      {confirmationMutation.error ? (
        <Alert
          action={<Button onClick={refreshState}>重新读取状态</Button>}
          showIcon
          title={formatRequirementError(
            confirmationMutation.error,
            '基线确认提交结果未知，请重新读取状态后重试',
          )}
          type="error"
        />
      ) : null}

      <Modal
        destroyOnHidden
        footer={null}
        mask={{ closable: false }}
        onCancel={closeReassignment}
        open={reassignmentOpen}
        title="改派审核人"
      >
        {gate ? (
          <Form<ReassignmentFormValues>
            clearOnDestroy
            form={reassignmentForm}
            layout="vertical"
            onFinish={(values) => submitReassignment(gate, values)}
            onValuesChange={() => reassignmentMutation.reset()}
          >
            <Form.Item<ReassignmentFormValues>
              label="新审核人账号 ID"
              name="reviewerId"
              rules={[
                {
                  message: '请输入审核人账号 ID',
                  required: true,
                  whitespace: true,
                },
              ]}
            >
              <Input maxLength={200} />
            </Form.Item>
            <Form.Item<ReassignmentFormValues>
              label="改派原因"
              name="reason"
              rules={[
                { message: '请输入改派原因', required: true, whitespace: true },
              ]}
            >
              <Input.TextArea maxLength={2000} rows={3} showCount />
            </Form.Item>
            {reassignmentMutation.error ? (
              <Alert
                action={<Button onClick={refreshState}>重新读取状态</Button>}
                showIcon
                title={formatRequirementError(
                  reassignmentMutation.error,
                  'Gate 改派失败，请重新读取状态后重试',
                )}
                type="error"
              />
            ) : null}
            <div className={styles.formFooter}>
              <Button
                disabled={reassignmentMutation.isPending}
                onClick={closeReassignment}
              >
                取消
              </Button>
              <Button
                htmlType="submit"
                loading={reassignmentMutation.isPending}
                type="primary"
              >
                确认改派
              </Button>
            </div>
          </Form>
        ) : null}
      </Modal>

      <Modal
        destroyOnHidden
        footer={null}
        mask={{ closable: false }}
        onCancel={closeDecision}
        open={decisionOpen}
        title="提交 Baseline Decision"
      >
        {gate ? (
          <Form<DecisionFormValues>
            clearOnDestroy
            form={decisionForm}
            layout="vertical"
            onFinish={(values) => submitDecision(gate, values)}
            onValuesChange={() => decisionMutation.reset()}
          >
            <Form.Item<DecisionFormValues>
              label="Decision 结果"
              name="outcome"
              rules={[{ message: '请选择 Decision 结果', required: true }]}
            >
              <Select options={DECISION_OPTIONS} virtual={false} />
            </Form.Item>
            <Form.Item<DecisionFormValues>
              label="Decision 原因"
              name="reason"
              rules={[
                {
                  message: '请输入 Decision 原因',
                  required: true,
                  whitespace: true,
                },
              ]}
            >
              <Input.TextArea maxLength={2000} rows={4} showCount />
            </Form.Item>
            {decisionMutation.error ? (
              <Alert
                action={<Button onClick={refreshState}>重新读取状态</Button>}
                showIcon
                title={formatRequirementError(
                  decisionMutation.error,
                  'Decision 提交失败，请重新读取状态后重试',
                )}
                type="error"
              />
            ) : null}
            <div className={styles.formFooter}>
              <Button
                disabled={decisionMutation.isPending}
                onClick={closeDecision}
              >
                取消
              </Button>
              <Button
                htmlType="submit"
                loading={decisionMutation.isPending}
                type="primary"
              >
                确认提交
              </Button>
            </div>
          </Form>
        ) : null}
      </Modal>
    </section>
  );
}
