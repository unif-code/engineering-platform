import { PageContainer } from '@ant-design/pro-components';
import { useMutation, useQuery } from '@umijs/max';
import {
  Alert,
  App,
  Button,
  Empty,
  Modal,
  Segmented,
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
  POLICY_GROUP_LABELS,
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
import { getProblemStatus, mergePolicyDraftRevision } from './util';

const POLICY_DESCRIPTION =
  '改动先落草稿，经校验与预览后整批发布；每次发布都记录原因与操作人，可按版本回滚';

export default function AdminPoliciesPage() {
  const { message } = App.useApp();
  const { styles } = useStyles();
  const candidateGenerationRef = useRef(0);
  const draftRef = useRef<PolicyDraft | undefined>(undefined);
  const [activeGroup, setActiveGroup] = useState<PolicyGroupKey>('session');
  const [draft, setDraft] = useState<PolicyDraft>();
  const [draftContent, setDraftContent] = useState<DraftContent>({});
  const [validation, setValidation] = useState<PolicyValidationResult>();
  const [preview, setPreview] = useState<PolicyPreview>();
  const [conflict, setConflict] = useState<string>();
  const [publishOpen, setPublishOpen] = useState(false);
  const [publishError, setPublishError] = useState<string>();
  const [rollbackVersion, setRollbackVersion] = useState<PolicyVersionRow>();
  const [rollbackError, setRollbackError] = useState<string>();

  const replaceDraft = useCallback((nextDraft: PolicyDraft | undefined) => {
    draftRef.current = nextDraft;
    setDraft(nextDraft);
  }, []);

  const mergeDraftRevision = useCallback(
    (draftId: string, etag: string, revision: number) => {
      const current = draftRef.current;
      const next = mergePolicyDraftRevision(current, draftId, etag, revision);
      draftRef.current = next;
      setDraft(next);
    },
    [],
  );

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
    mutationFn: () => createPolicyDraft(POLICY_NAMESPACE, { values: {} }),
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
    mutationFn: ({ draftId, etag }: { draftId: string; etag: string }) =>
      validatePolicyDraft(POLICY_NAMESPACE, draftId, etag),
  });
  const previewMutation = useMutation({
    mutationFn: ({ draftId, etag }: { draftId: string; etag: string }) =>
      previewPolicyDraft(POLICY_NAMESPACE, draftId, etag),
  });
  const publishMutation = useMutation({
    mutationFn: ({
      draftId,
      etag,
      values,
    }: {
      draftId: string;
      etag: string;
      values: PublishPolicyFormValues;
    }) => publishPolicyDraft(POLICY_NAMESPACE, draftId, values, etag),
  });
  const rollbackMutation = useMutation({
    mutationFn: ({
      activeVersion,
      input,
    }: {
      activeVersion: number;
      input: PublishPolicyFormValues & { toVersion: number };
    }) => rollbackPolicyVersion(POLICY_NAMESPACE, input, activeVersion),
  });

  const catalog = catalogQuery.data;
  const visibleCatalog = useMemo(
    () =>
      catalog?.items.filter(
        ({ key }) => policyGroupForKey(key) === activeGroup,
      ) ?? [],
    [activeGroup, catalog],
  );
  const activeGroupLabel = POLICY_GROUP_LABELS[activeGroup];
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
      let savedDraft = draftRef.current ?? (await createMutation.mutateAsync());
      const mustUpdate = Object.entries(content).some(
        ([key, value]) => savedDraft.content[key] !== value,
      );
      savedDraft = mustUpdate
        ? await updateMutation.mutateAsync({
            content,
            draftId: savedDraft.id,
            etag: savedDraft.etag,
          })
        : savedDraft;
      replaceDraft(savedDraft);
      return savedDraft;
    } catch (error) {
      if (getProblemStatus(error) === 409) {
        setConflict('已被并发修改，刷新后重试');
        return undefined;
      }
      message.error(formatGovernanceError(error, 'Draft 自动保存失败'));
      return undefined;
    }
  };

  const validateDraft = async (content: Record<string, PolicyValue>) => {
    const candidateGeneration = candidateGenerationRef.current;
    const savedDraft = await ensureSavedDraft(content);
    if (savedDraft === undefined) {
      return;
    }
    try {
      const result = await validateMutation.mutateAsync({
        draftId: savedDraft.id,
        etag: savedDraft.etag,
      });
      mergeDraftRevision(savedDraft.id, result.etag, result.revision);
      if (candidateGenerationRef.current === candidateGeneration) {
        setValidation(result);
      }
    } catch (error) {
      message.error(formatGovernanceError(error, 'Policy 校验失败'));
    }
  };

  const previewDraft = async (content: Record<string, PolicyValue>) => {
    const candidateGeneration = candidateGenerationRef.current;
    const savedDraft = await ensureSavedDraft(content);
    if (savedDraft === undefined) {
      return;
    }
    try {
      const result = await previewMutation.mutateAsync({
        draftId: savedDraft.id,
        etag: savedDraft.etag,
      });
      if (candidateGenerationRef.current === candidateGeneration) {
        setPreview(result);
        mergeDraftRevision(savedDraft.id, result.etag, result.revision);
      }
    } catch (error) {
      message.error(formatGovernanceError(error, 'Policy 预览失败'));
    }
  };

  const publishDraft = async (
    currentDraft: PolicyDraft,
    values: PublishPolicyFormValues,
  ) => {
    setPublishError(undefined);
    try {
      await publishMutation.mutateAsync({
        draftId: currentDraft.id,
        etag: currentDraft.etag,
        values,
      });
      setPublishOpen(false);
      replaceDraft(undefined);
      setDraftContent({});
      invalidateCandidate();
      message.success('Policy 已发布');
      await Promise.all([catalogQuery.refetch(), versionsQuery.refetch()]);
    } catch (error) {
      setPublishError(formatGovernanceError(error, 'Policy 发布失败'));
    }
  };

  const createRollbackDraft = async (
    version: PolicyVersionRow,
    activeVersion: number,
    values: PublishPolicyFormValues,
  ) => {
    setRollbackError(undefined);
    try {
      const created = await rollbackMutation.mutateAsync({
        activeVersion,
        input: { ...values, toVersion: version.version },
      });
      replaceDraft(created);
      setDraftContent({ ...created.content });
      invalidateCandidate();
      setRollbackVersion(undefined);
      message.success('已创建回滚 Draft');
    } catch (error) {
      setRollbackError(formatGovernanceError(error, '回滚 Draft 创建失败'));
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
                action={
                  <Button
                    aria-label="重试加载 Policy Catalog"
                    onClick={() => void catalogQuery.refetch()}
                    size="small"
                  >
                    重试
                  </Button>
                }
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
                              effectiveContent[item.key] as PolicyValue,
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
                onClick={() =>
                  void validateDraft(
                    candidateContent as Record<string, PolicyValue>,
                  )
                }
                size="small"
              >
                校验
              </Button>
              <Button
                disabled={!hasCandidate || candidateContent === undefined}
                loading={candidateSaving || previewMutation.isPending}
                onClick={() =>
                  void previewDraft(
                    candidateContent as Record<string, PolicyValue>,
                  )
                }
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
            action={
              <Button
                aria-label="重试加载 Policy 历史"
                onClick={() => void versionsQuery.refetch()}
                size="small"
              >
                重试
              </Button>
            }
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
            draftDirty ||
            (draft === undefined && pendingChanges.length > 0) ||
            catalog === undefined
          }
        />

        {publishOpen && draft ? (
          <PublishPolicyModal
            error={publishError}
            loading={publishMutation.isPending}
            onClose={() => setPublishOpen(false)}
            onSubmit={(values) => publishDraft(draft, values)}
            open
          />
        ) : null}

        {rollbackVersion && catalog ? (
          <PublishPolicyModal
            error={rollbackError}
            loading={rollbackMutation.isPending}
            mode="rollback"
            onClose={() => {
              setRollbackError(undefined);
              setRollbackVersion(undefined);
            }}
            onSubmit={(values) =>
              createRollbackDraft(
                rollbackVersion,
                catalog.activeVersion,
                values,
              )
            }
            open
          />
        ) : null}
      </div>
    </PageContainer>
  );
}
