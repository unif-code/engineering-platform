import { ProCard } from '@ant-design/pro-components';
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
    <ProCard className={clsx(styles.card, styles.selectorCard)}>
      <nav aria-labelledby="workspace-selector-title">
        <header className={styles.selectorHeader}>
          <h2 className={styles.selectorTitle} id="workspace-selector-title">
            我的工作区
          </h2>
          <span className={styles.secondaryText}>按当前成员关系可见</span>
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
                      label={selected ? '当前' : '可用'}
                      tone={selected ? 'brand' : 'neutral'}
                    />
                  </span>
                  <span className={styles.workspaceMeta}>
                    {workspace.members.length} 成员 ·{' '}
                    {workspace.repositories.length} 仓库
                  </span>
                  <span className={styles.workspaceDescription}>
                    {workspace.description}
                  </span>
                </Button>
              </li>
            );
          })}
        </ul>
      </nav>
    </ProCard>
  );
}
