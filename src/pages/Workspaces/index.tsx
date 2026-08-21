import { PageContainer } from '@ant-design/pro-components';
import { Empty, Tabs } from 'antd';
import { useStyles } from './index.style';

function WorkspaceEmpty({ description }: { description: string }) {
  return (
    <Empty description={description} image={Empty.PRESENTED_IMAGE_SIMPLE} />
  );
}

export default function WorkspacesPage() {
  const { styles } = useStyles();

  return (
    <PageContainer ghost pageHeaderRender={false}>
      <div className={styles.masterDetail}>
        <aside aria-label="工作区选择" className={styles.selectorCard}>
          <header className={styles.selectorHeader}>
            <h1 className={styles.selectorTitle}>我的工作区</h1>
            <span className={styles.secondaryText}>按成员关系可见</span>
          </header>
          <div className={styles.selectorEmpty}>
            <WorkspaceEmpty description="暂无真实个人工作区数据" />
          </div>
        </aside>

        <section aria-label="工作区详情" className={styles.detailCard}>
          <header className={styles.detailHeader}>
            <h2 className={styles.detailTitle}>工作区详情</h2>
            <p className={styles.detailDescription}>
              个人工作区接口接入后，可在此查看成员、仓库与设置。
            </p>
          </header>
          <Tabs
            defaultActiveKey="members"
            destroyOnHidden
            items={[
              {
                children: (
                  <WorkspaceEmpty description="暂无真实工作区详情数据" />
                ),
                key: 'members',
                label: '成员',
              },
              {
                children: <WorkspaceEmpty description="暂无真实仓库数据" />,
                key: 'repositories',
                label: '仓库',
              },
              {
                children: <WorkspaceEmpty description="暂无真实设置数据" />,
                key: 'settings',
                label: '设置',
              },
            ]}
          />
        </section>
      </div>
    </PageContainer>
  );
}
