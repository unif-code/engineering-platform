import { SemanticTag } from '@/components/SemanticTag';
import { useStyles } from './index.style';
import type { WorkspaceFixture } from './type';

export interface RepositoryPanelProps {
  workspace: WorkspaceFixture;
}

export function RepositoryPanel({ workspace }: RepositoryPanelProps) {
  const { styles } = useStyles();

  return (
    <section
      aria-labelledby={`${workspace.id}-repositories-title`}
      className={styles.panel}
    >
      <header className={styles.panelHeader}>
        <div>
          <h3
            className={styles.panelTitle}
            id={`${workspace.id}-repositories-title`}
          >
            仓库
          </h3>
          <span className={styles.secondaryText}>
            只有关联仓库对成员可见并可绑定任务
          </span>
        </div>
      </header>

      <ul
        aria-label={`${workspace.name} 仓库`}
        className={styles.repositoryList}
      >
        {workspace.repositories.map((repository) => (
          <li
            aria-label={`${repository.name} 仓库`}
            className={styles.repositoryItem}
            key={repository.name}
          >
            <span className={styles.repositoryBody}>
              <span className={styles.repositoryName}>{repository.name}</span>
              <span className={styles.branch}>
                默认分支{' '}
                <span className={styles.code}>{repository.defaultBranch}</span>
              </span>
            </span>
            <SemanticTag
              label={repository.status}
              tone={repository.status === '受保护' ? 'success' : 'neutral'}
            />
          </li>
        ))}
      </ul>
    </section>
  );
}
