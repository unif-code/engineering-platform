import { PageContainer, ProCard } from '@ant-design/pro-components';
import { Empty, Segmented, Tooltip } from 'antd';
import { useStyles } from './index.style';

interface DataRegionProps {
  description: string;
  label: string;
  title: string;
}

function DataRegion({ description, label, title }: DataRegionProps) {
  const { styles } = useStyles();

  return (
    <section aria-label={label}>
      <ProCard className={styles.card} title={title}>
        <Empty description={description} image={Empty.PRESENTED_IMAGE_SIMPLE} />
      </ProCard>
    </section>
  );
}

export default function TeamBoardPage() {
  const { styles } = useStyles();

  return (
    <PageContainer ghost pageHeaderRender={false}>
      <div className={styles.page}>
        <h1 className={styles.pageTitle}>团队看板</h1>
        <div className={styles.toolbar}>
          <Tooltip title="当前版本暂未接入">
            <span>
              <Segmented
                aria-label="团队范围"
                disabled
                options={['当前团队']}
                size="small"
                value="当前团队"
              />
            </span>
          </Tooltip>
        </div>

        <section aria-labelledby="team-metrics-title">
          <h2 className={styles.sectionTitle} id="team-metrics-title">
            团队关键指标
          </h2>
          <div className={styles.metricsGrid}>
            {['进行中', '本周完成', '阻塞', 'Agent 参与率'].map((title) => (
              <ProCard className={styles.card} key={title} title={title}>
                <Empty
                  description="暂无真实指标数据"
                  image={Empty.PRESENTED_IMAGE_SIMPLE}
                />
              </ProCard>
            ))}
          </div>
        </section>

        <div className={styles.analysisGrid}>
          <DataRegion
            description="暂无真实吞吐数据"
            label="任务吞吐"
            title="任务吞吐 · 近 8 周完成数"
          />
          <DataRegion
            description="暂无真实阶段分布数据"
            label="阶段分布"
            title="进行中任务 · 阶段分布"
          />
        </div>

        <div className={styles.analysisGrid}>
          <DataRegion
            description="暂无真实成员负载数据"
            label="成员负载"
            title="成员负载 · 进行中任务数"
          />
          <div className={styles.rightStack}>
            <DataRegion
              description="暂无真实处理周期数据"
              label="合并请求处理周期"
              title="合并请求处理周期"
            />
            <DataRegion
              description="暂无真实阻塞任务数据"
              label="阻塞任务"
              title="阻塞 / 异常任务"
            />
          </div>
        </div>
      </div>
    </PageContainer>
  );
}
