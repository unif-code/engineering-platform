import { PageContainer, ProCard } from '@ant-design/pro-components';
import { Empty, Typography } from 'antd';
import { useStyles } from './index.style';

export default function AdminPage() {
  const { styles } = useStyles();

  return (
    <PageContainer ghost pageHeaderRender={false}>
      <main className={styles.page}>
        <header className={styles.header}>
          <Typography.Title className={styles.title} level={2}>
            管理概览
          </Typography.Title>
        </header>

        <div className={styles.grid}>
          <section aria-label="管理导航">
            <ProCard className={styles.card} title="管理导航">
              <Empty description="当前没有真实数据" />
            </ProCard>
          </section>
          <section aria-label="平台状态">
            <ProCard className={styles.card} title="平台状态">
              <Empty description="当前没有真实数据" />
            </ProCard>
          </section>
        </div>
      </main>
    </PageContainer>
  );
}
