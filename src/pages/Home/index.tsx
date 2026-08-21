import { PageContainer, ProCard } from '@ant-design/pro-components';
import { useModel } from '@umijs/max';
import { Empty } from 'antd';
import { useStyles } from './index.style';

interface EmptySectionProps {
  description: string;
  id: string;
  title: string;
}

function EmptySection({ description, id, title }: EmptySectionProps) {
  const { styles } = useStyles();

  return (
    <section aria-labelledby={id}>
      <ProCard
        className={styles.card}
        title={
          <h2 className={styles.sectionTitle} id={id}>
            {title}
          </h2>
        }
      >
        <Empty description={description} image={Empty.PRESENTED_IMAGE_SIMPLE} />
      </ProCard>
    </section>
  );
}

export default function HomePage() {
  const { styles } = useStyles();
  const { initialState } = useModel('@@initialState');
  const userName = initialState?.principal?.name ?? '平台用户';

  return (
    <PageContainer ghost pageHeaderRender={false}>
      <div className={styles.page}>
        <header className={styles.workbenchHeader}>
          <h1 className={styles.greeting}>你好，{userName}</h1>
          <p className={styles.intro}>
            查看今天的 Gate、任务、Agent Attempt 与交付动态
          </p>
        </header>

        <section aria-labelledby="workbench-metrics-title">
          <h2 className={styles.sectionTitle} id="workbench-metrics-title">
            关键指标
          </h2>
          <div className={styles.metricsGrid}>
            {[
              '待处理 Gate',
              '我的进行中任务',
              '运行中 Agent Attempt',
              '本周已合并 MR',
            ].map((title) => (
              <ProCard className={styles.card} key={title} title={title}>
                <Empty
                  description="暂无真实指标数据"
                  image={Empty.PRESENTED_IMAGE_SIMPLE}
                />
              </ProCard>
            ))}
          </div>
        </section>

        <div className={styles.contentGrid}>
          <div className={styles.column}>
            <EmptySection
              description="暂无真实审批数据"
              id="pending-approvals-title"
              title="待审批"
            />
            <EmptySection
              description="暂无真实任务数据"
              id="my-tasks-title"
              title="我的任务"
            />
          </div>
          <div className={styles.column}>
            <EmptySection
              description="暂无真实 Agent 数据"
              id="running-agents-title"
              title="运行中 Agent"
            />
            <EmptySection
              description="暂无真实合并请求数据"
              id="recent-merge-requests-title"
              title="最近 MR"
            />
            <EmptySection
              description="暂无真实公告数据"
              id="platform-notices-title"
              title="平台公告"
            />
          </div>
        </div>
      </div>
    </PageContainer>
  );
}
