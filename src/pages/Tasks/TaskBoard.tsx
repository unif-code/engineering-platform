import { ProCard } from '@ant-design/pro-components';
import { Typography } from 'antd';
import { SemanticTag } from '@/components/SemanticTag';
import { TASK_STAGES, TASK_STATUS_META } from './constant';
import { useStyles } from './index.style';
import type { TaskRow } from './type';

interface TaskBoardProps {
  rows: readonly TaskRow[];
}

export function TaskBoard({ rows }: TaskBoardProps) {
  const { styles } = useStyles();

  return (
    <section aria-label="任务看板" className={styles.board}>
      <div className={styles.boardGrid}>
        {TASK_STAGES.map((stage) => {
          const stageRows = rows.filter((row) => row.stage === stage);

          return (
            <section className={styles.boardColumn} key={stage}>
              <div className={styles.boardHeader}>
                <Typography.Title level={5}>{stage}</Typography.Title>
                <span className={styles.boardCount}>{stageRows.length}</span>
              </div>
              <div className={styles.boardStack}>
                {stageRows.map((row) => {
                  const status = TASK_STATUS_META[row.status];

                  return (
                    <ProCard
                      className={styles.taskCard}
                      key={row.id}
                      size="small"
                    >
                      <div className={styles.taskCode}>{row.id}</div>
                      <div className={styles.taskTitle}>{row.title}</div>
                      <div className={styles.taskMeta}>
                        <span>{row.workspace}</span>
                        <span>{row.owner}</span>
                      </div>
                      <SemanticTag label={status.label} tone={status.tone} />
                    </ProCard>
                  );
                })}
                {stageRows.length === 0 ? (
                  <Typography.Text className={styles.empty} type="secondary">
                    暂无任务
                  </Typography.Text>
                ) : null}
              </div>
            </section>
          );
        })}
      </div>
    </section>
  );
}
