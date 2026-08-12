import { PageContainer, ProCard } from '@ant-design/pro-components';
import { useModel } from '@umijs/max';
import { Button } from 'antd';
import { MetricCard } from '@/components/MetricCard';
import { SemanticTag } from '@/components/SemanticTag';
import {
  MY_TASKS,
  PENDING_APPROVALS,
  PLATFORM_NOTICES,
  RECENT_MERGE_REQUESTS,
  RUNNING_AGENTS,
  WORKBENCH_METRICS,
} from './constant';
import { useStyles } from './index.style';
import type { WorkbenchListItem } from './type';

interface WorkbenchSectionProps {
  id: string;
  items: readonly WorkbenchListItem[];
  title: string;
}

function WorkbenchSection({ id, items, title }: WorkbenchSectionProps) {
  const { styles } = useStyles();

  return (
    <section aria-labelledby={id}>
      <ProCard className={styles.card} title={<span id={id}>{title}</span>}>
        <ul className={styles.list}>
          {items.map((item) => (
            <li className={styles.listItem} key={item.key}>
              <div className={styles.itemBody}>
                <div className={styles.itemTitle}>
                  {item.code ? (
                    <span className={styles.code}>{item.code}</span>
                  ) : null}
                  <span>{item.title}</span>
                </div>
                <div className={styles.itemDescription}>
                  <span>{item.description}</span>
                  <SemanticTag label={item.status} tone={item.tone} />
                </div>
              </div>
              <Button
                className={styles.action}
                href={item.href}
                size="small"
                type="link"
              >
                {item.actionLabel}
              </Button>
            </li>
          ))}
        </ul>
      </ProCard>
    </section>
  );
}

const HomePage: React.FC = () => {
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

        <section aria-label="关键指标" className={styles.metricsGrid}>
          {WORKBENCH_METRICS.map((metric) => (
            <MetricCard key={metric.title} {...metric} />
          ))}
        </section>

        <div className={styles.contentGrid}>
          <div className={styles.column}>
            <WorkbenchSection
              id="pending-approvals-title"
              items={PENDING_APPROVALS}
              title="待审批"
            />
            <WorkbenchSection
              id="my-tasks-title"
              items={MY_TASKS}
              title="我的任务"
            />
          </div>

          <div className={styles.column}>
            <WorkbenchSection
              id="running-agents-title"
              items={RUNNING_AGENTS}
              title="运行中 Agent"
            />
            <WorkbenchSection
              id="recent-merge-requests-title"
              items={RECENT_MERGE_REQUESTS}
              title="最近 MR"
            />
            <WorkbenchSection
              id="platform-notices-title"
              items={PLATFORM_NOTICES}
              title="平台公告"
            />
          </div>
        </div>
      </div>
    </PageContainer>
  );
};

export default HomePage;
