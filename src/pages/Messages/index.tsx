import { PageContainer, ProCard } from '@ant-design/pro-components';
import { Badge, Button, Empty, Segmented } from 'antd';
import { useState } from 'react';
import { SemanticTag } from '@/components/SemanticTag';
import { useStaticPrototypeAction } from '@/hooks/useStaticPrototypeAction';
import {
  MESSAGE_CATEGORY_LABELS,
  MESSAGE_CATEGORY_OPTIONS,
  MESSAGE_FIXTURES,
} from './constant';
import { useStyles } from './index.style';
import type { MessageCategory, MessageRecord } from './type';

export interface MessageFeedProps {
  records: readonly MessageRecord[];
}

export function MessageFeed({ records }: MessageFeedProps) {
  const { styles } = useStyles();
  const showStaticAction = useStaticPrototypeAction();

  if (records.length === 0) {
    return (
      <div aria-label="暂无消息" className={styles.empty} role="status">
        <Empty description="暂无符合当前分类的消息" />
      </div>
    );
  }

  return (
    <ul aria-label="消息列表" className={styles.list}>
      {records.map((record) => (
        <li
          aria-label={`${record.unread ? '未读' : '已读'}消息：${record.title}`}
          className={styles.listItem}
          key={record.id}
        >
          <Button
            aria-label={`打开消息：${record.title}`}
            block
            className={styles.messageButton}
            onClick={() => showStaticAction(`打开消息 ${record.title}`)}
            type="text"
          >
            <div className={styles.messageBody}>
              <div className={styles.messageHeader}>
                <Badge
                  status={record.unread ? 'processing' : 'default'}
                  text={<span className={styles.title}>{record.title}</span>}
                />
                <div className={styles.metadata}>
                  <SemanticTag
                    label={MESSAGE_CATEGORY_LABELS[record.category]}
                    tone={record.tone}
                  />
                  <time className={styles.time}>{record.time}</time>
                </div>
              </div>
              <p className={styles.description}>{record.description}</p>
            </div>
          </Button>
        </li>
      ))}
    </ul>
  );
}

const MessagesPage: React.FC = () => {
  const { styles } = useStyles();
  const showStaticAction = useStaticPrototypeAction();
  const [selectedCategory, setSelectedCategory] =
    useState<MessageCategory>('all');
  const filteredMessages =
    selectedCategory === 'all'
      ? MESSAGE_FIXTURES
      : MESSAGE_FIXTURES.filter(
          (record) => record.category === selectedCategory,
        );

  return (
    <PageContainer ghost pageHeaderRender={false}>
      <div className={styles.page}>
        <ProCard className={styles.card}>
          <div className={styles.toolbar}>
            <Segmented<MessageCategory>
              aria-label="消息分类"
              onChange={setSelectedCategory}
              options={MESSAGE_CATEGORY_OPTIONS}
              value={selectedCategory}
            />
            <Button onClick={() => showStaticAction('全部已读')} type="link">
              全部已读
            </Button>
          </div>
          <MessageFeed records={filteredMessages} />
        </ProCard>
      </div>
    </PageContainer>
  );
};

export default MessagesPage;
