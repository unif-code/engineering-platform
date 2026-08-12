import { Bar, Column } from '@ant-design/charts';
import { ProCard } from '@ant-design/pro-components';
import { Typography, theme } from 'antd';
import { MetricCard } from '@/components/MetricCard';
import {
  MODEL_CHANNEL_DISTRIBUTION,
  MODEL_DEPLOYMENT_DISTRIBUTION,
  MODEL_TEAM_DISTRIBUTION,
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

      <div className={styles.usageGrid}>
        <ProCard className={styles.analysisCard}>
          <Typography.Title level={5}>调用量趋势 · 近 14 天</Typography.Title>
          <Typography.Paragraph type="secondary">
            Chat + Execution 合计 · 主题色为今日
          </Typography.Paragraph>
          <figure
            aria-label="近十四日模型调用量"
            className={styles.chartFigure}
          >
            <Column
              animate={false}
              axis={{ x: { title: false }, y: false }}
              data={[...MODEL_USAGE_TREND]}
              height={160}
              scale={{ color: { range: [token.colorPrimary] } }}
              style={{ fill: token.colorPrimary }}
              xField="label"
              yField="value"
            />
          </figure>

          <Typography.Title level={5}>Chat vs Agent 占比</Typography.Title>
          <figure
            aria-label="Chat 与 Agent 调用占比"
            className={styles.chartFigure}
          >
            <Bar
              animate={false}
              axis={false}
              colorField="label"
              data={[...MODEL_CHANNEL_DISTRIBUTION]}
              height={72}
              label={{ position: 'inside', text: 'value' }}
              legend={{ color: { position: 'bottom' } }}
              scale={{
                color: { range: [token.colorText, token.colorPrimary] },
              }}
              stack
              xField="value"
              yField={() => '调用占比'}
            />
          </figure>
        </ProCard>

        <div className={styles.distributionColumn}>
          <ProCard className={styles.analysisCard} title="按模型分布">
            <figure aria-label="按模型调用分布" className={styles.chartFigure}>
              <Bar
                animate={false}
                axis={{ x: false, y: { title: false } }}
                data={[...MODEL_DEPLOYMENT_DISTRIBUTION]}
                height={170}
                label={{ position: 'right', text: 'value' }}
                style={{ fill: token.colorText }}
                xField="value"
                yField="label"
              />
            </figure>
          </ProCard>
          <ProCard className={styles.analysisCard} title="按 Team 分布">
            <figure
              aria-label="按 Team 调用分布"
              className={styles.chartFigure}
            >
              <Bar
                animate={false}
                axis={{ x: false, y: { title: false } }}
                data={[...MODEL_TEAM_DISTRIBUTION]}
                height={140}
                label={{ position: 'right', text: 'value' }}
                style={{ fill: token.colorPrimary }}
                xField="value"
                yField="label"
              />
            </figure>
            <Typography.Text type="secondary">
              成本按 Deployment 目录价估算，月度对账以 Provider 账单为准
            </Typography.Text>
          </ProCard>
        </div>
      </div>
    </section>
  );
}
