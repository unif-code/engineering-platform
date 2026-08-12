import { Button } from 'antd';
import clsx from 'clsx';
import { SemanticTag } from '@/components/SemanticTag';
import { useStyles } from './index.style';
import type { WorkspaceFixture } from './type';

export interface WorkspaceSelectorProps {
  selectedId: string;
  workspaces: readonly WorkspaceFixture[];
  onSelect: (workspaceId: string) => void;
}

export function WorkspaceSelector({
  selectedId,
  workspaces,
  onSelect,
}: WorkspaceSelectorProps) {
  const { styles } = useStyles();

  return (
    <aside aria-label="工作区选择" className={styles.selectorCard}>
      <nav aria-labelledby="workspace-selector-title">
        <header className={styles.selectorHeader}>
          <h2 className={styles.selectorTitle} id="workspace-selector-title">
            我的工作区
          </h2>
          <span className={styles.secondaryText}>按成员关系可见</span>
        </header>
        <ul className={styles.workspaceList}>
          {workspaces.map((workspace) => {
            const selected = workspace.id === selectedId;

            return (
              <li key={workspace.id}>
                <Button
                  aria-pressed={selected}
                  block
                  className={clsx(
                    styles.workspaceButton,
                    selected && styles.workspaceButtonActive,
                  )}
                  onClick={() => onSelect(workspace.id)}
                  type="text"
                >
                  <span className={styles.workspaceTitleRow}>
                    <span className={styles.workspaceName}>
                      {workspace.name}
                    </span>
                    <SemanticTag
                      label={workspace.membership}
                      tone={
                        workspace.membership === 'Owner' ? 'brand' : 'neutral'
                      }
                    />
                  </span>
                  <span className={styles.workspaceMeta}>
                    {workspace.members.length} 成员 ·{' '}
                    {workspace.repositories.length} 仓库
                  </span>
                </Button>
              </li>
            );
          })}
        </ul>
      </nav>
      <p className={styles.selectorNote}>
        超管 / 管理员可见全部工作区；成员只见自己所在的。
      </p>
    </aside>
  );
}
