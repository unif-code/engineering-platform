import { ProCard } from '@ant-design/pro-components';
import { DistributionBar } from '@/components/DistributionBar';
import { MetricCard } from '@/components/MetricCard';
import { MiniBarChart } from '@/components/MiniBarChart';
import {
  MODEL_PROVIDER_DISTRIBUTION,
  MODEL_USAGE_METRICS,
  MODEL_USAGE_TREND,
} from './constant';
import { useStyles } from './index.style';

export function ModelUsagePanel() {
  const { styles } = useStyles();

  return (
    <section aria-label="调用看板内容" className={styles.page}>
      <section aria-label="模型调用 KPI" className={styles.metricsGrid}>
        {MODEL_USAGE_METRICS.map((metric) => (
          <article
            aria-label={`${metric.title}：${metric.value}`}
            key={metric.key}
          >
            <MetricCard
              description={metric.description}
              title={metric.title}
              tone={metric.tone}
              value={metric.value}
            />
          </article>
        ))}
      </section>

      <div className={styles.analysisGrid}>
        <ProCard className={styles.analysisCard} title="近七日调用量">
          <MiniBarChart
            ariaLabel="近七日模型调用量"
            data={MODEL_USAGE_TREND}
            highlightKey="sun"
          />
        </ProCard>
        <ProCard className={styles.analysisCard} title="Provider 分布">
          <DistributionBar
            ariaLabel="Provider 调用分布"
            items={MODEL_PROVIDER_DISTRIBUTION}
          />
        </ProCard>
      </div>
    </section>
  );
}
