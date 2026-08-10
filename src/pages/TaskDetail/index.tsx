import { MoreOutlined } from '@ant-design/icons';
import { PageContainer } from '@ant-design/pro-components';
import { useParams } from '@umijs/max';
import { Button, Drawer, Dropdown, type MenuProps, Space } from 'antd';
import { useState } from 'react';
import { DetailDrawer } from '@/components/DetailDrawer';
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

export default function TaskDetailPage() {
  const { styles } = useStyles();
  const { taskId } = useParams<'taskId'>();
  const resolvedTaskId = taskId ?? TASK_DETAIL_FIXTURE.id;
  const showStaticAction = useStaticPrototypeAction();
  const [activeTab, setActiveTab] = useState<InspectorTabKey>('overview');
  const [selectedArtifact, setSelectedArtifact] = useState<ArtifactRecord>();
  const [diffOpen, setDiffOpen] = useState(false);
  const [rejectOpen, setRejectOpen] = useState(false);

  const handleMenuClick: MenuProps['onClick'] = ({ key }) => {
    if (key === 'assign') {
      showStaticAction('分配任务');
      return;
    }
    if (key === 'reject') {
      setRejectOpen(true);
      return;
    }
    if (key === 'artifact') {
      setSelectedArtifact(ARTIFACT_RECORD);
      return;
    }
    if (key === 'diff') {
      setDiffOpen(true);
    }
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
        <Button aria-label="更多操作" icon={<MoreOutlined />}>
          更多操作
        </Button>
      </Dropdown>
    </Space>
  );

  return (
    <PageContainer extra={topActions} title={`任务 ${resolvedTaskId}`}>
      <section aria-label={`任务 ${resolvedTaskId}`}>
        <div className={styles.detailGrid}>
          <ConversationPane />
          <InspectorPanel activeKey={activeTab} onChange={setActiveTab} />
        </div>
      </section>

      <DetailDrawer<ArtifactRecord>
        columns={artifactColumns}
        dataSource={selectedArtifact}
        onClose={() => setSelectedArtifact(undefined)}
        open={selectedArtifact !== undefined}
        size={560}
        title="Artifact 文档"
      />

      <Drawer
        destroyOnHidden
        onClose={() => setDiffOpen(false)}
        open={diffOpen}
        size={880}
        title="代码 Diff"
      >
        <DiffContent />
      </Drawer>

      {rejectOpen ? (
        <RejectApprovalModal onClose={() => setRejectOpen(false)} open />
      ) : null}
    </PageContainer>
  );
}
