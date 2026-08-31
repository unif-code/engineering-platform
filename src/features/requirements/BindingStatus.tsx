import type { DescriptionsProps } from 'antd';
import { Alert, Button, Descriptions, Typography } from 'antd';
import { useState } from 'react';
import { SemanticTag } from '@/components/SemanticTag';
import type { SemanticTone } from '@/types/presentation';
import { resolveRepositoryBinding } from './binding';
import { useDetailStyles } from './detail.style';
import type { WorkItem } from './type';

export interface BindingStatusProps {
  requestId?: string;
  workItem: WorkItem;
}

const BINDING_TONE: Record<
  ReturnType<typeof resolveRepositoryBinding>['kind'],
  SemanticTone
> = {
  BLOCKED: 'danger',
  PENDING: 'info',
  READY: 'success',
  RECONCILIATION: 'warning',
};

export function BindingStatus({ requestId, workItem }: BindingStatusProps) {
  const { styles } = useDetailStyles();
  const binding = resolveRepositoryBinding(workItem);
  const [copyFeedback, setCopyFeedback] = useState<string>();
  const commonItems: DescriptionsProps['items'] = [
    { children: workItem.id, key: 'id', label: 'WorkItem ID' },
    { children: workItem.state, key: 'state', label: 'WorkItem 状态' },
    {
      children: workItem.assignmentState,
      key: 'assignmentState',
      label: '分配状态',
    },
    {
      children: workItem.executorType,
      key: 'executorType',
      label: '执行者类型',
    },
    {
      children: workItem.humanOwnerId ?? '—',
      key: 'humanOwnerId',
      label: '负责人',
    },
    {
      children: workItem.repositoryId,
      key: 'repositoryId',
      label: 'Repository ID',
    },
    {
      children: workItem.repositoryState,
      key: 'repositoryState',
      label: 'Repository 状态',
    },
    {
      children: workItem.revision,
      key: 'revision',
      label: 'WorkItem Revision',
    },
  ];

  const copy = async (value: string, label: string) => {
    if (!navigator.clipboard?.writeText) {
      setCopyFeedback(`当前浏览器不支持复制${label}`);
      return;
    }
    try {
      await navigator.clipboard.writeText(value);
      setCopyFeedback(`${label} 已复制`);
    } catch {
      setCopyFeedback(`${label} 复制失败`);
    }
  };

  return (
    <section
      aria-label={`WorkItem ${workItem.id} 仓库绑定`}
      className={styles.binding}
    >
      <div className={styles.bindingHeading}>
        <Typography.Title className={styles.bindingTitle} level={4}>
          WorkItem 仓库绑定
        </Typography.Title>
        <SemanticTag label={binding.label} tone={BINDING_TONE[binding.kind]} />
      </div>
      <Descriptions bordered column={2} items={commonItems} size="small" />

      {binding.kind === 'PENDING' ? (
        <Alert
          description="系统正在校验负责人、授权仓库与 main 当前 commit。"
          showIcon
          title={binding.label}
          type="info"
        />
      ) : null}
      {binding.kind === 'RECONCILIATION' ? (
        <Alert
          description="分支创建调用结果未知，系统不会猜测分支创建成功，将通过回读继续对账。"
          showIcon
          title={binding.label}
          type="warning"
        />
      ) : null}
      {binding.kind === 'BLOCKED' ? (
        <Alert
          description={requestId ? `requestId: ${requestId}` : undefined}
          showIcon
          title={binding.label}
          type="error"
        />
      ) : null}
      {binding.kind === 'READY' ? (
        <Descriptions
          bordered
          column={1}
          items={[
            {
              children: (
                <div className={styles.copyRow}>
                  <code className={styles.code}>{binding.taskBranch}</code>
                  <Button
                    onClick={() => void copy(binding.taskBranch, '任务分支')}
                    size="small"
                  >
                    复制任务分支
                  </Button>
                </div>
              ),
              key: 'taskBranch',
              label: 'Task branch',
            },
            {
              children: (
                <div className={styles.copyRow}>
                  <code className={styles.code}>{binding.baseCommitSha}</code>
                  <Button
                    onClick={() =>
                      void copy(binding.baseCommitSha, 'base commit')
                    }
                    size="small"
                  >
                    复制 base commit
                  </Button>
                </div>
              ),
              key: 'baseCommitSha',
              label: 'Base commit',
            },
          ]}
          size="small"
        />
      ) : null}
      <output aria-live="polite" className={styles.copyFeedback}>
        {copyFeedback}
      </output>
    </section>
  );
}
