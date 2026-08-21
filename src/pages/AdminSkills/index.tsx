import { PageContainer, ProCard } from '@ant-design/pro-components';
import { Button, Empty, Tooltip, Typography } from 'antd';
import { useStyles } from './index.style';

const EMPTY_DESCRIPTION = '当前没有真实数据';
const UNAVAILABLE_TITLE = '当前版本暂未接入';

export default function AdminSkillsPage() {
  const { styles } = useStyles();

  return (
    <PageContainer ghost pageHeaderRender={false}>
      <main className={styles.page}>
        <header className={styles.toolbar}>
          <Typography.Text type="secondary">
            SDD 方法与仓库规范技能随版本包发布；Agent
            按仓库技术栈自动匹配，执行启动时版本冻结进 Binding（执行绑定）
          </Typography.Text>
          <Tooltip title={UNAVAILABLE_TITLE}>
            <Button disabled title={UNAVAILABLE_TITLE} type="primary">
              新建技能
            </Button>
          </Tooltip>
        </header>

        <div className={styles.masterDetail}>
          <section aria-label="技能目录" className={styles.catalog}>
            <Typography.Title className={styles.sectionTitle} level={3}>
              技能目录
            </Typography.Title>
            <Empty description={EMPTY_DESCRIPTION} />
          </section>

          <section aria-label="技能详情" className={styles.detail}>
            <ProCard className={styles.detailHeader} title="技能详情">
              <Empty description={EMPTY_DESCRIPTION} />
            </ProCard>
            <div className={styles.contentGrid}>
              <section aria-label="规范原文" className={styles.sourceCard}>
                <Typography.Title className={styles.sectionTitle} level={3}>
                  规范原文
                </Typography.Title>
                <Empty description={EMPTY_DESCRIPTION} />
              </section>
              <section aria-label="版本历史" className={styles.historyCard}>
                <Typography.Title className={styles.sectionTitle} level={3}>
                  版本历史
                </Typography.Title>
                <Empty description={EMPTY_DESCRIPTION} />
              </section>
            </div>
          </section>
        </div>
      </main>
    </PageContainer>
  );
}
