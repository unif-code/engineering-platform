import { Sender } from '@ant-design/x';
import { Empty, Tooltip } from 'antd';
import { useStyles } from './index.style';

export function ConversationPane() {
  const { styles } = useStyles();

  return (
    <section aria-label="任务对话" className={styles.conversationPane}>
      <h2 className={styles.panelTitle}>任务时间线</h2>
      <div className={styles.conversationBody}>
        <Empty
          description="暂无真实任务对话数据"
          image={Empty.PRESENTED_IMAGE_SIMPLE}
        />
      </div>
      <Tooltip title="当前版本暂未接入">
        <Sender
          aria-label="任务消息"
          autoSize={false}
          disabled
          placeholder="当前版本暂未接入"
          styles={{ input: { minHeight: 72 } }}
          suffix={(_, { components: { SendButton } }) => (
            <SendButton aria-label="发送任务消息" />
          )}
        />
      </Tooltip>
    </section>
  );
}
