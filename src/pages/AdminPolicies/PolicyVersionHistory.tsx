import { Button, Drawer, Empty, Spin, Typography } from 'antd';
import { useState } from 'react';
import { SemanticTag } from '@/components/SemanticTag';
import { useStyles } from './index.style';
import type { PolicyVersionRow } from './type';

interface PolicyVersionHistoryProps {
  items: PolicyVersionRow[];
  loading: boolean;
  onRollback: (version: PolicyVersionRow) => void;
  rollbackDisabled: boolean;
}

const formatPublishedAt = (value: string) =>
  new Intl.DateTimeFormat('zh-CN', {
    dateStyle: 'medium',
    hour12: false,
    timeStyle: 'short',
  }).format(new Date(value));

export function PolicyVersionHistory({
  items,
  loading,
  onRollback,
  rollbackDisabled,
}: PolicyVersionHistoryProps) {
  const { styles } = useStyles();
  const [allVersionsOpen, setAllVersionsOpen] = useState(false);

  const renderVersion = (item: PolicyVersionRow, fullHistory = false) => (
    <article
      aria-label={`版本 ${item.version}`}
      className={fullHistory ? styles.versionDrawerItem : styles.versionCard}
      key={item.version}
    >
      <div className={styles.versionHeading}>
        <Typography.Text strong>版本 {item.version}</Typography.Text>
        <SemanticTag
          label={item.current ? '当前版本' : '历史版本'}
          tone={item.current ? 'success' : 'neutral'}
        />
      </div>
      <Typography.Text>{item.reason}</Typography.Text>
      <Typography.Text type="secondary">
        {item.publishedBy} · {formatPublishedAt(item.publishedAt)}
      </Typography.Text>
      {item.current ? null : (
        <Button
          aria-label={`回滚版本 ${item.version}`}
          disabled={rollbackDisabled}
          onClick={() => {
            if (fullHistory) {
              setAllVersionsOpen(false);
            }
            onRollback(item);
          }}
          type="link"
        >
          回滚
        </Button>
      )}
    </article>
  );

  return (
    <>
      <section aria-label="版本历史" className={styles.versionHistory}>
        <div className={styles.versionHeader}>
          <Typography.Title className={styles.sectionTitle} level={4}>
            版本历史
          </Typography.Title>
          <Typography.Text type="secondary">最近 3 次</Typography.Text>
          {items.length > 3 ? (
            <Button
              className={styles.allVersionsButton}
              onClick={() => setAllVersionsOpen(true)}
              size="small"
              type="link"
            >
              全部 {items.length} 个版本
            </Button>
          ) : null}
        </div>
        {loading ? <Spin aria-label="正在加载版本历史" /> : null}
        {!loading && items.length === 0 ? (
          <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} />
        ) : null}
        <div className={styles.versionList}>
          {items.slice(0, 3).map((item) => renderVersion(item))}
        </div>
      </section>

      <Drawer
        destroyOnHidden
        focusable={{ focusTriggerAfterClose: true, trap: true }}
        onClose={() => setAllVersionsOpen(false)}
        open={allVersionsOpen}
        size={420}
        title="版本历史"
      >
        <Typography.Paragraph
          className={styles.versionDrawerSummary}
          type="secondary"
        >
          共 {items.length} 个版本 · 回滚只还原该版本涉及的配置项
        </Typography.Paragraph>
        <div className={styles.versionDrawerList}>
          {items.map((item) => renderVersion(item, true))}
        </div>
      </Drawer>
    </>
  );
}
