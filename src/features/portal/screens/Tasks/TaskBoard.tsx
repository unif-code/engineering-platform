import { Empty, Typography } from 'antd';
import { useStyles } from './index.style';

interface TaskBoardProps {
  rows: readonly unknown[];
}

const taskStages = [
  'Clarification',
  'Spec',
  'Plan',
  'Implementation',
  'Review',
] as const;

export function TaskBoard({ rows }: TaskBoardProps) {
  const { styles } = useStyles();

  return (
    <section aria-label="任务看板" className={styles.board}>
      <div className={styles.boardGrid}>
        {taskStages.map((stage) => (
          <section className={styles.boardColumn} key={stage}>
            <div className={styles.boardHeader}>
              <Typography.Title level={5}>{stage}</Typography.Title>
              <span className={styles.boardCount}>{rows.length}</span>
            </div>
            <Empty
              description="暂无真实任务数据"
              image={Empty.PRESENTED_IMAGE_SIMPLE}
            />
          </section>
        ))}
      </div>
    </section>
  );
}
