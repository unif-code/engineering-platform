import { ProCard } from '@ant-design/pro-components';
import { Typography } from 'antd';
import clsx from 'clsx';
import { DIFF_FILES } from './constant';
import { useStyles } from './index.style';

export function DiffContent() {
  const { styles } = useStyles();

  return (
    <ProCard className={styles.diffCard} headerBordered title="变更文件">
      <ul className={styles.diffList}>
        {DIFF_FILES.map((file) => (
          <li className={styles.diffListItem} key={file.path}>
            <article className={styles.diffFile}>
              <header className={styles.diffFileHeader}>
                <Typography.Text className={styles.codeText} strong>
                  {file.path}
                </Typography.Text>
                <Typography.Text type="secondary">
                  {file.summary}
                </Typography.Text>
              </header>
              <pre className={styles.diffCode}>
                {file.lines.map((line) => (
                  <code
                    className={clsx(styles.diffLine, {
                      [styles.diffAddition]: line.kind === 'addition',
                      [styles.diffContext]: line.kind === 'context',
                      [styles.diffRemoval]: line.kind === 'removal',
                    })}
                    key={line.key}
                  >
                    {line.content}
                  </code>
                ))}
              </pre>
            </article>
          </li>
        ))}
      </ul>
    </ProCard>
  );
}
