import { useMutation, useQuery } from '@umijs/max';
import {
  Alert,
  Button,
  Empty,
  Form,
  Input,
  Modal,
  Select,
  Typography,
} from 'antd';
import { useMemo, useRef, useState } from 'react';
import { BindingStatus } from './BindingStatus';
import {
  formatRequirementError,
  isRequirementAuthorizationFailure,
} from './error';
import { useWorkflowStyles } from './index.style';
import {
  addWorkItem,
  assignWorkItem,
  listAuthorizedRepositories,
} from './service';
import type { Requirement, WorkItem, WorkItemAssignment } from './type';
import {
  prepareWorkflowSubmission,
  type WorkflowSubmissionIdentity,
} from './workflowSubmission';

interface AddWorkItemFormValues {
  repositoryId: string;
}

interface AssignWorkItemFormValues {
  humanOwnerId: string;
  reason: string;
}

export interface WorkItemPlanningPanelProps {
  canAssign: boolean;
  canCreate: boolean;
  onChanged: () => Promise<unknown> | unknown;
  requirement: Requirement;
  requestId?: string;
  sessionKey: string;
  workItemAssignments: WorkItemAssignment[];
  workItems: WorkItem[];
}

export function WorkItemPlanningPanel({
  canAssign,
  canCreate,
  onChanged,
  requirement,
  requestId,
  sessionKey,
  workItemAssignments,
  workItems,
}: WorkItemPlanningPanelProps) {
  const { styles } = useWorkflowStyles();
  const refreshState = () => {
    void onChanged();
  };
  const [addForm] = Form.useForm<AddWorkItemFormValues>();
  const [assignForm] = Form.useForm<AssignWorkItemFormValues>();
  const [addOpen, setAddOpen] = useState(false);
  const [assignTargetId, setAssignTargetId] = useState<string>();
  const addIdentityRef = useRef<WorkflowSubmissionIdentity | undefined>(
    undefined,
  );
  const assignIdentityRef = useRef<WorkflowSubmissionIdentity | undefined>(
    undefined,
  );
  const repositoriesQuery = useQuery({
    enabled: addOpen && canCreate,
    gcTime: 0,
    queryFn: ({ signal }) =>
      listAuthorizedRepositories(requirement.workspaceId, signal),
    queryKey: [
      'requirement-work-item-repositories',
      sessionKey,
      requirement.workspaceId,
    ],
    retry: false,
  });
  const addMutation = useMutation({
    gcTime: 0,
    mutationFn: ({
      idempotencyKey,
      repositoryId,
    }: {
      idempotencyKey: string;
      repositoryId: string;
    }) =>
      addWorkItem(
        requirement.id,
        repositoryId,
        requirement.revision,
        idempotencyKey,
      ),
  });
  const assignMutation = useMutation({
    gcTime: 0,
    mutationFn: ({
      humanOwnerId,
      idempotencyKey,
      reason,
      target,
    }: {
      humanOwnerId: string;
      idempotencyKey: string;
      reason: string;
      target: WorkItem;
    }) =>
      assignWorkItem(
        requirement.id,
        target.id,
        { humanOwnerId, reason },
        target.revision,
        idempotencyKey,
      ),
  });
  const repositoriesAuthorizationFailure = isRequirementAuthorizationFailure(
    repositoriesQuery.error,
  );
  const assignTarget = workItems.find(
    (workItem) => workItem.id === assignTargetId,
  );
  const repositoryOptions = useMemo(
    () =>
      repositoriesAuthorizationFailure
        ? []
        : (repositoriesQuery.data ?? []).map((repository) => ({
            label: `${repository.projectPath} · ${repository.defaultBranch}`,
            value: repository.repositoryId,
          })),
    [repositoriesAuthorizationFailure, repositoriesQuery.data],
  );
  const repositoriesReady =
    repositoriesQuery.isSuccess &&
    !repositoriesQuery.isFetching &&
    repositoryOptions.length > 0;

  const closeAdd = () => {
    setAddOpen(false);
    addMutation.reset();
    addForm.resetFields();
  };

  const closeAssign = () => {
    setAssignTargetId(undefined);
    assignMutation.reset();
    assignForm.resetFields();
  };

  const submitAdd = async (values: AddWorkItemFormValues) => {
    const prepared = prepareWorkflowSubmission(
      { requirementId: requirement.id, repositoryId: values.repositoryId },
      addIdentityRef.current,
    );
    addIdentityRef.current = prepared.identity;
    try {
      await addMutation.mutateAsync({
        idempotencyKey: prepared.identity.idempotencyKey,
        repositoryId: prepared.input.repositoryId,
      });
      addIdentityRef.current = undefined;
      closeAdd();
      await onChanged();
    } catch {
      // 保留相同 payload 的提交身份，供未知结果安全重放。
    }
  };

  const submitAssignment = async (
    target: WorkItem,
    values: AssignWorkItemFormValues,
  ) => {
    const prepared = prepareWorkflowSubmission(
      {
        humanOwnerId: values.humanOwnerId,
        reason: values.reason,
        workItemId: target.id,
      },
      assignIdentityRef.current,
    );
    assignIdentityRef.current = prepared.identity;
    try {
      await assignMutation.mutateAsync({
        humanOwnerId: prepared.input.humanOwnerId,
        idempotencyKey: prepared.identity.idempotencyKey,
        reason: prepared.input.reason,
        target,
      });
      assignIdentityRef.current = undefined;
      closeAssign();
      await onChanged();
    } catch {
      // 保留相同 payload 的提交身份，供未知结果安全重放。
    }
  };

  return (
    <section
      aria-labelledby="work-item-planning-title"
      className={styles.panel}
    >
      <div className={styles.panelHeader}>
        <Typography.Title
          className={styles.panelTitle}
          id="work-item-planning-title"
          level={3}
        >
          WorkItems
        </Typography.Title>
        {canCreate ? (
          <Button onClick={() => setAddOpen(true)} type="primary">
            增加 WorkItem
          </Button>
        ) : null}
      </div>

      {workItems.length === 0 ? (
        <Empty description="当前 Requirement 没有 WorkItem" />
      ) : (
        <div className={styles.stack}>
          {workItems.map((workItem) => {
            const currentAssignment = workItemAssignments.find(
              (assignment) =>
                assignment.workItemId === workItem.id &&
                assignment.supersededAt === null,
            );
            return (
              <div className={styles.item} key={workItem.id}>
                <BindingStatus requestId={requestId} workItem={workItem} />
                {currentAssignment ? (
                  <Typography.Text type="secondary">
                    当前分配：{currentAssignment.assigneeId} ·{' '}
                    {currentAssignment.reason}
                  </Typography.Text>
                ) : null}
                {canAssign ? (
                  <div className={styles.itemActions}>
                    <Button onClick={() => setAssignTargetId(workItem.id)}>
                      分配负责人
                    </Button>
                  </div>
                ) : null}
              </div>
            );
          })}
        </div>
      )}

      <Modal
        destroyOnHidden
        footer={null}
        mask={{ closable: false }}
        onCancel={closeAdd}
        open={addOpen}
        title="增加 WorkItem"
      >
        <Form<AddWorkItemFormValues>
          clearOnDestroy
          form={addForm}
          layout="vertical"
          onFinish={submitAdd}
          onValuesChange={() => addMutation.reset()}
        >
          <Form.Item<AddWorkItemFormValues>
            label="仓库"
            name="repositoryId"
            rules={[{ message: '请选择仓库', required: true }]}
          >
            <Select
              disabled={!repositoriesReady}
              loading={repositoriesQuery.isLoading}
              options={repositoryOptions}
              placeholder="选择已授权仓库"
              showSearch={{ optionFilterProp: 'label' }}
              virtual={false}
            />
          </Form.Item>
          {repositoriesQuery.isSuccess && repositoryOptions.length === 0 ? (
            <Alert
              showIcon
              title="该工作区没有可增加的授权仓库"
              type="warning"
            />
          ) : null}
          {repositoriesQuery.error ? (
            <Alert
              action={
                <Button onClick={() => void repositoriesQuery.refetch()}>
                  重试加载授权仓库
                </Button>
              }
              showIcon
              title={formatRequirementError(
                repositoriesQuery.error,
                '授权仓库加载失败',
              )}
              type="error"
            />
          ) : null}
          {addMutation.error ? (
            <Alert
              action={<Button onClick={refreshState}>重新读取状态</Button>}
              showIcon
              title={formatRequirementError(
                addMutation.error,
                'WorkItem 增加失败，请重新读取状态后重试',
              )}
              type="error"
            />
          ) : null}
          <div className={styles.formFooter}>
            <Button disabled={addMutation.isPending} onClick={closeAdd}>
              取消
            </Button>
            <Button
              disabled={!repositoriesReady}
              htmlType="submit"
              loading={addMutation.isPending}
              type="primary"
            >
              确认增加
            </Button>
          </div>
        </Form>
      </Modal>

      <Modal
        destroyOnHidden
        footer={null}
        mask={{ closable: false }}
        onCancel={closeAssign}
        open={assignTarget !== undefined}
        title="分配 WorkItem 负责人"
      >
        {assignTarget ? (
          <Form<AssignWorkItemFormValues>
            clearOnDestroy
            form={assignForm}
            layout="vertical"
            onFinish={(values) => submitAssignment(assignTarget, values)}
            onValuesChange={() => assignMutation.reset()}
          >
            <Form.Item<AssignWorkItemFormValues>
              label="负责人账号 ID"
              name="humanOwnerId"
              rules={[
                {
                  message: '请输入负责人账号 ID',
                  required: true,
                  whitespace: true,
                },
              ]}
            >
              <Input maxLength={200} />
            </Form.Item>
            <Form.Item<AssignWorkItemFormValues>
              label="分配原因"
              name="reason"
              rules={[
                { message: '请输入分配原因', required: true, whitespace: true },
              ]}
            >
              <Input.TextArea maxLength={2000} rows={3} showCount />
            </Form.Item>
            {assignMutation.error ? (
              <Alert
                action={<Button onClick={refreshState}>重新读取状态</Button>}
                showIcon
                title={formatRequirementError(
                  assignMutation.error,
                  '负责人分配失败，请重新读取状态后重试',
                )}
                type="error"
              />
            ) : null}
            <div className={styles.formFooter}>
              <Button disabled={assignMutation.isPending} onClick={closeAssign}>
                取消
              </Button>
              <Button
                htmlType="submit"
                loading={assignMutation.isPending}
                type="primary"
              >
                确认分配
              </Button>
            </div>
          </Form>
        ) : null}
      </Modal>
    </section>
  );
}
