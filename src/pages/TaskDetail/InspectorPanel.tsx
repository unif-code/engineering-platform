import { Empty, Tabs } from 'antd';
import { useStyles } from './index.style';

export function InspectorPanel() {
  const { styles } = useStyles();

  return (
    <aside aria-label="任务 Inspector" className={styles.inspector}>
      <Tabs
        className={styles.inspectorTabs}
        defaultActiveKey="overview"
        destroyOnHidden
        items={[
          {
            children: (
              <Empty
                description="暂无真实任务详情数据"
                image={Empty.PRESENTED_IMAGE_SIMPLE}
              />
            ),
            key: 'overview',
            label: '总览',
          },
          {
            children: (
              <Empty
                description="暂无真实交付数据"
                image={Empty.PRESENTED_IMAGE_SIMPLE}
              />
            ),
            key: 'delivery',
            label: '交付',
          },
          {
            children: (
              <Empty
                description="暂无真实预览数据"
                image={Empty.PRESENTED_IMAGE_SIMPLE}
              />
            ),
            key: 'preview',
            label: '预览',
          },
        ]}
        size="small"
      />
    </aside>
  );
}
