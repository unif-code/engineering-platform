import { PageContainer, ProCard } from '@ant-design/pro-components';
import { Tabs } from 'antd';
import clsx from 'clsx';
import { useState } from 'react';
import { MetricCard } from '@/components/MetricCard';
import { SemanticTag } from '@/components/SemanticTag';
import { WORKSPACE_FIXTURES } from './constant';
import { useStyles } from './index.style';
import { MemberPanel } from './MemberPanel';
import { RepositoryPanel } from './RepositoryPanel';
import { SettingsPanel } from './SettingsPanel';
import type { WorkspaceTabKey } from './type';
import { WorkspaceSelector } from './WorkspaceSelector';

const DEFAULT_WORKSPACE = WORKSPACE_FIXTURES[0];

export default function WorkspacesPage() {
  const { styles } = useStyles();
  const [selectedId, setSelectedId] = useState<string>(DEFAULT_WORKSPACE.id);
  const [activeTab, setActiveTab] = useState<WorkspaceTabKey>('members');
  const selectedWorkspace =
    WORKSPACE_FIXTURES.find((workspace) => workspace.id === selectedId) ??
    DEFAULT_WORKSPACE;

  const selectWorkspace = (workspaceId: string) => {
    setSelectedId(workspaceId);
    setActiveTab('members');
  };

  return (
    <PageContainer
      ghost
      subTitle="管理成员关系、关联仓库与当前 Workspace Policy"
      title="工作区"
    >
      <div className={styles.page}>
        <section aria-label="工作区指标" className={styles.metricsGrid}>
          <MetricCard
            description="当前工作区的静态成员投影"
            title="正式成员"
            value={selectedWorkspace.members.length}
          />
          <MetricCard
            description="可绑定任务的关联仓库"
            title="关联仓库"
            tone="brand"
            value={selectedWorkspace.repositories.length}
          />
        </section>

        <div className={styles.masterDetail}>
          <WorkspaceSelector
            onSelect={selectWorkspace}
            selectedId={selectedWorkspace.id}
            workspaces={WORKSPACE_FIXTURES}
          />

          <ProCard className={clsx(styles.card, styles.detailCard)}>
            <header className={styles.detailHeader}>
              <div>
                <h2 className={styles.detailTitle}>{selectedWorkspace.name}</h2>
                <p className={styles.detailDescription}>
                  {selectedWorkspace.description}
                </p>
              </div>
              <SemanticTag label="当前 Workspace" tone="brand" />
            </header>

            <Tabs
              activeKey={activeTab}
              destroyOnHidden
              items={[
                {
                  children: <MemberPanel workspace={selectedWorkspace} />,
                  key: 'members',
                  label: '成员',
                },
                {
                  children: <RepositoryPanel workspace={selectedWorkspace} />,
                  key: 'repositories',
                  label: '仓库',
                },
                {
                  children: <SettingsPanel workspace={selectedWorkspace} />,
                  key: 'settings',
                  label: '设置',
                },
              ]}
              onChange={(key) => setActiveTab(key as WorkspaceTabKey)}
            />
          </ProCard>
        </div>
      </div>
    </PageContainer>
  );
}
