import { PageContainer } from '@ant-design/pro-components';
import { useParams, useQuery } from '@umijs/max';
import type { DescriptionsProps } from 'antd';
import { Alert, Button, Descriptions, Empty, Skeleton, Typography } from 'antd';
import { useCallback, useMemo } from 'react';
import { SemanticTag } from '@/components/SemanticTag';
import { BindingStatus } from './BindingStatus';
import {
  REQUIREMENT_POLL_INTERVAL_MS,
  shouldPollRequirementBindings,
  validateRequirementBindings,
} from './binding';
import { REQUIREMENT_STATE_META, REQUIREMENT_TYPE_META } from './constant';
import { useDetailStyles } from './detail.style';
import { formatRequirementError } from './error';
import { getRequirement } from './service';
import type { RequirementDetails } from './type';

interface RequestContext {
  latest?: RequirementDetails;
  requirementId?: string;
  sequence: number;
}

const formatUpdatedAt = (value: string) =>
  new Intl.DateTimeFormat('zh-CN', {
    dateStyle: 'medium',
    hour12: false,
    timeStyle: 'short',
    timeZone: 'Asia/Shanghai',
  }).format(new Date(value));

export function RequirementDetailPage() {
  const { styles } = useDetailStyles();
  const { requirementId } = useParams<'requirementId'>();
  const requestContext = useMemo<RequestContext>(
    () => ({ requirementId, sequence: 0 }),
    [requirementId],
  );
  const loadRequirement = useCallback(async () => {
    if (!requirementId) {
      throw new Error('Requirement ID 缺失');
    }
    const sequence = ++requestContext.sequence;
    try {
      const details = validateRequirementBindings(
        await getRequirement(requirementId),
      );
      if (sequence !== requestContext.sequence && requestContext.latest) {
        return requestContext.latest;
      }
      if (sequence === requestContext.sequence) {
        requestContext.latest = details;
      }
      return details;
    } catch (error) {
      if (sequence !== requestContext.sequence && requestContext.latest) {
        return requestContext.latest;
      }
      throw error;
    }
  }, [requestContext, requirementId]);
  const requirementQuery = useQuery({
    enabled: Boolean(requirementId),
    queryFn: loadRequirement,
    queryKey: ['requirement-details', requirementId],
    refetchInterval: (query) => {
      const details = query.state.data;
      return details && shouldPollRequirementBindings(details)
        ? REQUIREMENT_POLL_INTERVAL_MS
        : false;
    },
    retry: false,
  });

  if (!requirementId) {
    return (
      <PageContainer ghost pageHeaderRender={false}>
        <Alert showIcon title="缺少 Requirement ID" type="error" />
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

  if (!requirementQuery.data) {
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

        <Descriptions
          bordered
          column={{ lg: 3, md: 2, sm: 1, xs: 1 }}
          items={requirementItems}
          size="small"
          title="Requirement 事实"
        />

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

        <section className={styles.workItems}>
          <Typography.Title className={styles.sectionTitle} level={3}>
            WorkItems
          </Typography.Title>
          {workItems.length === 0 ? (
            <Empty description="当前 Requirement 没有 WorkItem" />
          ) : (
            workItems.map((workItem) => (
              <BindingStatus key={workItem.id} workItem={workItem} />
            ))
          )}
        </section>
      </div>
    </PageContainer>
  );
}
