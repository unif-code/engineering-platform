import { PageContainer } from '@ant-design/pro-components';
import { Tabs } from 'antd';
import { useState } from 'react';
import { WORKSPACE_FIXTURES } from './constant';
import { useStyles } from './index.style';
import { MemberPanel } from './MemberPanel';
import { RepositoryPanel } from './RepositoryPanel';
import { SettingsPanel } from './SettingsPanel';
import type { WorkspaceFixture, WorkspaceTabKey } from './type';
import { WorkspaceSelector } from './WorkspaceSelector';

const DEFAULT_WORKSPACE = WORKSPACE_FIXTURES[0];

export default function WorkspacesPage() {
  const { styles } = useStyles();
  const [selectedWorkspace, setSelectedWorkspace] =
    useState<WorkspaceFixture>(DEFAULT_WORKSPACE);
  const [activeTab, setActiveTab] = useState<WorkspaceTabKey>('members');
  const selectedRepositoryCount = selectedWorkspace.repositories.filter(
    ({ selected }) => selected,
  ).length;

  const selectWorkspace = (workspace: WorkspaceFixture) => {
    setSelectedWorkspace(workspace);
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
          <div className={styles.detailSurface} data-workspace-surface>
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
                  Owner：{selectedWorkspace.owner}（开发Leader）· GitLab 已连接
                  · 成员与仓库构成业务资源边界
                  {selectedWorkspace.archived ? ' · 已归档' : ''}
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
                  label: (
                    <span>
                      成员{' '}
                      <span aria-hidden>
                        {selectedWorkspace.members.length}
                      </span>
                    </span>
                  ),
                },
                {
                  children: <RepositoryPanel workspace={selectedWorkspace} />,
                  key: 'repositories',
                  label: (
                    <span>
                      仓库{' '}
                      <span aria-hidden>
                        {selectedWorkspace.canManage
                          ? `${selectedRepositoryCount}/${selectedWorkspace.foundRepositoryCount}`
                          : selectedRepositoryCount}
                      </span>
                    </span>
                  ),
                },
                ...(selectedWorkspace.canManage
                  ? [
                      {
                        children: (
                          <SettingsPanel workspace={selectedWorkspace} />
                        ),
                        key: 'settings',
                        label: '设置',
                      },
                    ]
                  : []),
              ]}
              onChange={(key) => setActiveTab(key as WorkspaceTabKey)}
              styles={{ body: { minWidth: 0 } }}
              tabBarStyle={{ margin: 0, paddingInline: 20 }}
            />
          </div>
        </section>
      </div>
    </PageContainer>
  );
}
