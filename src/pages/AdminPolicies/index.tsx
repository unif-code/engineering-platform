import {
  type ActionType,
  PageContainer,
  type ProColumns,
  ProTable,
  type ProTableProps,
} from '@ant-design/pro-components';
import { useMutation } from '@umijs/max';
import { App, Button, Empty, Modal, Space, Typography } from 'antd';
import { useCallback, useMemo, useRef, useState } from 'react';
import { SemanticTag } from '@/components/SemanticTag';
import {
  createPolicyDraft,
  formatGovernanceError,
  listPolicyCatalog,
  listPolicyVersions,
  type PolicyCatalogResponse,
  type PolicyDraft,
  type PolicyPreview,
  type PolicyValidationResult,
  type PolicyValue,
  previewPolicyDraft,
  publishPolicyDraft,
  rollbackPolicyVersion,
  updatePolicyDraft,
  validatePolicyDraft,
} from '@/features/administration';
import { formatPolicyValue, POLICY_NAMESPACE } from './constant';
import { useStyles } from './index.style';
import { PolicyDraftEditor } from './PolicyDraftEditor';
import { PolicyPreviewPanel } from './PolicyPreviewPanel';
import { PolicyVersionHistory } from './PolicyVersionHistory';
import { PublishPolicyModal } from './PublishPolicyModal';
import type {
  DraftContent,
  PolicyCatalogRow,
  PolicyTableQueryParams,
  PolicyVersionRow,
  PublishPolicyFormValues,
} from './type';

const problemStatus = (error: unknown) => {
  if (typeof error !== 'object' || error === null || !('problem' in error)) {
    return undefined;
  }
  const { problem } = error;
  return typeof problem === 'object' &&
    problem !== null &&
    'status' in problem &&
    typeof problem.status === 'number'
    ? problem.status
    : undefined;
};

export default function AdminPoliciesPage() {
  const { message } = App.useApp();
  const { styles } = useStyles();
  const catalogActionRef = useRef<ActionType | undefined>(undefined);
  const versionsActionRef = useRef<ActionType | undefined>(undefined);
  const candidateGenerationRef = useRef(0);
  const [catalog, setCatalog] = useState<PolicyCatalogResponse>();
  const [draft, setDraft] = useState<PolicyDraft>();
  const [draftContent, setDraftContent] = useState<DraftContent>({});
  const [validation, setValidation] = useState<PolicyValidationResult>();
  const [preview, setPreview] = useState<PolicyPreview>();
  const [conflict, setConflict] = useState<string>();
  const [publishOpen, setPublishOpen] = useState(false);
  const [publishError, setPublishError] = useState<string>();
  const [rollbackVersion, setRollbackVersion] = useState<PolicyVersionRow>();

  const createMutation = useMutation({
    mutationFn: () =>
      createPolicyDraft(POLICY_NAMESPACE, { scope: 'PLATFORM' }),
  });
  const updateMutation = useMutation({
    mutationFn: ({
      content,
      draftId,
      etag,
    }: {
      content: Record<string, PolicyValue>;
      draftId: string;
      etag: string;
    }) => updatePolicyDraft(POLICY_NAMESPACE, draftId, { content }, etag),
  });
  const validateMutation = useMutation({
    mutationFn: (draftId: string) =>
      validatePolicyDraft(POLICY_NAMESPACE, draftId),
  });
  const previewMutation = useMutation({
    mutationFn: (draftId: string) =>
      previewPolicyDraft(POLICY_NAMESPACE, draftId),
  });
  const publishMutation = useMutation({
    mutationFn: ({
      draftId,
      values,
    }: {
      draftId: string;
      values: PublishPolicyFormValues;
    }) => publishPolicyDraft(POLICY_NAMESPACE, draftId, values),
  });
  const rollbackMutation = useMutation({
    mutationFn: (version: number) =>
      rollbackPolicyVersion(POLICY_NAMESPACE, { toVersion: version }),
  });

  const requestCatalog = useCallback<
    NonNullable<
      ProTableProps<PolicyCatalogRow, PolicyTableQueryParams>['request']
    >
  >(async () => {
    try {
      const response = await listPolicyCatalog();
      setCatalog(response);
      return {
        data: response.items,
        success: true,
        total: response.items.length,
      };
    } catch (error) {
      message.error(formatGovernanceError(error, 'Policy Catalog 加载失败'));
      return { data: [], success: true, total: 0 };
    }
  }, [message]);

  const requestVersions = useCallback<
    NonNullable<
      ProTableProps<PolicyVersionRow, PolicyTableQueryParams>['request']
    >
  >(async () => {
    try {
      const response = await listPolicyVersions(POLICY_NAMESPACE);
      return {
        data: response.items,
        success: true,
        total: response.items.length,
      };
    } catch (error) {
      message.error(formatGovernanceError(error, 'Policy 版本历史加载失败'));
      return { data: [], success: true, total: 0 };
    }
  }, [message]);

  const catalogColumns = useMemo<ProColumns<PolicyCatalogRow>[]>(
    () => [
      {
        dataIndex: 'label',
        render: (_, row) => (
          <span>
            <strong>{row.label}</strong>
            <br />
            <span className={styles.code}>{row.key}</span>
          </span>
        ),
        title: 'Policy Key',
        width: 230,
      },
      {
        dataIndex: 'activeValue',
        render: (_, row) => formatPolicyValue(row.activeValue, row.unit),
        title: '当前生效值',
        width: 140,
      },
      {
        dataIndex: 'activeVersion',
        render: (_, row) => `版本 ${row.activeVersion}`,
        title: '版本',
        width: 100,
      },
      {
        dataIndex: 'valueType',
        render: (_, row) => (
          <SemanticTag
            label={row.valueType === 'INTEGER' ? '数字' : '枚举'}
            tone={row.valueType === 'INTEGER' ? 'info' : 'purple'}
          />
        ),
        title: '类型',
        width: 90,
      },
      { dataIndex: 'effectSemantics', title: '生效语义' },
    ],
    [styles.code],
  );
  const draftDirty = useMemo(
    () =>
      draft !== undefined &&
      Object.entries(draftContent).some(
        ([key, value]) => draft.content[key] !== value,
      ),
    [draft, draftContent],
  );
  const draftComplete = useMemo(
    () =>
      draft !== undefined &&
      (catalog?.items.every(
        ({ key }) =>
          draftContent[key] !== undefined && draftContent[key] !== null,
      ) ??
        false),
    [catalog, draft, draftContent],
  );

  const resetDerivedState = useCallback(() => {
    setConflict(undefined);
    setValidation(undefined);
    setPreview(undefined);
  }, []);
  const invalidateCandidate = useCallback(() => {
    candidateGenerationRef.current += 1;
    resetDerivedState();
  }, [resetDerivedState]);

  const beginDraft = async () => {
    try {
      const created = await createMutation.mutateAsync();
      setDraft(created);
      setDraftContent({ ...created.content });
      invalidateCandidate();
      message.success('Draft 已创建');
    } catch (error) {
      message.error(formatGovernanceError(error, 'Draft 创建失败'));
    }
  };

  const changeDraftValue = (key: string, value: PolicyValue | null) => {
    setDraftContent((current) => ({ ...current, [key]: value }));
    invalidateCandidate();
  };

  const saveDraft = async () => {
    if (!draft || !draftComplete) {
      return;
    }
    const content = Object.fromEntries(
      Object.entries(draftContent).filter(
        (entry): entry is [string, PolicyValue] => entry[1] !== null,
      ),
    );
    try {
      const updated = await updateMutation.mutateAsync({
        content,
        draftId: draft.id,
        etag: draft.etag,
      });
      setDraft(updated);
      setDraftContent({ ...updated.content });
      resetDerivedState();
      message.success('Draft 已保存');
    } catch (error) {
      if (problemStatus(error) === 409) {
        setConflict('已被并发修改，刷新后重试');
        return;
      }
      message.error(formatGovernanceError(error, 'Draft 保存失败'));
    }
  };

  const validateDraft = async () => {
    if (!draft) {
      return;
    }
    const candidateGeneration = candidateGenerationRef.current;
    try {
      const result = await validateMutation.mutateAsync(draft.id);
      if (candidateGenerationRef.current === candidateGeneration) {
        setValidation(result);
      }
    } catch (error) {
      message.error(formatGovernanceError(error, 'Policy Validate 失败'));
    }
  };

  const previewDraft = async () => {
    if (!draft) {
      return;
    }
    const candidateGeneration = candidateGenerationRef.current;
    try {
      const result = await previewMutation.mutateAsync(draft.id);
      if (candidateGenerationRef.current === candidateGeneration) {
        setPreview(result);
      }
    } catch (error) {
      message.error(formatGovernanceError(error, 'Policy Preview 失败'));
    }
  };

  const publishDraft = async (values: PublishPolicyFormValues) => {
    if (!draft) {
      return;
    }
    setPublishError(undefined);
    try {
      await publishMutation.mutateAsync({ draftId: draft.id, values });
      setPublishOpen(false);
      setDraft(undefined);
      setDraftContent({});
      invalidateCandidate();
      message.success('Policy 已发布');
      await Promise.all([
        catalogActionRef.current?.reload(),
        versionsActionRef.current?.reload(),
      ]);
    } catch (error) {
      setPublishError(formatGovernanceError(error, 'Policy 发布失败'));
    }
  };

  const createRollbackDraft = async () => {
    if (!rollbackVersion) {
      return;
    }
    try {
      const created = await rollbackMutation.mutateAsync(
        rollbackVersion.version,
      );
      setDraft(created);
      setDraftContent({ ...created.content });
      invalidateCandidate();
      setRollbackVersion(undefined);
      message.success('已创建回滚 Draft');
    } catch (error) {
      message.error(formatGovernanceError(error, '回滚 Draft 创建失败'));
    }
  };

  return (
    <PageContainer
      ghost
      subTitle="以 Draft、Preview 与 TOTP 审批发布 Platform Policy"
      title="Policy 发布"
    >
      <div className={styles.page}>
        <div className={styles.workspace}>
          <section aria-label="Policy Catalog">
            <ProTable<PolicyCatalogRow, PolicyTableQueryParams>
              actionRef={catalogActionRef}
              columns={catalogColumns}
              headerTitle="Policy Catalog"
              options={false}
              pagination={false}
              request={requestCatalog}
              rowKey="key"
              scroll={{ x: 900 }}
              search={false}
              toolBarRender={() => [
                <Button
                  disabled={draft !== undefined}
                  key="new-draft"
                  loading={createMutation.isPending}
                  onClick={beginDraft}
                  type="primary"
                >
                  新建 Draft
                </Button>,
              ]}
            />
          </section>

          {draft && catalog ? (
            <PolicyDraftEditor
              catalog={catalog.items}
              conflict={conflict}
              content={draftContent}
              dirty={draftDirty}
              draft={draft}
              onChange={changeDraftValue}
              onPreview={previewDraft}
              onPublish={() => {
                setPublishError(undefined);
                setPublishOpen(true);
              }}
              onSave={saveDraft}
              onValidate={validateDraft}
              previewing={previewMutation.isPending}
              saveDisabled={!draftDirty || !draftComplete}
              saving={updateMutation.isPending}
              validating={validateMutation.isPending}
              validation={validation}
            />
          ) : (
            <div className={styles.editor}>
              <Empty description="从 Catalog 新建 Draft 后开始编辑" />
            </div>
          )}
        </div>

        {preview ? <PolicyPreviewPanel preview={preview} /> : null}

        <PolicyVersionHistory
          actionRef={versionsActionRef}
          onRollback={setRollbackVersion}
          request={requestVersions}
          rollbackDisabled={draftDirty}
        />

        {publishOpen && draft ? (
          <PublishPolicyModal
            error={publishError}
            loading={publishMutation.isPending}
            onClose={() => setPublishOpen(false)}
            onSubmit={publishDraft}
            open
          />
        ) : null}

        {rollbackVersion ? (
          <Modal
            destroyOnHidden
            footer={
              <Space>
                <Button
                  disabled={rollbackMutation.isPending}
                  onClick={() => setRollbackVersion(undefined)}
                >
                  取消
                </Button>
                <Button
                  loading={rollbackMutation.isPending}
                  onClick={createRollbackDraft}
                  type="primary"
                >
                  确认创建
                </Button>
              </Space>
            }
            mask={{ closable: false }}
            onCancel={() => setRollbackVersion(undefined)}
            open
            title="创建回滚 Draft"
          >
            <Typography.Paragraph>
              将从版本 {rollbackVersion.version} 的不可变 Snapshot 创建新
              Draft； 当前生效版本不会立即改变。
            </Typography.Paragraph>
            {draft ? (
              <Typography.Paragraph type="warning">
                当前编辑区的已保存 Draft 将被新的回滚 Draft 替换，请确认后继续。
              </Typography.Paragraph>
            ) : null}
          </Modal>
        ) : null}
      </div>
    </PageContainer>
  );
}
