import { PageContainer, ProCard } from '@ant-design/pro-components';
import { Tabs } from 'antd';
import { useState } from 'react';
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
    <PageContainer ghost pageHeaderRender={false}>
      <div className={styles.masterDetail}>
        <WorkspaceSelector
          onSelect={selectWorkspace}
          selectedId={selectedWorkspace.id}
          workspaces={WORKSPACE_FIXTURES}
        />

        <section
          aria-label={`${selectedWorkspace.name} 工作区详情`}
          className={styles.detailCard}
        >
          <ProCard className={styles.card}>
            <header className={styles.detailHeader}>
              <span
                aria-label={`${selectedWorkspace.name} 工作区标识`}
                className={styles.detailAvatar}
                role="img"
              >
                {selectedWorkspace.name.slice(0, 1)}
              </span>
              <div className={styles.detailIdentity}>
                <h2 className={styles.detailTitle}>{selectedWorkspace.name}</h2>
                <p className={styles.detailDescription}>
                  Owner {selectedWorkspace.members[0]?.name ?? '—'} ·{' '}
                  {selectedWorkspace.members.length} 成员 ·{' '}
                  {selectedWorkspace.repositories.length} 仓库
                </p>
              </div>
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
        </section>
      </div>
    </PageContainer>
  );
}
