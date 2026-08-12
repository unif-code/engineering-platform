import { RobotOutlined, UserOutlined } from '@ant-design/icons';
import { Bubble, type BubbleListProps, Sender } from '@ant-design/x';
import { Avatar, Typography } from 'antd';
import { CONVERSATION_ITEMS } from './constant';
import { useStyles } from './index.style';

const bubbleRoles: BubbleListProps['role'] = {
  ai: {
    avatar: <Avatar icon={<RobotOutlined />} />,
    placement: 'start',
  },
  user: {
    avatar: <Avatar icon={<UserOutlined />} />,
    placement: 'end',
  },
};

export function ConversationPane() {
  const { styles } = useStyles();

  return (
    <section aria-label="任务对话" className={styles.conversationPane}>
      <div className={styles.conversationBody}>
        <div className={styles.conversationScroll}>
          <Bubble.List items={CONVERSATION_ITEMS} role={bubbleRoles} />
        </div>
        <div className={styles.senderArea}>
          <Typography.Text className={styles.senderHint}>
            静态原型，不会发送消息
          </Typography.Text>
          <Sender
            autoSize={false}
            disabled
            placeholder="静态原型，不会发送消息"
          />
        </div>
      </div>
    </section>
  );
}
