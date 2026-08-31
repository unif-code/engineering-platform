import { useMutation, useQuery } from '@umijs/max';
import type { DescriptionsProps } from 'antd';
import {
  Alert,
  Button,
  Descriptions,
  Empty,
  Form,
  Input,
  Modal,
  Typography,
} from 'antd';
import { useEffect, useRef, useState } from 'react';
import {
  formatRequirementError,
  isRequirementAuthorizationFailure,
} from './error';
import { useWorkflowStyles } from './index.style';
import {
  createSddArtifact,
  getSddArtifactVersion,
  registerSddBaseline,
} from './service';
import type { Requirement, SddBaseline } from './type';
import {
  prepareSddWorkflowSubmission,
  recordSddArtifactCreated,
  type SddWorkflowSubmission,
} from './workflowSubmission';

interface SddFormValues {
  content: string;
}

export interface SddBaselinePanelProps {
  baseline: SddBaseline | null;
  canSubmit: boolean;
  onChanged: () => Promise<unknown> | unknown;
  requirement: Requirement;
  sessionKey: string;
}

function artifactVersionNumber(baseline: SddBaseline | null): number | null {
  if (!baseline) {
    return null;
  }
  const version = Number(baseline.artifactVersion);
  return Number.isSafeInteger(version) && version >= 1 ? version : null;
}

export function SddBaselinePanel({
  baseline,
  canSubmit,
  onChanged,
  requirement,
  sessionKey,
}: SddBaselinePanelProps) {
  const { styles } = useWorkflowStyles();
  const refreshState = () => {
    void onChanged();
  };
  const [form] = Form.useForm<SddFormValues>();
  const [editorOpen, setEditorOpen] = useState(false);
  const submissionRef = useRef<SddWorkflowSubmission | undefined>(undefined);
  const artifactVersion = artifactVersionNumber(baseline);
  const artifactQuery = useQuery({
    enabled: baseline !== null && artifactVersion !== null,
    gcTime: 0,
    queryFn: ({ signal }) =>
      getSddArtifactVersion(
        requirement.id,
        (baseline as SddBaseline).artifactId,
        artifactVersion as number,
        signal,
      ),
    queryKey: [
      'requirement-sdd-artifact',
      sessionKey,
      requirement.id,
      baseline?.artifactId,
      artifactVersion,
    ],
    retry: false,
  });
  const artifactAuthorizationFailure = isRequirementAuthorizationFailure(
    artifactQuery.error,
  );
  const saveMutation = useMutation({
    gcTime: 0,
    mutationFn: async (submission: SddWorkflowSubmission) => {
      let createdArtifact = submission.createdArtifact;
      if (!createdArtifact) {
        const created = await createSddArtifact(
          requirement.id,
          submission.input.artifactId === null
            ? { content: submission.input.content }
            : {
                artifactId: submission.input.artifactId,
                content: submission.input.content,
              },
          requirement.revision,
          submission.artifactIdempotencyKey,
        );
        const recorded = recordSddArtifactCreated(submission, {
          artifactId: created.artifact.artifactId,
          artifactVersion: created.artifact.version,
          requirementRevision: created.requirement.revision,
        });
        submissionRef.current = recorded;
        createdArtifact = recorded.createdArtifact;
      }
      return registerSddBaseline(
        requirement.id,
        {
          artifactId: createdArtifact.artifactId,
          artifactVersion: createdArtifact.artifactVersion,
        },
        Math.max(createdArtifact.requirementRevision, requirement.revision),
        submission.baselineIdempotencyKey,
      );
    },
  });
  const resetSaveMutation = saveMutation.reset;

  useEffect(() => {
    if (!artifactAuthorizationFailure) {
      return;
    }
    submissionRef.current = undefined;
    setEditorOpen(false);
    form.resetFields();
    resetSaveMutation();
  }, [artifactAuthorizationFailure, form, resetSaveMutation]);
  const baselineItems: DescriptionsProps['items'] = baseline
    ? [
        { children: baseline.id, key: 'id', label: 'Baseline ID' },
        {
          children: baseline.requirementVersion,
          key: 'requirementVersion',
          label: 'Requirement Version',
        },
        {
          children: baseline.artifactId,
          key: 'artifactId',
          label: 'Artifact ID',
        },
        {
          children: baseline.artifactVersion,
          key: 'artifactVersion',
          label: 'Artifact Version',
        },
        {
          children: (
            <code className={styles.code}>{baseline.artifactHash}</code>
          ),
          key: 'artifactHash',
          label: 'Artifact SHA-256',
        },
        {
          children: baseline.routeSnapshotVersion,
          key: 'routeSnapshotVersion',
          label: 'Route Version',
        },
      ]
    : [];

  const openEditor = () => {
    form.setFieldsValue({ content: artifactQuery.data?.content ?? '' });
    saveMutation.reset();
    setEditorOpen(true);
  };

  const closeEditor = () => {
    setEditorOpen(false);
    saveMutation.reset();
    form.resetFields();
  };

  const submit = async (values: SddFormValues) => {
    const submission = prepareSddWorkflowSubmission(
      { artifactId: baseline?.artifactId ?? null, content: values.content },
      submissionRef.current,
    );
    submissionRef.current = submission;
    try {
      await saveMutation.mutateAsync(submission);
      submissionRef.current = undefined;
      closeEditor();
      await onChanged();
    } catch {
      // 两阶段提交状态保留在 submissionRef，允许只重放未知阶段。
    }
  };

  return (
    <section aria-labelledby="sdd-baseline-title" className={styles.panel}>
      <div className={styles.panelHeader}>
        <Typography.Title
          className={styles.panelTitle}
          id="sdd-baseline-title"
          level={3}
        >
          SDD Baseline
        </Typography.Title>
        {canSubmit ? (
          <Button
            disabled={
              baseline !== null &&
              (!artifactQuery.isSuccess || artifactAuthorizationFailure)
            }
            loading={baseline !== null && artifactQuery.isLoading}
            onClick={openEditor}
            type="primary"
          >
            {baseline ? '编辑 SDD' : '创建 SDD'}
          </Button>
        ) : null}
      </div>

      {baseline ? (
        <Descriptions bordered column={2} items={baselineItems} size="small" />
      ) : (
        <Empty
          description="尚未登记 SDD Baseline"
          image={Empty.PRESENTED_IMAGE_SIMPLE}
        />
      )}
      {baseline && artifactVersion === null ? (
        <Alert
          showIcon
          title="服务端返回的 Artifact Version 无效，无法读取正文"
          type="error"
        />
      ) : null}
      {artifactQuery.error ? (
        <Alert
          action={
            <Button onClick={() => void artifactQuery.refetch()}>
              重试读取 SDD
            </Button>
          }
          showIcon
          title={formatRequirementError(
            artifactQuery.error,
            '当前 SDD Artifact 读取失败',
          )}
          type="error"
        />
      ) : null}
      {artifactQuery.data && !artifactAuthorizationFailure ? (
        <section aria-label="当前 SDD Markdown">
          <pre className={styles.json}>{artifactQuery.data.content}</pre>
        </section>
      ) : null}

      <Modal
        destroyOnHidden
        footer={null}
        mask={{ closable: false }}
        onCancel={closeEditor}
        open={editorOpen && !artifactAuthorizationFailure}
        title={baseline ? '编辑 SDD' : '创建 SDD'}
        width={760}
      >
        <Form<SddFormValues>
          clearOnDestroy
          form={form}
          layout="vertical"
          onFinish={submit}
          onValuesChange={() => saveMutation.reset()}
        >
          <Form.Item<SddFormValues>
            label="SDD Markdown"
            name="content"
            rules={[
              {
                message: '请输入 SDD Markdown',
                required: true,
                whitespace: true,
              },
            ]}
          >
            <Input.TextArea
              className={styles.editor}
              maxLength={200_000}
              rows={18}
              showCount
            />
          </Form.Item>
          <Alert
            description="这是两个可重放命令：先创建不可变 Artifact Version，再登记当前 Baseline。结果未知时不会猜测成功。"
            showIcon
            title="保存语义"
            type="info"
          />
          {saveMutation.error ? (
            <Alert
              action={<Button onClick={refreshState}>重新读取状态</Button>}
              showIcon
              title={formatRequirementError(
                saveMutation.error,
                'SDD 保存结果未知，请重新读取状态或保持内容不变后重试',
              )}
              type="error"
            />
          ) : null}
          <div className={styles.formFooter}>
            <Button disabled={saveMutation.isPending} onClick={closeEditor}>
              取消
            </Button>
            <Button
              htmlType="submit"
              loading={saveMutation.isPending}
              type="primary"
            >
              保存并设为当前基线
            </Button>
          </div>
        </Form>
      </Modal>
    </section>
  );
}
