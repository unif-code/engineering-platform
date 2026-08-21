import { PageContainer, ProCard } from '@ant-design/pro-components';
import { Link, useModel } from '@umijs/max';
import { Empty, Typography } from 'antd';
import { useMemo } from 'react';
import { buildMenuData } from '@/features/navigation';
import { useStyles } from './index.style';

export default function AdminPage() {
  const { styles } = useStyles();
  const { initialState } = useModel('@@initialState');
  const adminNavigation = useMemo(
    () =>
      buildMenuData(initialState?.navigation ?? [])
        .find(({ key }) => key === 'group-admin')
        ?.children?.flatMap((item) =>
          typeof item.path === 'string' && typeof item.name === 'string'
            ? [
                {
                  icon: item.icon,
                  key: String(item.key),
                  name: item.name,
                  path: item.path,
                },
              ]
            : [],
        ) ?? [],
    [initialState?.navigation],
  );

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
              {adminNavigation.length === 0 ? (
                <Empty description="当前没有可见管理导航" />
              ) : (
                <nav aria-label="当前可见管理导航">
                  <ul className={styles.navigationList}>
                    {adminNavigation.map((item) => (
                      <li key={item.key}>
                        <Link className={styles.navigationLink} to={item.path}>
                          {item.icon}
                          <span>{item.name}</span>
                        </Link>
                      </li>
                    ))}
                  </ul>
                </nav>
              )}
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
