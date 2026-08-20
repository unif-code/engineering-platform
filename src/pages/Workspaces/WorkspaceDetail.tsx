import { Tabs } from 'antd';
import { useState } from 'react';
import { useStyles } from './index.style';
import { MemberPanel } from './MemberPanel';
import { RepositoryPanel } from './RepositoryPanel';
import { SettingsPanel } from './SettingsPanel';
import type { WorkspaceFixture, WorkspaceTabKey } from './type';

export interface WorkspaceDetailProps {
  workspace: WorkspaceFixture;
}

export function WorkspaceDetail({ workspace }: WorkspaceDetailProps) {
  const { styles } = useStyles();
  const [activeTab, setActiveTab] = useState<WorkspaceTabKey>('members');
  const selectedRepositoryCount = workspace.repositories.filter(
    ({ selected }) => selected,
  ).length;

  return (
    <section
      aria-label={`${workspace.name} 工作区详情`}
      className={styles.detailCard}
    >
      <div className={styles.detailSurface} data-workspace-surface>
        <header className={styles.detailHeader}>
          <span
            aria-label={`${workspace.name} 工作区标识`}
            className={styles.detailAvatar}
            role="img"
          >
            {workspace.name.slice(0, 1)}
          </span>
          <div className={styles.detailIdentity}>
            <h2 className={styles.detailTitle}>{workspace.name}</h2>
            <p className={styles.detailDescription}>
              Owner：{workspace.owner}（开发Leader）· GitLab 已连接 ·
              成员与仓库构成业务资源边界
              {workspace.archived ? ' · 已归档' : ''}
            </p>
          </div>
        </header>

        <Tabs
          activeKey={activeTab}
          destroyOnHidden
          items={[
            {
              children: <MemberPanel workspace={workspace} />,
              key: 'members',
              label: (
                <span>
                  成员 <span aria-hidden>{workspace.members.length}</span>
                </span>
              ),
            },
            {
              children: <RepositoryPanel workspace={workspace} />,
              key: 'repositories',
              label: (
                <span>
                  仓库{' '}
                  <span aria-hidden>
                    {workspace.canManage
                      ? `${selectedRepositoryCount}/${workspace.foundRepositoryCount}`
                      : selectedRepositoryCount}
                  </span>
                </span>
              ),
            },
            ...(workspace.canManage
              ? [
                  {
                    children: <SettingsPanel workspace={workspace} />,
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
  );
}
