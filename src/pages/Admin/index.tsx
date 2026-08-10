import { PageContainer, ProCard } from '@ant-design/pro-components';
import { Button, Progress } from 'antd';
import { MetricCard } from '@/components/MetricCard';
import { SemanticTag } from '@/components/SemanticTag';
import { ROUTE_REGISTRY } from '@/features/navigation';
import {
  ADMIN_ENTRIES,
  ADMIN_METRICS,
  ADMIN_RISKS,
  SYSTEM_STATUSES,
} from './constant';
import { useStyles } from './index.style';

const AdminPage: React.FC = () => {
  const { styles } = useStyles();

  return (
    <PageContainer
      ghost
      subTitle="平台资源、风险与基础服务的静态概览"
      title="管理后台概览"
    >
      <div className={styles.page}>
        <section aria-label="平台关键指标" className={styles.metricsGrid}>
          {ADMIN_METRICS.map((metric) => (
            <MetricCard key={metric.title} {...metric} />
          ))}
        </section>

        <section aria-labelledby="admin-entry-title">
          <ProCard
            className={styles.sectionCard}
            title={<span id="admin-entry-title">管理入口</span>}
          >
            <div className={styles.entryGrid}>
              {ADMIN_ENTRIES.map((entry) => (
                <ProCard
                  className={styles.entryCard}
                  key={entry.routeKey}
                  size="small"
                  title={entry.label}
                >
                  <p className={styles.entryDescription}>{entry.description}</p>
                  <Button
                    aria-label={`进入${entry.label}`}
                    href={entry.href}
                    icon={ROUTE_REGISTRY[entry.routeKey].icon}
                    size="small"
                    type="link"
                  >
                    进入{entry.label}
                  </Button>
                </ProCard>
              ))}
            </div>
          </ProCard>
        </section>

        <div className={styles.lowerGrid}>
          <section aria-labelledby="admin-risks-title">
            <ProCard
              className={styles.sectionCard}
              title={<span id="admin-risks-title">近期风险</span>}
            >
              <ul className={styles.list}>
                {ADMIN_RISKS.map((risk) => (
                  <li className={styles.listItem} key={risk.key}>
                    <div className={styles.riskBody}>
                      <strong>{risk.title}</strong>
                      <div className={styles.riskDescription}>
                        <span>{risk.description}</span>
                        <SemanticTag label={risk.status} tone={risk.tone} />
                      </div>
                    </div>
                    <Button
                      className={styles.action}
                      href={risk.href}
                      size="small"
                      type="link"
                    >
                      {risk.actionLabel}
                    </Button>
                  </li>
                ))}
              </ul>
            </ProCard>
          </section>

          <section aria-labelledby="system-status-title">
            <ProCard
              className={styles.sectionCard}
              title={<span id="system-status-title">系统状态</span>}
            >
              <ul className={styles.list}>
                {SYSTEM_STATUSES.map((service) => (
                  <li className={styles.listItem} key={service.key}>
                    <div className={styles.statusContent}>
                      <div className={styles.statusHeader}>
                        <strong>{service.name}</strong>
                        <SemanticTag
                          label={service.status}
                          tone={service.tone}
                        />
                      </div>
                      <span className={styles.statusDescription}>
                        {service.description}
                      </span>
                      <div
                        aria-label={`${service.name} 健康度 ${service.percent}%`}
                        aria-valuemax={100}
                        aria-valuemin={0}
                        aria-valuenow={service.percent}
                        role="progressbar"
                      >
                        <Progress
                          percent={service.percent}
                          showInfo={false}
                          size="small"
                          status={
                            service.tone === 'success' ? 'success' : 'normal'
                          }
                        />
                      </div>
                    </div>
                  </li>
                ))}
              </ul>
            </ProCard>
          </section>
        </div>
      </div>
    </PageContainer>
  );
};

export default AdminPage;
