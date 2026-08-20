import { ArrowLeftOutlined, MoreOutlined } from '@ant-design/icons';
import { PageContainer } from '@ant-design/pro-components';
import { Link, useParams } from '@umijs/max';
import { Button, Drawer, Dropdown, type MenuProps, Space } from 'antd';
import { useRef, useState } from 'react';
import { DetailDrawer } from '@/components/DetailDrawer';
import { SemanticTag } from '@/components/SemanticTag';
import { useStaticPrototypeAction } from '@/hooks/useStaticPrototypeAction';
import { ConversationPane } from './ConversationPane';
import {
  ARTIFACT_RECORD,
  artifactColumns,
  TASK_DETAIL_FIXTURE,
} from './constant';
import { DiffContent } from './DiffContent';
import { InspectorPanel } from './InspectorPanel';
import { useStyles } from './index.style';
import { RejectApprovalModal } from './RejectApprovalModal';
import type { ArtifactRecord, InspectorTabKey } from './type';

const actionItems: MenuProps['items'] = [
  { key: 'assign', label: '分配任务' },
  { key: 'reject', label: '驳回审批' },
  { key: 'artifact', label: '查看 Artifact' },
  { key: 'diff', label: '查看完整 Diff' },
];

interface TaskDetailActionHandlers {
  showStaticAction: (action: string) => void;
  showReject: () => void;
  showArtifact: () => void;
  showDiff: () => void;
}

export function dispatchTaskDetailAction(
  key: string,
  handlers: TaskDetailActionHandlers,
): void {
  if (key === 'assign') {
    handlers.showStaticAction('分配任务');
    return;
  }
  if (key === 'reject') {
    handlers.showReject();
    return;
  }
  if (key === 'artifact') {
    handlers.showArtifact();
    return;
  }
  if (key === 'diff') {
    handlers.showDiff();
  }
}

export default function TaskDetailPage() {
  const { styles } = useStyles();
  const { taskId } = useParams<'taskId'>();
  const resolvedTaskId = taskId ?? TASK_DETAIL_FIXTURE.id;
  const showStaticAction = useStaticPrototypeAction();
  const [activeTab, setActiveTab] = useState<InspectorTabKey>('overview');
  const [selectedArtifact, setSelectedArtifact] = useState<ArtifactRecord>();
  const [diffOpen, setDiffOpen] = useState(false);
  const [rejectOpen, setRejectOpen] = useState(false);
  const moreActionsButtonRef = useRef<HTMLAnchorElement | HTMLButtonElement>(
    null,
  );

  const handleMenuClick: MenuProps['onClick'] = ({ key }) => {
    dispatchTaskDetailAction(key, {
      showArtifact: () => setSelectedArtifact(ARTIFACT_RECORD),
      showDiff: () => setDiffOpen(true),
      showReject: () => setRejectOpen(true),
      showStaticAction,
    });
  };

  const topActions = (
    <Space aria-label="任务操作" role="group">
      <Button onClick={() => showStaticAction('继续执行')} type="primary">
        继续执行
      </Button>
      <Dropdown
        destroyOnHidden
        menu={{ items: actionItems, onClick: handleMenuClick }}
        trigger={['click']}
      >
        <Button
          aria-label="更多操作"
          icon={<MoreOutlined />}
          ref={moreActionsButtonRef}
        >
          更多操作
        </Button>
      </Dropdown>
    </Space>
  );

  return (
    <PageContainer ghost pageHeaderRender={false}>
      <section
        aria-label={`任务 ${resolvedTaskId}`}
        className={styles.detailShell}
      >
        <header className={styles.detailHeader}>
          <Link
            aria-label="返回任务列表"
            className={styles.backLink}
            to="/tasks"
          >
            <ArrowLeftOutlined />
          </Link>
          <span className={styles.detailCode}>{resolvedTaskId}</span>
          <h1 className={styles.detailTitle}>{TASK_DETAIL_FIXTURE.title}</h1>
          <SemanticTag label={TASK_DETAIL_FIXTURE.status} tone="brand" />
          <SemanticTag
            label={`优先级 ${TASK_DETAIL_FIXTURE.priority}`}
            tone="neutral"
          />
          <span className={styles.detailRepository}>
            {TASK_DETAIL_FIXTURE.repository}
          </span>
          <div className={styles.detailActions}>{topActions}</div>
        </header>
        <div className={styles.detailGrid}>
          <ConversationPane />
          <InspectorPanel activeKey={activeTab} onChange={setActiveTab} />
        </div>
      </section>

      <DetailDrawer<ArtifactRecord>
        columns={artifactColumns}
        dataSource={selectedArtifact}
        focusReturnRef={moreActionsButtonRef}
        onClose={() => setSelectedArtifact(undefined)}
        open={selectedArtifact !== undefined}
        size={560}
        title="Artifact 文档"
      />

      <Drawer
        afterOpenChange={(nextOpen) => {
          if (!nextOpen) {
            moreActionsButtonRef.current?.focus({ preventScroll: true });
          }
        }}
        destroyOnHidden
        focusable={{ focusTriggerAfterClose: false }}
        onClose={() => setDiffOpen(false)}
        open={diffOpen}
        size={880}
        title="代码 Diff"
      >
        <DiffContent />
      </Drawer>

      <RejectApprovalModal
        focusReturnRef={moreActionsButtonRef}
        onClose={() => setRejectOpen(false)}
        open={rejectOpen}
      />
    </PageContainer>
  );
}
