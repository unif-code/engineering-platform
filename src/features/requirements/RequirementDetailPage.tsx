import { PageContainer } from '@ant-design/pro-components';
import { useModel, useParams, useQuery } from '@umijs/max';
import type { DescriptionsProps } from 'antd';
import { Alert, Button, Descriptions, Skeleton, Typography } from 'antd';
import { useEffect, useRef, useState } from 'react';
import { SemanticTag } from '@/components/SemanticTag';
import { hasWorkspaceCapability } from '@/features/auth';
import { BaselineGatePanel } from './BaselineGatePanel';
import {
  REQUIREMENT_AUTO_POLL_WINDOW_MS,
  REQUIREMENT_POLL_INTERVAL_MS,
  shouldPollRequirementBindings,
  validateRequirementBindings,
} from './binding';
import { REQUIREMENT_STATE_META, REQUIREMENT_TYPE_META } from './constant';
import { useDetailStyles } from './detail.style';
import {
  formatRequirementError,
  isRequirementAuthorizationFailure,
} from './error';
import { RouteSnapshotPanel } from './RouteSnapshotPanel';
import { SddBaselinePanel } from './SddBaselinePanel';
import { getRequirement } from './service';
import { WorkItemPlanningPanel } from './WorkItemPlanningPanel';

const formatUpdatedAt = (value: string) =>
  new Intl.DateTimeFormat('zh-CN', {
    dateStyle: 'medium',
    hour12: false,
    timeStyle: 'short',
    timeZone: 'Asia/Shanghai',
  }).format(new Date(value));

export function RequirementDetailPage() {
  const { styles } = useDetailStyles();
  const { initialState } = useModel('@@initialState');
  const { requirementId } = useParams<'requirementId'>();
  const sessionKey =
    initialState?.principal?.accountId ?? initialState?.principal?.employeeId;
  const principalAccountId = initialState?.principal?.accountId ?? null;
  const pollingStartedAtRef = useRef<number | undefined>(undefined);
  const [automaticPollingStopped, setAutomaticPollingStopped] = useState(false);
  const requirementQuery = useQuery({
    enabled: Boolean(requirementId && sessionKey),
    gcTime: 0,
    queryFn: async ({ signal }) =>
      validateRequirementBindings(
        await getRequirement(requirementId as string, signal),
      ),
    queryKey: ['requirement-details', sessionKey, requirementId],
    retry: false,
  });
  const pollingRequired = Boolean(
    requirementQuery.data &&
      shouldPollRequirementBindings(requirementQuery.data),
  );

  useEffect(() => {
    if (!pollingRequired) {
      pollingStartedAtRef.current = undefined;
      setAutomaticPollingStopped(false);
      return;
    }
    if (
      automaticPollingStopped ||
      requirementQuery.isFetching ||
      requirementQuery.dataUpdatedAt === 0
    ) {
      return;
    }
    pollingStartedAtRef.current ??= Date.now();
    const remaining =
      REQUIREMENT_AUTO_POLL_WINDOW_MS -
      (Date.now() - pollingStartedAtRef.current);
    if (remaining <= 0) {
      setAutomaticPollingStopped(true);
      return;
    }
    const delay = Math.min(REQUIREMENT_POLL_INTERVAL_MS, remaining);
    const timeout = window.setTimeout(() => {
      if (delay === remaining) {
        setAutomaticPollingStopped(true);
        return;
      }
      void requirementQuery.refetch();
    }, delay);
    return () => window.clearTimeout(timeout);
  }, [
    automaticPollingStopped,
    pollingRequired,
    requirementQuery.dataUpdatedAt,
    requirementQuery.isFetching,
    requirementQuery.refetch,
  ]);

  const authorizationFailure = isRequirementAuthorizationFailure(
    requirementQuery.error,
  );

  if (!requirementId) {
    return (
      <PageContainer ghost pageHeaderRender={false}>
        <Alert showIcon title="缺少 Requirement ID" type="error" />
      </PageContainer>
    );
  }

  if (!sessionKey) {
    return (
      <PageContainer ghost pageHeaderRender={false}>
        <Alert showIcon title="Session 未就绪，无法读取需求详情" type="error" />
      </PageContainer>
    );
  }

  if (requirementQuery.isPending) {
    return (
      <PageContainer ghost pageHeaderRender={false}>
        <section
          aria-label="正在加载需求详情"
          className={styles.loading}
          role="status"
        >
          <Skeleton active paragraph={{ rows: 6 }} />
        </section>
      </PageContainer>
    );
  }

  if (!requirementQuery.data || authorizationFailure) {
    return (
      <PageContainer ghost pageHeaderRender={false}>
        <Alert
          action={
            <Button onClick={() => void requirementQuery.refetch()}>
              重试加载需求详情
            </Button>
          }
          showIcon
          title={formatRequirementError(
            requirementQuery.error,
            '需求详情加载失败',
          )}
          type="error"
        />
      </PageContainer>
    );
  }

  const { requirement, workItems } = requirementQuery.data;
  const workflowScopeKey = `${sessionKey}:${requirement.id}`;
  const scopedCapabilities = initialState?.scopedCapabilities ?? [];
  const hasCapability = (capability: string) =>
    hasWorkspaceCapability(
      scopedCapabilities,
      capability,
      requirement.workspaceId,
    );
  const refreshDetails = requirementQuery.refetch;
  const requirementItems: DescriptionsProps['items'] = [
    { children: requirement.id, key: 'id', label: 'Requirement ID' },
    {
      children: <SemanticTag {...REQUIREMENT_TYPE_META[requirement.type]} />,
      key: 'type',
      label: '类型',
    },
    {
      children: <SemanticTag {...REQUIREMENT_STATE_META[requirement.state]} />,
      key: 'state',
      label: '状态',
    },
    {
      children: requirement.recordState,
      key: 'recordState',
      label: '记录状态',
    },
    {
      children: requirement.workspaceId,
      key: 'workspaceId',
      label: 'Workspace ID',
    },
    {
      children: requirement.initialRepositoryId,
      key: 'initialRepositoryId',
      label: '初始 Repository ID',
    },
    {
      children: requirement.createdBy,
      key: 'createdBy',
      label: '创建人',
    },
    {
      children: requirement.revision,
      key: 'revision',
      label: 'Revision',
    },
    {
      children: (
        <time dateTime={requirement.updatedAt}>
          {formatUpdatedAt(requirement.updatedAt)}
        </time>
      ),
      key: 'updatedAt',
      label: '更新时间',
    },
  ];

  return (
    <PageContainer ghost pageHeaderRender={false}>
      <div className={styles.page}>
        <header className={styles.pageHeader}>
          <div className={styles.heading}>
            <Typography.Title className={styles.pageTitle} level={2}>
              {requirement.title}
            </Typography.Title>
            <span className={styles.requirementId}>{requirement.id}</span>
          </div>
          <Button
            loading={requirementQuery.isFetching}
            onClick={() => void requirementQuery.refetch()}
          >
            刷新状态
          </Button>
        </header>

        {requirementQuery.error ? (
          <Alert
            action={
              <Button onClick={() => void requirementQuery.refetch()}>
                重试加载需求详情
              </Button>
            }
            showIcon
            title={formatRequirementError(
              requirementQuery.error,
              '需求详情刷新失败',
            )}
            type="error"
          />
        ) : null}

        {automaticPollingStopped && pollingRequired ? (
          <Alert
            action={
              <Button onClick={() => void requirementQuery.refetch()}>
                手动刷新
              </Button>
            }
            description="自动对账已达到 60 秒上限；系统不会猜测结果，请手动刷新查看最新状态。"
            showIcon
            title="自动刷新已暂停"
            type="warning"
          />
        ) : null}

        <Descriptions
          bordered
          column={{ lg: 3, md: 2, sm: 1, xs: 1 }}
          items={requirementItems}
          size="small"
          title="Requirement 事实"
        />

        <RouteSnapshotPanel requirement={requirement} />

        <section className={styles.section}>
          <Typography.Title className={styles.sectionTitle} level={4}>
            描述
          </Typography.Title>
          <p className={styles.description}>{requirement.description}</p>
        </section>

        <section className={styles.section}>
          <Typography.Title className={styles.sectionTitle} level={4}>
            验收条件
          </Typography.Title>
          <ol className={styles.criteria}>
            {requirement.acceptanceCriteria.map((criterion) => (
              <li key={criterion}>{criterion}</li>
            ))}
          </ol>
        </section>

        <WorkItemPlanningPanel
          canAssign={hasCapability('work_item.assign')}
          canCreate={hasCapability('work_item.create')}
          key={`work-items:${workflowScopeKey}`}
          onChanged={refreshDetails}
          requirement={requirement}
          requestId={requirementQuery.data.requestId ?? undefined}
          sessionKey={sessionKey}
          workItemAssignments={requirementQuery.data.workItemAssignments}
          workItems={workItems}
        />

        <SddBaselinePanel
          baseline={requirementQuery.data.currentSddBaseline}
          canSubmit={hasCapability('requirement.baseline.submit')}
          key={`sdd:${workflowScopeKey}`}
          onChanged={refreshDetails}
          requirement={requirement}
          sessionKey={sessionKey}
        />

        <BaselineGatePanel
          assignment={requirementQuery.data.currentGateAssignment}
          baseline={requirementQuery.data.currentSddBaseline}
          canAssign={hasCapability('requirement.baseline.assign')}
          canDecide={hasCapability('requirement.baseline.decide')}
          canSubmit={hasCapability('requirement.baseline.submit')}
          decision={requirementQuery.data.currentDecision}
          gate={requirementQuery.data.currentGate}
          key={`baseline-gate:${workflowScopeKey}`}
          onChanged={refreshDetails}
          principalAccountId={principalAccountId}
          requirement={requirement}
        />
      </div>
    </PageContainer>
  );
}
