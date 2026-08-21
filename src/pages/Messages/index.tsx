import { PageContainer, ProCard } from '@ant-design/pro-components';
import { Button, Empty, Segmented, Tooltip } from 'antd';
import { useState } from 'react';
import { useStyles } from './index.style';

type MessageCategory = 'all' | 'gate' | 'agent' | 'mr' | 'system';

export default function MessagesPage() {
  const { styles } = useStyles();
  const [selectedCategory, setSelectedCategory] =
    useState<MessageCategory>('all');

  return (
    <PageContainer ghost pageHeaderRender={false}>
      <div className={styles.page}>
        <h1 className={styles.pageTitle}>消息中心</h1>
        <ProCard className={styles.card}>
          <div className={styles.toolbar}>
            <Segmented<MessageCategory>
              aria-label="消息分类"
              onChange={setSelectedCategory}
              options={[
                { label: '全部', value: 'all' },
                { label: 'Gate', value: 'gate' },
                { label: 'Agent', value: 'agent' },
                { label: 'MR', value: 'mr' },
                { label: '系统', value: 'system' },
              ]}
              value={selectedCategory}
            />
            <Tooltip title="当前版本暂未接入">
              <span>
                <Button disabled type="link">
                  全部已读
                </Button>
              </span>
            </Tooltip>
          </div>
          <div aria-label="暂无消息" className={styles.empty} role="status">
            <Empty
              description="暂无真实消息数据"
              image={Empty.PRESENTED_IMAGE_SIMPLE}
            />
          </div>
        </ProCard>
      </div>
    </PageContainer>
  );
}
