import { Bar, Column } from '@ant-design/charts';
import { ProCard } from '@ant-design/pro-components';
import { theme } from 'antd';
import { MetricCard } from '@/components/MetricCard';
import type { ChartDatum } from '@/types/presentation';
import {
  MODEL_PROVIDER_DISTRIBUTION,
  MODEL_USAGE_METRICS,
  MODEL_USAGE_TREND,
} from './constant';
import { useStyles } from './index.style';

export function ModelUsagePanel() {
  const { styles } = useStyles();
  const { token } = theme.useToken();

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
          <figure aria-label="近七日模型调用量" className={styles.chartFigure}>
            <Column
              animate={false}
              axis={{ x: { title: false }, y: false }}
              data={[...MODEL_USAGE_TREND]}
              height={160}
              label={{
                position: 'top',
                text: (datum: ChartDatum) =>
                  datum.valueLabel ?? String(datum.value),
              }}
              style={{
                fill: (datum: ChartDatum) =>
                  datum.tone === 'success'
                    ? token.colorSuccess
                    : token.colorPrimary,
              }}
              xField="label"
              yField="value"
            />
          </figure>
        </ProCard>
        <ProCard className={styles.analysisCard} title="Provider 分布">
          <figure aria-label="Provider 调用分布" className={styles.chartFigure}>
            <Bar
              animate={false}
              axis={{ x: false, y: false }}
              colorField="label"
              data={[...MODEL_PROVIDER_DISTRIBUTION]}
              height={160}
              label={{ position: 'right', text: 'value' }}
              legend={{ color: { position: 'bottom' } }}
              scale={{
                color: {
                  range: [
                    token.colorPrimary,
                    token.colorInfo,
                    token.colorSuccess,
                    token.colorWarning,
                  ],
                },
              }}
              stack
              xField="value"
              yField={() => 'Provider'}
            />
          </figure>
        </ProCard>
      </div>
    </section>
  );
}
