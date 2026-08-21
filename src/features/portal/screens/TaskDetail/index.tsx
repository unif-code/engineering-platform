import { ArrowLeftOutlined, MoreOutlined } from '@ant-design/icons';
import { PageContainer } from '@ant-design/pro-components';
import { Link, useParams } from '@umijs/max';
import { Button, Space, Tooltip } from 'antd';
import { ConversationPane } from './ConversationPane';
import { InspectorPanel } from './InspectorPanel';
import { useStyles } from './index.style';

export default function TaskDetailPage() {
  const { styles } = useStyles();
  const { taskId } = useParams<'taskId'>();
  const resolvedTaskId = taskId ?? '未知任务';

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
          <h1 className={styles.detailTitle}>任务详情</h1>
          <div className={styles.detailActions}>
            <Space aria-label="任务操作" role="group">
              <Tooltip title="当前版本暂未接入">
                <span>
                  <Button disabled type="primary">
                    继续执行
                  </Button>
                </span>
              </Tooltip>
              <Tooltip title="当前版本暂未接入">
                <span>
                  <Button
                    aria-label="更多操作"
                    disabled
                    icon={<MoreOutlined />}
                  >
                    更多操作
                  </Button>
                </span>
              </Tooltip>
            </Space>
          </div>
        </header>
        <div className={styles.detailGrid}>
          <ConversationPane />
          <InspectorPanel />
        </div>
      </section>
    </PageContainer>
  );
}
