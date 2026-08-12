import { PageContainer } from '@ant-design/pro-components';
import { useMutation, useQuery } from '@umijs/max';
import {
  Alert,
  App,
  Button,
  Empty,
  Modal,
  Segmented,
  Space,
  Spin,
  Typography,
} from 'antd';
import { useCallback, useMemo, useRef, useState } from 'react';
import {
  createPolicyDraft,
  formatGovernanceError,
  listPolicyCatalog,
  listPolicyVersions,
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
import {
  formatPolicyValue,
  POLICY_GROUPS,
  POLICY_NAMESPACE,
  type PolicyGroupKey,
  policyGroupForKey,
} from './constant';
import { useStyles } from './index.style';
import { PolicyDraftEditor } from './PolicyDraftEditor';
import { PolicyPreviewPanel } from './PolicyPreviewPanel';
import { PolicyVersionHistory } from './PolicyVersionHistory';
import { PublishPolicyModal } from './PublishPolicyModal';
import type {
  DraftContent,
  PolicyVersionRow,
  PublishPolicyFormValues,
} from './type';

const POLICY_DESCRIPTION =
  '改动先落草稿，经校验与预览后整批发布；每次发布都记录原因与操作人，可按版本回滚';

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
  const candidateGenerationRef = useRef(0);
  const [activeGroup, setActiveGroup] = useState<PolicyGroupKey>('session');
  const [draft, setDraft] = useState<PolicyDraft>();
  const [draftContent, setDraftContent] = useState<DraftContent>({});
  const [validation, setValidation] = useState<PolicyValidationResult>();
  const [preview, setPreview] = useState<PolicyPreview>();
  const [conflict, setConflict] = useState<string>();
  const [publishOpen, setPublishOpen] = useState(false);
  const [publishError, setPublishError] = useState<string>();
  const [rollbackVersion, setRollbackVersion] = useState<PolicyVersionRow>();

  const catalogQuery = useQuery({
    queryFn: listPolicyCatalog,
    queryKey: ['admin-policies', 'catalog'],
    retry: false,
  });
  const versionsQuery = useQuery({
    queryFn: () => listPolicyVersions(POLICY_NAMESPACE),
    queryKey: ['admin-policies', POLICY_NAMESPACE, 'versions'],
    retry: false,
  });

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

  const catalog = catalogQuery.data;
  const visibleCatalog = useMemo(
    () =>
      catalog?.items.filter(
        ({ key }) => policyGroupForKey(key) === activeGroup,
      ) ?? [],
    [activeGroup, catalog],
  );
  const activeGroupLabel =
    POLICY_GROUPS.find(({ value }) => value === activeGroup)?.label ?? '';
  const effectiveContent = useMemo<DraftContent>(
    () => ({
      ...Object.fromEntries(
        catalog?.items.map(({ activeValue, key }) => [key, activeValue]) ?? [],
      ),
      ...draftContent,
    }),
    [catalog, draftContent],
  );
  const candidateContent = useMemo<
    Record<string, PolicyValue> | undefined
  >(() => {
    if (
      catalog === undefined ||
      !catalog.items.every(
        ({ key }) =>
          effectiveContent[key] !== undefined && effectiveContent[key] !== null,
      )
    ) {
      return undefined;
    }
    return Object.fromEntries(
      catalog.items.map(({ key }) => [
        key,
        effectiveContent[key] as PolicyValue,
      ]),
    );
  }, [catalog, effectiveContent]);
  const pendingChanges = useMemo(
    () =>
      catalog?.items.filter(
        ({ activeValue, key }) => effectiveContent[key] !== activeValue,
      ) ?? [],
    [catalog, effectiveContent],
  );
  const draftDirty = useMemo(
    () =>
      draft !== undefined &&
      catalog?.items.some(
        ({ key }) => draft.content[key] !== effectiveContent[key],
      ) === true,
    [catalog, draft, effectiveContent],
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

  const changeDraftValue = (key: string, value: PolicyValue | null) => {
    setDraftContent((current) => ({ ...current, [key]: value }));
    invalidateCandidate();
  };

  const undoLocalDraftChanges = () => {
    setDraftContent(draft ? { ...draft.content } : {});
    invalidateCandidate();
  };

  const ensureSavedDraft = async (content: Record<string, PolicyValue>) => {
    try {
      let savedDraft = draft ?? (await createMutation.mutateAsync());
      const mustUpdate = Object.entries(content).some(
        ([key, value]) => savedDraft.content[key] !== value,
      );
      if (mustUpdate) {
        savedDraft = await updateMutation.mutateAsync({
          content,
          draftId: savedDraft.id,
          etag: savedDraft.etag,
        });
      }
      setDraft(savedDraft);
      return savedDraft;
    } catch (error) {
      if (problemStatus(error) === 409) {
        setConflict('已被并发修改，刷新后重试');
        return undefined;
      }
      message.error(formatGovernanceError(error, 'Draft 自动保存失败'));
      return undefined;
    }
  };

  const validateDraft = async () => {
    if (candidateContent === undefined || pendingChanges.length === 0) {
      return;
    }
    const candidateGeneration = candidateGenerationRef.current;
    const savedDraft = await ensureSavedDraft(candidateContent);
    if (savedDraft === undefined) {
      return;
    }
    try {
      const result = await validateMutation.mutateAsync(savedDraft.id);
      if (candidateGenerationRef.current === candidateGeneration) {
        setValidation(result);
      }
    } catch (error) {
      message.error(formatGovernanceError(error, 'Policy 校验失败'));
    }
  };

  const previewDraft = async () => {
    if (candidateContent === undefined || pendingChanges.length === 0) {
      return;
    }
    const candidateGeneration = candidateGenerationRef.current;
    const savedDraft = await ensureSavedDraft(candidateContent);
    if (savedDraft === undefined) {
      return;
    }
    try {
      const result = await previewMutation.mutateAsync(savedDraft.id);
      if (candidateGenerationRef.current === candidateGeneration) {
        setPreview(result);
      }
    } catch (error) {
      message.error(formatGovernanceError(error, 'Policy 预览失败'));
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
      await Promise.all([catalogQuery.refetch(), versionsQuery.refetch()]);
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
  const candidateSaving = createMutation.isPending || updateMutation.isPending;
  const hasCandidate = pendingChanges.length > 0;
  const hasLocalDraftChanges = draft ? draftDirty : hasCandidate;

  return (
    <PageContainer ghost pageHeaderRender={false}>
      <div className={styles.page}>
        <Typography.Text type="secondary">{POLICY_DESCRIPTION}</Typography.Text>

        <Segmented<PolicyGroupKey>
          aria-label="Policy 分类"
          className={styles.groupSelector}
          name="policy-group"
          onChange={setActiveGroup}
          options={POLICY_GROUPS.map((group) => ({ ...group }))}
          size="small"
          value={activeGroup}
        />

        <section
          aria-label={draft || hasCandidate ? 'Draft 编辑' : 'Policy 设置'}
          className={styles.workspace}
        >
          <div className={styles.settingsPanel}>
            <div className={styles.sectionHeader}>
              <div>
                <Typography.Title className={styles.sectionTitle} level={4}>
                  {activeGroupLabel}
                </Typography.Title>
                <Typography.Text type="secondary">
                  修改任意设置即进入待发布草稿
                </Typography.Text>
              </div>
            </div>

            {catalogQuery.isPending ? (
              <Spin aria-label="正在加载 Policy 设置" />
            ) : null}
            {catalogQuery.isError ? (
              <Alert
                showIcon
                title={formatGovernanceError(
                  catalogQuery.error,
                  'Policy 设置加载失败',
                )}
                type="error"
              />
            ) : null}
            {!catalogQuery.isPending && visibleCatalog.length === 0 ? (
              <Empty description="该分类暂无已冻结策略" />
            ) : null}
            {visibleCatalog.length > 0 ? (
              <PolicyDraftEditor
                catalog={visibleCatalog}
                content={effectiveContent}
                onChange={changeDraftValue}
              />
            ) : null}
          </div>

          <section aria-label="待发布草稿" className={styles.draftSummary}>
            <div className={styles.summaryHeader}>
              <Typography.Title className={styles.sectionTitle} level={4}>
                待发布草稿
              </Typography.Title>
              <Typography.Text type="secondary">
                {pendingChanges.length} 项改动
              </Typography.Text>
              <Button
                disabled={!hasLocalDraftChanges}
                onClick={undoLocalDraftChanges}
                size="small"
                title={
                  draft ? '恢复服务端已保存候选' : '恢复当前生效的 Policy 值'
                }
                type="link"
              >
                撤销本地编辑
              </Button>
            </div>

            {pendingChanges.length === 0 ? (
              <Typography.Text className={styles.emptyHint} type="secondary">
                当前没有改动，修改左侧任意取值即进入草稿
              </Typography.Text>
            ) : (
              <div className={styles.changeList}>
                {pendingChanges.map((item) => (
                  <div className={styles.changeItem} key={item.key}>
                    <Typography.Text strong>{item.label}</Typography.Text>
                    <Typography.Text type="secondary">
                      {formatPolicyValue(item.activeValue, item.unit)} →{' '}
                      <Typography.Text className={styles.changedValue}>
                        {effectiveContent[item.key] === null
                          ? '未填写'
                          : formatPolicyValue(
                              effectiveContent[item.key] ?? item.activeValue,
                              item.unit,
                            )}
                      </Typography.Text>
                    </Typography.Text>
                  </div>
                ))}
              </div>
            )}

            {conflict ? <Alert showIcon title={conflict} type="error" /> : null}
            {validation ? (
              validation.valid ? (
                <Alert showIcon title="校验通过" type="success" />
              ) : (
                <Alert
                  description={
                    <ul aria-label="校验问题">
                      {validation.issues.map((issue) => (
                        <li key={`${issue.key}-${issue.code}`}>
                          {issue.message}
                        </li>
                      ))}
                    </ul>
                  }
                  showIcon
                  title="校验未通过"
                  type="warning"
                />
              )
            ) : (
              <Typography.Text type="secondary">
                {candidateContent === undefined && hasCandidate
                  ? '请补全设置后再校验'
                  : '尚未校验'}
              </Typography.Text>
            )}

            <div className={styles.summaryActions}>
              <Button
                disabled={!hasCandidate || candidateContent === undefined}
                loading={candidateSaving || validateMutation.isPending}
                onClick={validateDraft}
                size="small"
              >
                校验
              </Button>
              <Button
                disabled={!hasCandidate || candidateContent === undefined}
                loading={candidateSaving || previewMutation.isPending}
                onClick={previewDraft}
                size="small"
              >
                预览
              </Button>
              <Button
                className={styles.publishButton}
                disabled={!draft || draftDirty || validation?.valid !== true}
                onClick={() => {
                  setPublishError(undefined);
                  setPublishOpen(true);
                }}
                type="primary"
              >
                发布
              </Button>
            </div>
          </section>
        </section>

        {preview ? (
          <Modal
            destroyOnHidden
            footer={null}
            onCancel={() => setPreview(undefined)}
            open
            title="Policy Preview"
            width={880}
          >
            <PolicyPreviewPanel preview={preview} />
          </Modal>
        ) : null}

        {versionsQuery.isError ? (
          <Alert
            showIcon
            title={formatGovernanceError(
              versionsQuery.error,
              'Policy 版本历史加载失败',
            )}
            type="error"
          />
        ) : null}
        <PolicyVersionHistory
          items={versionsQuery.data?.items ?? []}
          loading={versionsQuery.isPending}
          onRollback={setRollbackVersion}
          rollbackDisabled={
            draftDirty || (draft === undefined && pendingChanges.length > 0)
          }
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
              Draft；当前生效版本不会立即改变。
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
