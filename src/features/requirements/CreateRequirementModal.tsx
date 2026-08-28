import { useMutation, useQuery } from '@umijs/max';
import { Alert, Button, Form, Input, Modal, Select, Typography } from 'antd';
import { useEffect, useMemo, useRef } from 'react';
import type { WorkspaceSummary } from '@/features/auth';
import { REQUIREMENT_TYPE_META } from './constant';
import {
  formatRequirementError,
  isRequirementAuthorizationFailure,
} from './error';
import { useStyles } from './index.style';
import { createRequirement, listAuthorizedRepositories } from './service';
import {
  prepareRequirementSubmission,
  type RequirementSubmissionIdentity,
} from './submission';
import type {
  CreateRequirementInput,
  CreateRequirementResult,
  RequirementType,
} from './type';

interface CreateRequirementFormValues {
  acceptanceCriteria: string[];
  description: string;
  initialRepositoryId: string;
  title: string;
  type: RequirementType;
  workspaceId: string;
}

export interface CreateRequirementModalProps {
  initialWorkspaceId?: string;
  onCancel: () => void;
  onCreated: (result: CreateRequirementResult) => Promise<void> | void;
  open: boolean;
  sessionKey: string;
  workspaces: WorkspaceSummary[];
}

export function CreateRequirementModal({
  initialWorkspaceId,
  onCancel,
  onCreated,
  open,
  sessionKey,
  workspaces,
}: CreateRequirementModalProps) {
  const { styles } = useStyles();
  const [form] = Form.useForm<CreateRequirementFormValues>();
  const workspaceId = Form.useWatch('workspaceId', form);
  const submissionIdentityRef = useRef<
    RequirementSubmissionIdentity | undefined
  >(undefined);
  const submissionSequenceRef = useRef(0);
  const repositoriesQuery = useQuery({
    enabled: open && workspaceId !== undefined,
    gcTime: 0,
    queryFn: ({ signal }) =>
      listAuthorizedRepositories(workspaceId as string, signal),
    queryKey: ['requirement-authorized-repositories', sessionKey, workspaceId],
    retry: false,
  });
  const createMutation = useMutation({
    gcTime: 0,
    mutationFn: ({
      idempotencyKey,
      input,
    }: {
      idempotencyKey: string;
      input: CreateRequirementInput;
    }) => createRequirement(input, idempotencyKey),
  });
  const repositoriesAuthorizationFailure = isRequirementAuthorizationFailure(
    repositoriesQuery.error,
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

  useEffect(
    () => () => {
      submissionSequenceRef.current += 1;
    },
    [],
  );

  useEffect(() => {
    const selectedRepositoryId = form.getFieldValue('initialRepositoryId');
    if (
      selectedRepositoryId !== undefined &&
      !repositoryOptions.some(
        (repository) => repository.value === selectedRepositoryId,
      )
    ) {
      form.setFieldValue('initialRepositoryId', undefined);
    }
  }, [form, repositoryOptions]);

  const cancel = () => {
    submissionSequenceRef.current += 1;
    submissionIdentityRef.current = undefined;
    createMutation.reset();
    form.resetFields();
    onCancel();
  };

  const submit = async (values: CreateRequirementFormValues) => {
    const submissionSequence = ++submissionSequenceRef.current;
    const prepared = prepareRequirementSubmission(
      values,
      submissionIdentityRef.current,
    );
    submissionIdentityRef.current = prepared.identity;
    try {
      const result = await createMutation.mutateAsync({
        idempotencyKey: prepared.identity.idempotencyKey,
        input: prepared.input,
      });
      if (submissionSequence !== submissionSequenceRef.current) {
        return;
      }
      submissionIdentityRef.current = undefined;
      form.resetFields();
      await onCreated(result);
    } catch {
      // useMutation retains the normalized failure for the explicit retry UI.
    }
  };

  return (
    <Modal
      destroyOnHidden
      footer={null}
      mask={{ closable: false }}
      onCancel={cancel}
      open={open}
      title="创建需求"
    >
      <Form<CreateRequirementFormValues>
        clearOnDestroy
        form={form}
        initialValues={{
          acceptanceCriteria: [''],
          workspaceId: initialWorkspaceId,
        }}
        layout="vertical"
        onFinish={submit}
        onValuesChange={(changedValues) => {
          if (changedValues.workspaceId !== undefined) {
            form.setFieldValue('initialRepositoryId', undefined);
          }
          if (createMutation.error !== null) {
            createMutation.reset();
          }
        }}
      >
        <Form.Item<CreateRequirementFormValues>
          label="需求类型"
          name="type"
          rules={[{ message: '请选择需求类型', required: true }]}
        >
          <Select
            options={Object.entries(REQUIREMENT_TYPE_META).map(
              ([value, meta]) => ({ label: meta.label, value }),
            )}
            placeholder="选择需求类型"
            virtual={false}
          />
        </Form.Item>

        <Form.Item<CreateRequirementFormValues>
          label="标题"
          name="title"
          rules={[{ message: '请输入标题', required: true, whitespace: true }]}
        >
          <Input maxLength={200} placeholder="概括本次需求" showCount />
        </Form.Item>

        <Form.Item<CreateRequirementFormValues>
          label="描述"
          name="description"
          rules={[{ message: '请输入描述', required: true, whitespace: true }]}
        >
          <Input.TextArea
            maxLength={10_000}
            placeholder="说明目标、约束与上下文"
            rows={4}
            showCount
          />
        </Form.Item>

        <Form.List name="acceptanceCriteria">
          {(fields, { add, remove }) => (
            <>
              <div className={styles.criteriaHeader}>
                <Typography.Text strong>验收条件</Typography.Text>
                <Button onClick={() => add('')} size="small" type="dashed">
                  添加验收条件
                </Button>
              </div>
              {fields.map((field, index) => {
                const { key, ...fieldProps } = field;
                return (
                  <div className={styles.criterionRow} key={key}>
                    <Form.Item
                      {...fieldProps}
                      className={styles.criterionItem}
                      label={`验收条件 ${index + 1}`}
                      rules={[
                        {
                          message: '请输入验收条件',
                          required: true,
                          whitespace: true,
                        },
                      ]}
                    >
                      <Input.TextArea
                        placeholder="写出可验证的完成条件"
                        rows={2}
                      />
                    </Form.Item>
                    <Button
                      aria-label={`删除验收条件 ${index + 1}`}
                      disabled={fields.length === 1}
                      onClick={() => remove(field.name)}
                      type="text"
                    >
                      删除
                    </Button>
                  </div>
                );
              })}
            </>
          )}
        </Form.List>

        <Form.Item<CreateRequirementFormValues>
          label="工作区"
          name="workspaceId"
          rules={[{ message: '请选择工作区', required: true }]}
        >
          <Select
            options={workspaces.map((workspace) => ({
              label: workspace.name,
              value: workspace.id,
            }))}
            placeholder="选择具备创建权限的工作区"
            virtual={false}
          />
        </Form.Item>

        <Form.Item<CreateRequirementFormValues>
          label="仓库"
          name="initialRepositoryId"
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

        {repositoriesQuery.isLoading ? (
          <Typography.Text type="secondary">正在加载授权仓库</Typography.Text>
        ) : null}
        {repositoriesQuery.isSuccess && repositoryOptions.length === 0 ? (
          <Alert showIcon title="该工作区没有已授权仓库" type="warning" />
        ) : null}
        {repositoriesQuery.isError ? (
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
        {createMutation.error ? (
          <Alert
            showIcon
            title={formatRequirementError(
              createMutation.error,
              '需求创建失败，确认内容后可重试',
            )}
            type="error"
          />
        ) : null}

        <div className={styles.formFooter}>
          <Button disabled={createMutation.isPending} onClick={cancel}>
            取消
          </Button>
          <Button
            disabled={!repositoriesReady}
            htmlType="submit"
            loading={createMutation.isPending}
            type="primary"
          >
            创建需求
          </Button>
        </div>
      </Form>
    </Modal>
  );
}
